'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import { PortfolioView } from '@/components/portfolio-view';
import { IdentityOptions } from '@/components/identity-options';
import { VideoMusic } from '@/components/video-music';
import { ExportReady, type ReadyExport } from '@/components/export-ready';
import { WorkCaption } from '@/components/work-caption';
import { useProfile } from '@/hooks/use-profile';
import { useVoice } from '@/hooks/use-voice';
import { usePwa } from '@/hooks/use-pwa';
import { InterviewScreen } from '@/components/interview-screen';
import { preparePhoto, prepareLocalPdf } from '@/lib/local-tasks';
import { readDraft, saveDraft } from '@/lib/drafts';
import { RestoreDraft } from '@/components/restore-draft';
import { answerValue, cleanAnswer, questions, type AnswerKey } from '@/lib/interview';
import { createPhotoId, download, downloadLink, draftPresentation, type Work } from '@/lib/portfolio';

type Stage = 'welcome' | 'interview' | 'photos' | 'review' | 'done';
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const phases = ['On fait connaissance', 'Vos réalisations', 'On vérifie ensemble', 'C’est prêt !'];
const recapLabels: Record<AnswerKey, string> = { owner: 'Votre prénom', job: 'Votre métier', name: 'Votre atelier', services: 'Vos prestations', city: 'Votre localisation', phone: 'Votre contact', extra: 'Un peu plus sur vous' };

