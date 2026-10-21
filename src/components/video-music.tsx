'use client';

type Props = { enabled: boolean; disabled: boolean; onChange: (enabled: boolean) => void };

export function VideoMusic({ enabled, disabled, onChange }: Props) {
  return <div className="video-music">
    <label className="consent">
      <input type="checkbox" checked={enabled} disabled={disabled} onChange={event => onChange(event.target.checked)}/>
      <span>Avec une musique douce</span>
    </label>
    <details>
      <summary>Écouter la musique</summary>
      <audio controls preload="none" src="/audio/carefree.mp3" aria-label="Écouter Carefree de Kevin MacLeod"/>
      <small>« Carefree » — Kevin MacLeod, <a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400037" target="_blank" rel="noreferrer">incompetech.com</a>. Licence <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Les crédits sont inclus dans la vidéo musicale.</small>
    </details>
  </div>;
}
