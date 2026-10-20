type Name = 'mic' | 'arrow' | 'back' | 'sound' | 'muted' | 'check' | 'camera' | 'image' | 'edit' | 'download' | 'play' | 'link' | 'close' | 'keyboard' | 'shield' | 'spark' | 'stop' | 'refresh' | 'phone' | 'location' | 'clock' | 'message' | 'expand';
const paths: Record<Name, React.ReactNode> = {
  location: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  message: <path d="M21 11.5a9 9 0 0 1-13 8L3 21l1.5-5A9 9 0 1 1 21 11.5Z"/>,
  expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>,
  mic: <><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>, back: <path d="M20 12H4m6-6-6 6 6 6"/>,
  sound: <><path d="m11 4-6 5H2v6h3l6 5V4Z"/><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>,
  muted: <><path d="m11 4-6 5H2v6h3l6 5V4Z"/><path d="m17 9 5 6m0-6-5 6"/></>,
  check: <path d="m5 12 4 4L19 6"/>, camera: <><path d="m8 5 2-3h4l2 3h4a2 2 0 0 1 2 2v13H2V7a2 2 0 0 1 2-2h4Z"/><circle cx="12" cy="12" r="4"/></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/></>,
  edit: <><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14v6ZM3 22h18"/></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>, play: <path d="m8 4 13 8-13 8V4Z"/>,
  link: <><path d="m10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 4 1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"/></>,
  close: <path d="m6 6 12 12M6 18 18 6"/>, keyboard: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M5 9h1m3 0h1m3 0h1m3 0h1M5 12h1m3 0h1m3 0h1m3 0h1M7 16h10"/></>,
  shield: <><path d="M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6l-9-4Z"/><path d="m8 12 3 3 5-6"/></>,
  spark: <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>, stop: <rect x="6" y="6" width="12" height="12" rx="2"/>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2"/></>,
  phone: <path d="M4 3h4l2 5-3 2a15 15 0 0 0 7 7l2-3 5 2v4a2 2 0 0 1-2 2C10 22 2 14 2 5a2 2 0 0 1 2-2Z"/>,
};
export function Icon({ name, size = 22, className = '' }: { name: Name; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