export default function Home() {
  const { profile: p, update, ready, saveError } = useProfile();
  const [splash, setSplash] = useState(true); const [stage, setStage] = useState<Stage>('welcome');
  const [index, setIndex] = useState(0); const [answer, setAnswer] = useState('');
  const [notice, setNotice] = useState(''); const [uploading, setUploading] = useState(false); const [preparing, setPreparing] = useState(false);
  const [videoMusic, setVideoMusic] = useState(true);
  const [exporting, setExporting] = useState(''); const [aiSource, setAiSource] = useState(''); const [publishConsent, setPublishConsent] = useState(false);
  const [publicPath, setPublicPath] = useState(''); const [showPreview, setShowPreview] = useState(false);
  const [results, setResults] = useState<Partial<Record<'pdf' | 'mp4', ReadyExport>>>({});
  const exportUrls = useRef<Partial<Record<'pdf' | 'mp4', string>>>({});
  const [install, setInstall] = useState<InstallEvent | null>(null); const [online, setOnline] = useState(true);
  const [showPrivacy, setShowPrivacy] = useState(false); const [editing, setEditing] = useState<AnswerKey | 'bio' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null); const cameraRef = useRef<HTMLInputElement>(null);
  const voice = useVoice(text => setAnswer(text));
  const phase = stage === 'welcome' || stage === 'interview' ? 0 : stage === 'photos' ? 1 : stage === 'review' ? 2 : 3;
  const question = questions[index];
  const { offlineReady, offlineError } = usePwa();
  const savedJourney = useRef<{ stage: Stage; index: number; answer: string } | undefined>(undefined);
  useEffect(() => { readDraft<{ stage: Stage; index: number; answer: string }>('journey').then(value => { savedJourney.current = value; }).catch(() => {}); }, []);
  useEffect(() => { if (!ready || stage === 'welcome') return; savedJourney.current = { stage, index, answer }; void saveDraft('journey', { stage, index, answer }).catch(() => {}); }, [ready, stage, index, answer]);
  useEffect(() => { const timer = setTimeout(() => setSplash(false), 850); return () => clearTimeout(timer); }, []);
  useEffect(() => {
    const connection = () => setOnline(navigator.onLine); connection();
    const installHandler = (event: Event) => { event.preventDefault(); setInstall(event as InstallEvent); };
    window.addEventListener('online', connection); window.addEventListener('offline', connection); window.addEventListener('beforeinstallprompt', installHandler);
    fetch('/api/portfolio').then(r => r.json()).then(data => { if (data.id && data.published) setPublicPath(`/p/${data.id}`); }).catch(() => {});
    return () => { window.removeEventListener('online', connection); window.removeEventListener('offline', connection); window.removeEventListener('beforeinstallprompt', installHandler); };
  }, []);
  useEffect(() => {
    setPublishConsent(false); setResults({});
    Object.values(exportUrls.current).forEach(url => URL.revokeObjectURL(url)); exportUrls.current = {};
  }, [p]);
  useEffect(() => () => { Object.values(exportUrls.current).forEach(url => URL.revokeObjectURL(url)); }, []);
  function begin() {
    voice.enable(); setNotice('');
    const saved = savedJourney.current;
    if (saved?.stage === 'interview' && Number.isInteger(saved.index) && saved.index >= 0 && saved.index < questions.length) { setIndex(saved.index); setAnswer(typeof saved.answer === 'string' ? saved.answer : ''); setStage('interview'); voice.speak(questions[saved.index].spoken); return; }
    if (p.name && p.job && p.services && p.city) { if (p.works.length && !p.bio) { update({ bio: draftPresentation(p) }); setAiSource('template'); } setStage(p.works.length ? 'review' : 'photos'); voice.speak(p.works.length ? 'Bon retour ! Vos informations sont toujours là. Vérifions votre présentation ensemble.' : 'Bon retour ! Ajoutons maintenant quelques photos de vos réalisations.'); return; }
    const first = questions.findIndex(q => !q.optional && !answerValue(p, q.key)); const nextIndex = p.owner ? Math.max(0, first) : 0;
    setIndex(nextIndex); setAnswer(answerValue(p, questions[nextIndex].key)); setStage('interview'); voice.speak(questions[nextIndex].spoken);
  }
  function goQuestion(nextIndex: number) {
    voice.cancel(); setIndex(nextIndex); setAnswer(answerValue(p, questions[nextIndex].key)); setStage('interview'); voice.speak(questions[nextIndex].spoken);
  }
  function next(skip = false) {
    const text = skip ? '' : cleanAnswer(question.key, answer); if (!text && !question.optional) return;
    voice.cancel(); update({ [question.key]: text, bio: '' }); setAnswer('');
    if (index < questions.length - 1) { const nextIndex = index + 1; setIndex(nextIndex); setAnswer(answerValue(p, questions[nextIndex].key)); voice.speak(questions[nextIndex].spoken); }
    else { setStage('photos'); voice.speak('Merci ! Maintenant, montrez-moi votre travail. Choisissez quelques photos de vos réalisations sur votre téléphone.'); }
  }
  async function addPhotos(files: FileList | null) {
    if (!files?.length || uploading) return;
    if (p.works.length + files.length > 6) { setNotice('Choisissez jusqu’à 6 photos au total.'); return; }
    setUploading(true); setNotice('');
    try {
      const works: Work[] = [];
      for (const file of Array.from(files)) works.push({ id: createPhotoId(), title: `Réalisation ${p.works.length + works.length + 1}`, image: await preparePhoto(file) });
      update({ works: [...p.works, ...works] });
    }
    catch (e) { setNotice((e as Error).message); } finally { setUploading(false); }
  }
  async function prepare() {
    if (!p.works.length) return; voice.cancel(); setNotice('');
    if (!p.name || !p.job || !p.services || !p.city) { setNotice('Il manque quelques informations. Reprenons les questions ensemble.'); goQuestion(Math.max(0, questions.findIndex(q => !q.optional && !answerValue(p, q.key)))); return; }
    if (p.bio) { setStage('review'); voice.speak('Voici votre présentation. Prenez le temps de vérifier les informations et de corriger si besoin.'); return; }
    if (!navigator.onLine) { update({ bio: draftPresentation(p) }); setAiSource('template'); setStage('review'); return; }
    setPreparing(true);
    try { const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, works: [] }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); update({ bio: data.bio }); setAiSource(data.source); }
    catch { update({ bio: draftPresentation(p) }); setAiSource('template'); }
    finally { setPreparing(false); setStage('review'); voice.speak('Voici votre présentation. Je vous laisse vérifier. Vous pouvez modifier chaque information avant de valider.'); }
  }
  function validate() { voice.cancel(); update({ validated: true }); setStage('done'); voice.speak('Votre présentation est prête ! Vous pouvez maintenant récupérer votre document PDF, votre vidéo ou créer votre page à partager.'); }
  function correctField(key: AnswerKey, value: string) {
    const corrected = { ...p, [key]: value };
    const affectsPresentation = ['job', 'name', 'services', 'city', 'extra'].includes(key);
    update({ [key]: value, ...(affectsPresentation ? { bio: draftPresentation(corrected) } : {}) });
    if (affectsPresentation) setAiSource('template');
  }
  async function exportFile(format: 'pdf' | 'mp4') {
    if (exporting || !p.validated) return; setExporting(format); setNotice('');
    try {
      let blob: Blob;
      if (format === 'pdf') {
        try { blob = await prepareLocalPdf(p); }
        catch (error) { if (!navigator.onLine) throw error; const response = await fetch('/api/export/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }); if (!response.ok) throw new Error('Le PDF ne peut pas être préparé. Réessayez.'); blob = await response.blob(); }
      } else {
        if (!navigator.onLine) throw new Error('La vidéo nécessite une connexion au serveur. Votre brouillon est conservé.');
        const response = await fetch('/api/export/mp4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, videoMusic }) });
        if (!response.ok) { const error = await response.json().catch(() => null); throw new Error(error?.error || 'La vidéo ne peut pas être préparée. Réessayez.'); }
        blob = await response.blob();
      }
      const file = new File([blob], `talentproof-${p.name.replace(/[^a-zA-Z0-9À-ÿ-]/g, '-').slice(0, 50)}.${format}`, { type: format === 'pdf' ? 'application/pdf' : 'video/mp4' });
      if (exportUrls.current[format]) URL.revokeObjectURL(exportUrls.current[format]);
      const url = URL.createObjectURL(file); exportUrls.current[format] = url;
      setResults(current => ({ ...current, [format]: { url, filename: file.name, file } })); downloadLink(url, file.name);
      setNotice(format === 'pdf' ? 'Votre PDF est prêt. Si le téléchargement ne démarre pas, appuyez sur « Enregistrer mon PDF ».' : 'Votre vidéo est prête. Utilisez « Enregistrer ma vidéo » pour la garder sur votre téléphone.');
    }
    catch (e) { setNotice((e as Error).message || 'Le téléchargement a échoué. Réessayez.'); } finally { setExporting(''); }
  }
  async function publish() {
    if (!navigator.onLine) { setNotice('La publication nécessite une connexion au serveur. Vos informations restent sur cet appareil.'); return; }
    if (!publishConsent || exporting) return; setExporting('page'); setNotice('');
    try { const response = await fetch('/api/portfolio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: p, consent: true }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setPublicPath(data.path); setNotice('Votre page est créée. Toute personne avec son lien peut la consulter.'); }
    catch (e) { setNotice((e as Error).message); } finally { setExporting(''); }
  }
  async function shareLink() {
    if (!publicPath) return; const url = new URL(publicPath, window.location.origin).href;
    try { if (navigator.share) await navigator.share({ title: p.name, text: 'Découvrez mon travail et mes prestations.', url }); else if (navigator.clipboard) { await navigator.clipboard.writeText(url); setNotice('Lien copié. Collez-le dans votre message.'); } else setNotice(`Votre lien : ${url}`); }
    catch (e) { if ((e as Error).name !== 'AbortError') setNotice('Le partage n’a pas abouti. Vous pouvez ouvrir votre page et copier son adresse.'); }
  }
  function back() {
    voice.cancel(); setNotice('');
    if (stage === 'interview') { if (index > 0) goQuestion(index - 1); else setStage('welcome'); }
    else if (stage === 'photos') goQuestion(questions.length - 1); else if (stage === 'review') setStage('photos'); else if (stage === 'done') setStage('review');
  }
  if (splash || !ready) return <div className="splash"><div className="splash-mark"><BrandMark/></div><div className="splash-name">talentproof<span>®</span></div><p>Votre talent a une voix.</p><div className="splash-line"/></div>;
  return <div className="voice-app">
    <header className="app-header"><a className="brand" href="/" aria-label="Accueil TalentProof"><BrandMark/><span>talentproof<span className="brand-dot">.</span></span></a><div className="header-actions">{!online && <span className="offline-tag">Hors connexion</span>}<button className="sound-toggle" onClick={() => { voice.hush(); voice.setMuted(!voice.muted); }} aria-label={voice.muted ? 'Activer la voix' : 'Couper la voix'} aria-pressed={!voice.muted}><Icon name={voice.muted ? 'muted' : 'sound'} size={19}/><span>{voice.muted ? 'Voix coupée' : 'Avec la voix'}</span></button><span className="made-for">LE TALENT, AU FÉMININ</span></div></header>
    {stage !== 'welcome' && stage !== 'interview' && <nav className="journey" aria-label="Les étapes de création">{phases.map((label, i) => <div key={label} className={`journey-step ${i === phase ? 'current' : i < phase ? 'complete' : ''}`} aria-current={i === phase ? 'step' : undefined}><span>{i < phase ? <Icon name="check" size={13}/> : `0${i + 1}`}</span><small>{label}</small>{i < 3 && <i/>}</div>)}</nav>}
    <main className={`flow-main stage-${stage}`}>
      {(notice || saveError) && <div className="notice" role="status"><span>{saveError || notice}</span><button aria-label="Fermer le message" onClick={() => setNotice('')}><Icon name="close" size={18}/></button></div>}
      {stage !== 'welcome' && <button className="back-button" onClick={back} disabled={preparing || !!exporting}><Icon name="back" size={17}/>Retour</button>}
      {stage === 'welcome' && <div className="welcome-layout"><section className="welcome-copy"><div className="eyebrow"><span/>UNE VOIX POUR VOTRE SAVOIR-FAIRE</div><h1>Vous avez le talent.<br/>Donnons-lui<br/><em>une vitrine.</em><span className="title-star">✳</span></h1><p>Parlez de ce que vous faites.<br/>Je vous aide à créer votre portfolio,<br/>une question à la fois.</p><button className="button primary welcome-cta" onClick={begin}><Icon name="mic" size={21}/>{p.name ? 'Reprendre ma présentation' : 'On commence ensemble'}<Icon name="arrow" size={21}/></button><span className="welcome-reassurance">Pas de compte à créer. Prenez votre temps.</span><div className="welcome-formats"><div><Icon name="download"/><span>Un beau PDF</span></div><div><Icon name="link"/><span>Votre page web</span></div><div><Icon name="play"/><span>Une vidéo</span></div></div></section><section className="welcome-visual" aria-label="Votre assistante vocale"><div className="visual-caption"><span className="live-dot"/>VOTRE NOUVELLE ALLIÉE</div><div className="assistant-orbit"><div className="orbit-ring outer"/><div className="orbit-ring inner"/><div className="assistant-orb"><Waveform active={false}/></div><span className="orbit-spark top">✦</span><span className="orbit-spark bottom">✧</span></div><div className="welcome-bubble"><span>VOTRE ASSISTANTE TALENTPROOF</span><p>« Bonjour ! Et si on faisait<br/>connaissance ? »</p><div className="bubble-sound">{Array.from({ length: 7 }, (_, i) => <span key={i}/>)}</div></div><div className="visual-footer"><span>01</span> ON PARLE. ON CRÉE. VOUS RAYONNEZ.</div></section></div>}
      {stage === 'interview' && <InterviewScreen question={question} index={index} count={questions.length} answer={answer} onAnswer={setAnswer} voice={voice} onNext={next}/>}
      {stage === 'photos' && <section className="photos-screen"><div className="section-intro"><span className="eyebrow">ÉTAPE 02 · LE TALENT EN IMAGES</span><h1>Maintenant, <em>montrez-moi.</em></h1><p>Quelques photos suffisent pour raconter ce que vous savez faire.</p><button className="listen-again" onClick={() => voice.speak('Choisissez jusqu’à six photos de votre travail. Vous pouvez les prendre maintenant ou les choisir dans votre téléphone.', true)}><Icon name="sound" size={17}/>Écouter les instructions</button></div><div className="photo-workspace"><div className="photo-picker"><div className="photo-stack" aria-hidden="true"><span/><span/><Icon name="image" size={48}/></div><h2>Vos créations ont leur place ici.</h2><p>Une tenue, une coiffure, un maquillage…<br/>Choisissez les réalisations dont vous êtes fière.</p><button className="button primary" disabled={uploading || p.works.length >= 6} onClick={() => fileRef.current?.click()}><Icon name="image" size={20}/>{uploading ? 'Ajout de vos photos…' : 'Choisir mes photos'}</button><button className="camera-button" disabled={uploading || p.works.length >= 6} onClick={() => cameraRef.current?.click()}><Icon name="camera" size={19}/>Prendre une photo</button><small>{p.works.length} photo{p.works.length > 1 ? 's' : ''} sur 6 · JPG, PNG ou WebP</small><input className="visually-hidden" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="Choisir des réalisations" onChange={e => { void addPhotos(e.target.files); e.target.value = ''; }}/><input className="visually-hidden" ref={cameraRef} type="file" accept="image/*" capture="environment" aria-label="Prendre une photo" onChange={e => { void addPhotos(e.target.files); e.target.value = ''; }}/></div><div className={`photo-gallery ${!p.works.length ? 'gallery-empty' : ''}`}>{!p.works.length ? <><div className="empty-photo"><Icon name="spark" size={40}/></div><p>La prochaine belle création<br/>ici, c’est la vôtre.</p></> : p.works.map(w => <article className="photo-tile" key={w.id}><div><img src={w.image} alt={w.title}/><button aria-label={`Retirer ${w.title}`} onClick={() => update({ works: p.works.filter(item => item.id !== w.id) })}><Icon name="close" size={17}/></button></div><label className="visually-hidden" htmlFor={`caption-${w.id}`}>Légende de la photo</label><WorkCaption work={w} onChange={patch => update({ works: p.works.map(item => item.id === w.id ? { ...item, ...patch } : item) })}/></article>)}</div></div><div className="photo-bottom"><p><Icon name="shield" size={17}/>Utilisez vos propres photos, avec l’accord des personnes visibles.</p><button className="button primary" disabled={!p.works.length || uploading || preparing} onClick={() => void prepare()}>{preparing ? 'Je prépare votre présentation…' : 'Voir mon récapitulatif'}<Icon name="arrow" size={20}/></button></div></section>}
      {stage === 'review' && <section className="review-screen"><div className="section-intro"><span className="eyebrow">ÉTAPE 03 · TOUT SIMPLEMENT VOUS</span><h1>On vérifie <em>ensemble ?</em></h1><p>Tout est là. Corrigez ce que vous voulez, puis je m’occupe du reste.</p><button className="listen-again" onClick={() => { voice.enable(); voice.speak(`Voici votre présentation. ${p.bio || draftPresentation(p)}. Votre téléphone ${p.showContact ? 'sera affiché' : 'ne sera pas affiché'}. Vous pouvez modifier chaque information avant de valider.`, true); }}><Icon name="sound" size={17}/>Me lire ma présentation</button></div><div className="review-layout"><div className="review-sheet"><div className="sheet-heading"><span>MON IDENTITÉ PROFESSIONNELLE</span><Icon name="spark" size={24}/></div><h2>{p.name}</h2><p className="sheet-subtitle">{p.job} <span>·</span> {p.city}</p><div className="recap-fields">{questions.filter(q => answerValue(p, q.key) || !q.optional).map(q => <div className="recap-field" key={q.key}><label htmlFor={`review-${q.key}`}>{recapLabels[q.key]}</label>{editing === q.key ? <textarea autoFocus id={`review-${q.key}`} rows={q.multiline ? 3 : 2} maxLength={q.multiline ? 1200 : 120} value={answerValue(p, q.key)} onChange={e => correctField(q.key, e.target.value)} onBlur={() => setEditing(null)}/> : <><p>{answerValue(p, q.key)}</p><button aria-label={`Modifier : ${recapLabels[q.key]}`} onClick={() => setEditing(q.key)}><Icon name="edit" size={17}/><span>Modifier</span></button></>}</div>)}</div><div className="bio-review"><div><h3>Votre présentation</h3><button onClick={() => setEditing(editing === 'bio' ? null : 'bio')}><Icon name="edit" size={17}/>Modifier</button></div>{editing === 'bio' ? <textarea autoFocus rows={6} maxLength={2000} value={p.bio} onChange={e => update({ bio: e.target.value })} aria-label="Corriger ma présentation"/> : <p>{p.bio || draftPresentation(p)}</p>}{aiSource === 'template' && <small>Présentation préparée à partir de vos réponses, sans reformulation IA.</small>}</div><label className="contact-choice"><input type="checkbox" checked={p.showContact} disabled={!p.phone} onChange={e => update({ showContact: e.target.checked })}/><span>Afficher mon téléphone sur mes supports<small>{p.phone ? p.phone : 'Aucun numéro renseigné.'}</small></span></label></div><aside className="review-photos"><div><h3>Vos réalisations</h3><button onClick={() => setStage('photos')}>Modifier<Icon name="edit" size={16}/></button></div><div className="recap-photo-grid">{p.works.map(w => <figure key={w.id}><img src={w.image} alt={w.title}/><figcaption>{w.title}</figcaption></figure>)}</div><div className="review-promise"><Icon name="shield" size={24}/><h3>Votre histoire vous appartient.</h3><p>Votre présentation utilise vos informations. Elle ne certifie pas vos compétences et vous gardez la main sur ce qui est partagé.</p></div></aside></div><IdentityOptions profile={p} onChange={update}/><div className="review-preview-action"><button className="button secondary" onClick={() => setShowPreview(!showPreview)}>{showPreview ? "Fermer l’aperçu" : "Voir ma vitrine avant de valider"}<Icon name="arrow" size={18}/></button></div>{showPreview && <PortfolioView profile={p}/>}<div className="validate-bar"><label className="consent"><input type="checkbox" checked={p.validated} onChange={e => update({ validated: e.target.checked })}/><span>Ces informations sont correctes et j’ai le droit d’utiliser ces photos.</span></label><button className="button primary" disabled={!p.validated || !p.name.trim() || !p.job.trim() || !p.city.trim() || !p.services.trim() || !p.bio.trim() || !p.works.length} onClick={validate}>Oui, créer mon portfolio<Icon name="spark" size={20}/></button></div></section>}
      {stage === 'done' && <section className="done-screen"><div className="success-seal"><Icon name="check" size={30}/><span>✦</span></div><div className="section-intro"><span className="eyebrow">ÉTAPE 04 · À VOUS DE RAYONNER</span><h1>Votre talent, <em>prêt à voyager.</em></h1><p>{p.owner ? `${p.owner}, votre` : 'Votre'} présentation est prête. Choisissez comment la partager.</p></div><div className="finished-identity"><span>{p.name.charAt(0)}</span><div><h2>{p.name}</h2><p>{p.job} · {p.city}</p></div><button onClick={() => setShowPreview(!showPreview)}>{showPreview ? 'Fermer l’aperçu' : 'Voir mon portfolio'}<Icon name="arrow" size={17}/></button></div>{showPreview && <PortfolioView profile={p}/>}
        <div className="export-grid"><article className="format-card"><span className="format-number">01 / LE DOCUMENT</span><div className="format-illustration pdf-illustration"><div><span>PORTFOLIO</span><i/><b>{p.name}</b><i/><i/><div>PDF</div></div></div><h2>Un portfolio à envoyer.</h2><p>Une présentation soignée à garder, imprimer ou envoyer à vos clientes.</p><button className="button secondary" disabled={!!exporting} onClick={() => void exportFile('pdf')}><Icon name="download" size={19}/>{exporting === 'pdf' ? 'Création du PDF…' : 'Télécharger mon PDF'}</button><ExportReady result={results.pdf} onError={setNotice}/></article><article className="format-card featured"><span className="format-number">02 / VOTRE PAGE</span><div className="format-illustration web-illustration"><div><span>● ● ●</span><strong>{p.name}</strong><div>{p.works.slice(0, 2).map(w => <img src={w.image} alt="" key={w.id}/>)}</div></div></div><h2>Un lien vers votre talent.</h2><p>Une page que vos clientes peuvent découvrir depuis leur téléphone.</p>{!publicPath ? <><label className="consent publish-consent"><input type="checkbox" checked={publishConsent} onChange={e => setPublishConsent(e.target.checked)}/><span>J’accepte de rendre cette page visible à toute personne ayant le lien.</span></label><button className="button primary" disabled={!publishConsent || !!exporting} onClick={() => void publish()}><Icon name="link" size={19}/>{exporting === 'page' ? 'Création de votre page…' : 'Créer ma page à partager'}</button></> : <><div className="published-link"><label htmlFor="portfolio-url">Votre lien portfolio</label><input id="portfolio-url" readOnly value={typeof window !== 'undefined' ? new URL(publicPath, window.location.origin).href : publicPath} onFocus={e => e.target.select()}/></div><a className="public-page-link" href={publicPath} target="_blank" rel="noreferrer">Ouvrir ma page <Icon name="arrow" size={16}/></a><button className="button primary" onClick={() => void shareLink()}><Icon name="link" size={19}/>Partager mon lien</button></>}</article><article className="format-card"><span className="format-number">03 / LA VIDÉO</span><div className="format-illustration video-illustration"><div>{p.works[0] && <img src={p.works[0].image} alt=""/>}<span><Icon name="play" size={23}/></span><b>VOTRE SAVOIR-FAIRE EN MOUVEMENT</b></div></div><h2>Une vidéo qui vous ressemble.</h2><p>Vos réalisations en mouvement, prêtes pour WhatsApp et vos statuts.</p><VideoMusic enabled={videoMusic} disabled={!!exporting} onChange={enabled => { setVideoMusic(enabled); if (exportUrls.current.mp4) URL.revokeObjectURL(exportUrls.current.mp4); delete exportUrls.current.mp4; setResults(previous => ({ ...previous, mp4: undefined })); setNotice(''); }}/><button className="button secondary" disabled={!!exporting} onClick={() => void exportFile('mp4')}><Icon name="download" size={19}/>{exporting === 'mp4' ? 'Création de la vidéo…' : 'Télécharger ma vidéo'}</button><ExportReady result={results.mp4} onError={setNotice}/></article></div>
        {exporting === 'mp4' && <p className="export-progress" role="status">La vidéo prend quelques instants. Vous pouvez rester sur cette page.</p>}
        <div className="done-bottom"><button className="text-button" onClick={() => setStage('review')}><Icon name="edit" size={17}/>Corriger ma présentation</button>{publicPath && <><label className="consent"><input type="checkbox" checked={publishConsent} onChange={e => setPublishConsent(e.target.checked)}/><span>Valider la mise à jour publique</span></label><button className="text-button" disabled={!publishConsent || !!exporting} onClick={() => void publish()}>Mettre à jour ma page</button><button className="text-button" onClick={async () => { try { const response = await fetch('/api/portfolio', { method: 'DELETE' }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setPublicPath(''); setNotice('Votre page a été retirée du partage.'); } catch (e) { setNotice((e as Error).message); } }}>Retirer ma page du partage</button></>}</div>
      </section>}
    </main>
    <footer className="app-footer">{offlineReady ? <small className="offline-status"><i/>Disponible hors connexion</small> : <small className="offline-status pending">{offlineError || "Préparation du mode hors connexion…"}</small>}<span><Icon name="shield" size={16}/>{stage === 'welcome' ? 'Votre savoir-faire. Vos mots. Votre identité.' : 'Votre progression est enregistrée sur cet appareil.'}</span><div><button onClick={() => setShowPrivacy(!showPrivacy)}>Mes informations</button><button onClick={async () => { if (install) { await install.prompt(); await install.userChoice; setInstall(null); } else setNotice('Pour garder TalentProof sur votre téléphone : ouvrez le menu du navigateur et choisissez « Installer » ou « Sur l’écran d’accueil ».'); }}>Installer TalentProof<Icon name="download" size={14}/></button></div></footer>
    {showPrivacy && <section className="privacy-panel"><h2>Vous gardez la main.</h2><p>Vos réponses et photos restent sur cet appareil. Avec Whisper, votre enregistrement est envoyé à notre service vocal puis traité en mémoire, sans conservation audio. La dictée du navigateur peut utiliser son propre service distant. Votre page devient accessible par lien uniquement après votre accord.</p><p>Le lien de votre page ne donne aucun accès à sa modification. Cet appareil conserve l’accès de gestion : gardez-le pour mettre à jour ou retirer la page.</p><button className="button secondary" onClick={() => download(new Blob([JSON.stringify(p)], { type: 'application/json' }), 'talentproof-sauvegarde.json')}>Sauvegarder mes informations</button><RestoreDraft onRestore={profile => { update(profile); savedJourney.current = undefined; void saveDraft("journey", { stage: "welcome", index: 0, answer: "" }); setStage("welcome"); setNotice("Sauvegarde importée. Vous pouvez reprendre votre présentation."); }} onError={setNotice}/><button className="text-button" onClick={() => setShowPrivacy(false)}>Fermer</button></section>}
  </div>;
}
function BrandMark() { return <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect width="40" height="40" rx="12" fill="currentColor"/><path d="M10 12h20v5h-7v13h-6V17h-7v-5Z" fill="white"/><circle cx="29" cy="28" r="3" fill="#B8CCFF"/></svg>; }
function Waveform({ active }: { active: boolean }) { return <div className={`waveform ${active ? 'active' : ''}`} aria-hidden="true">{[16, 29, 42, 25, 52, 34, 43, 22, 13].map((height, i) => <span key={i} style={{ height, animationDelay: `${i * 0.09}s` }}/>)}</div>; }
