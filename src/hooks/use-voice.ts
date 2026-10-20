'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

type Recognition = { lang: string; interimResults: boolean; continuous: boolean; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void; abort: () => void };
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
type State = 'idle' | 'listening' | 'transcribing';

export function useVoice(onTranscript: (text: string) => void) {
  const [state, setState] = useState<State>('idle');
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'whisper' | 'browser' | 'unavailable'>('unavailable');
  const recorder = useRef<MediaRecorder | null>(null); const recognition = useRef<Recognition | null>(null);
  const stream = useRef<MediaStream | null>(null); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callback = useRef(onTranscript); callback.current = onTranscript;
  const enabled = useRef(false); const mutedRef = useRef(false); mutedRef.current = muted;
  const request = useRef<AbortController | null>(null);
  const session = useRef(0); const starting = useRef(false);
  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(data => {
      if (data.voice === 'ready' && typeof navigator.mediaDevices?.getUserMedia === 'function' && 'MediaRecorder' in window) setMode('whisper');
      else { const w = window as SpeechWindow; setMode(w.SpeechRecognition || w.webkitSpeechRecognition ? 'browser' : 'unavailable'); }
    }).catch(() => { const w = window as SpeechWindow; setMode(w.SpeechRecognition || w.webkitSpeechRecognition ? 'browser' : 'unavailable'); });
    return () => {
      request.current?.abort(); recognition.current?.abort();
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === 'recording') { recorder.current.onstop = null; recorder.current.stop(); }
      stream.current?.getTracks().forEach(track => track.stop()); window.speechSynthesis?.cancel();
    };
  }, []);
  const hush = useCallback(() => { window.speechSynthesis?.cancel(); setSpeaking(false); }, []);
  const speak = useCallback((text: string, force = false) => {
    if (!enabled.current || (mutedRef.current && !force) || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text); speech.lang = 'fr-FR'; speech.rate = 0.91; speech.pitch = 1.04;
    const voices = window.speechSynthesis.getVoices(); speech.voice = voices.find(v => v.lang.startsWith('fr') && v.localService) || voices.find(v => v.lang.startsWith('fr')) || null;
    speech.onstart = () => setSpeaking(true); speech.onend = () => setSpeaking(false); speech.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(speech);
  }, []);
  const enable = useCallback(() => { enabled.current = true; }, []);
  const cancel = useCallback(() => {
    session.current++;
    request.current?.abort();
    if (recognition.current) { recognition.current.onresult = null; recognition.current.onend = null; recognition.current.onerror = null; recognition.current.abort(); recognition.current = null; }
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current?.state === 'recording') { recorder.current.onstop = null; recorder.current.stop(); }
    stream.current?.getTracks().forEach(t => t.stop()); setState('idle'); hush();
  }, [hush]);
  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    recognition.current?.stop();
    if (recorder.current?.state === 'recording') recorder.current.stop();
    stream.current?.getTracks().forEach(t => t.stop());
  }, []);
  const start = useCallback(async () => {
    if (state !== 'idle' || starting.current) return;
    starting.current = true; const currentSession = ++session.current;
    hush(); setError('');
    try {
      if (mode === 'browser') {
        const w = window as SpeechWindow; const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
        if (!Constructor) throw new Error('Le micro n’est pas disponible. Vous pouvez écrire votre réponse.');
        const r = new Constructor(); recognition.current = r; r.lang = 'fr-FR'; r.interimResults = true; r.continuous = false;
        r.onresult = event => callback.current(Array.from(event.results).map(result => result[0].transcript).join(' '));
        r.onerror = event => { setError(event.error === 'not-allowed' ? 'Autorisez le micro dans votre navigateur, ou écrivez votre réponse.' : 'Je n’ai pas bien entendu. Réessayez ou écrivez votre réponse.'); setState('idle'); };
        r.onend = () => { setState('idle'); if (timer.current) clearTimeout(timer.current); };
        r.start(); setState('listening'); timer.current = setTimeout(() => r.stop(), 45000); return;
      }
      if (mode !== 'whisper') throw new Error('Le micro n’est pas disponible ici. Vous pouvez écrire votre réponse.');
      if (!window.isSecureContext) throw new Error('Ouvrez TalentProof avec une adresse HTTPS pour utiliser le micro sur votre téléphone.');
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false }); stream.current = media;
      if (currentSession !== session.current) { media.getTracks().forEach(track => track.stop()); return; }
      const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(t => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(media, type ? { mimeType: type } : undefined); recorder.current = r;
      const chunks: BlobPart[] = []; r.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      r.onstop = async () => {
        media.getTracks().forEach(t => t.stop()); setState('transcribing');
        const controller = new AbortController(); request.current = controller;
        try {
          const blob = new Blob(chunks, { type: r.mimeType });
          if (!blob.size) throw new Error('Aucun son enregistré. Réessayez.');
          const form = new FormData(); form.append('audio', blob, r.mimeType.includes('mp4') ? 'reponse.m4a' : 'reponse.webm');
          const response = await fetch('/api/transcribe', { method: 'POST', body: form, signal: controller.signal }); const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Je n’ai pas pu comprendre cet enregistrement.');
          if (!data.text?.trim()) throw new Error('Je n’ai pas entendu de réponse. Rapprochez-vous du micro et réessayez.');
          callback.current(data.text);
        } catch (e) { if ((e as Error).name !== 'AbortError') setError((e as Error).message); }
        finally { setState('idle'); }
      };
      r.onerror = () => { setError('Le micro a été interrompu. Réessayez.'); media.getTracks().forEach(t => t.stop()); setState('idle'); };
      r.start(); setState('listening'); timer.current = setTimeout(() => { if (r.state === 'recording') r.stop(); }, 45000);
    } catch (e) { stream.current?.getTracks().forEach(t => t.stop()); setState('idle'); setError((e as Error).name === 'NotAllowedError' ? 'Autorisez le micro pour parler, ou écrivez votre réponse.' : (e as Error).message); }
    finally { starting.current = false; }
  }, [state, mode, hush]);
  return { state, speaking, muted, setMuted, error, mode, start, stop, cancel, speak, hush, enable };
}
