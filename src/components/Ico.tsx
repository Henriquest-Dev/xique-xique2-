// Conjunto de ícones próprios do Xique-Xique 2: formas cheias, cantos redondos,
// duas tonalidades (currentColor + variante clara). Sem emojis em lado nenhum.
import type { CSSProperties, ReactNode } from 'react';

const P: Record<string, ReactNode> = {
  coin: (<><circle cx="12" cy="12" r="9.5" fill="currentColor" /><circle cx="12" cy="12" r="6.6" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" /><path d="M12 7.6v8.8M9.6 10c0-1 1.1-1.6 2.4-1.6s2.4.6 2.4 1.6-1.1 1.4-2.4 1.8c-1.3.4-2.4.8-2.4 1.8s1.1 1.6 2.4 1.6 2.4-.6 2.4-1.6" stroke="#fff" strokeOpacity=".9" strokeWidth="1.5" fill="none" strokeLinecap="round" /></>),
  bag: (<><path d="M7 8.5V7a5 5 0 0 1 10 0v1.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><rect x="3.5" y="8" width="17" height="13" rx="3.5" fill="currentColor" /><rect x="8" y="12.5" width="8" height="2.6" rx="1.3" fill="#fff" fillOpacity=".55" /></>),
  backpack: (<><path d="M9.5 5V4a2.5 2.5 0 0 1 5 0v1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M5 11a7 7 0 0 1 14 0v8.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 19.5z" fill="currentColor" /><rect x="7.6" y="14.2" width="8.8" height="5.6" rx="2" fill="#fff" fillOpacity=".5" /><path d="M7.6 11.2h8.8" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" /><path d="M12 14.2v2.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>),
  bank: (<><path d="M12 2.5 2.8 8v2h18.4V8z" fill="currentColor" /><rect x="5" y="11.5" width="3" height="7" rx="1" fill="currentColor" /><rect x="10.5" y="11.5" width="3" height="7" rx="1" fill="currentColor" /><rect x="16" y="11.5" width="3" height="7" rx="1" fill="currentColor" /><rect x="2.5" y="19.5" width="19" height="2.5" rx="1.2" fill="currentColor" /></>),
  hall: (<><path d="M12 1.8 3 6.8V8h18V6.8z" fill="currentColor" /><rect x="4.5" y="9.5" width="3" height="8" rx="1" fill="currentColor" /><rect x="10.5" y="9.5" width="3" height="8" rx="1" fill="currentColor" /><rect x="16.5" y="9.5" width="3" height="8" rx="1" fill="currentColor" /><rect x="2.5" y="18.5" width="19" height="3" rx="1.4" fill="currentColor" /><circle cx="12" cy="5.4" r="1" fill="#fff" fillOpacity=".8" /></>),
  home: (<><path d="M12 2.8 2.5 11h2.7v9a1.5 1.5 0 0 0 1.5 1.5h10.6a1.5 1.5 0 0 0 1.5-1.5v-9h2.7z" fill="currentColor" /><rect x="10" y="14" width="4.2" height="7.5" rx="1.4" fill="#fff" fillOpacity=".6" /></>),
  store: (<><path d="M3 9.5 4.7 4h14.6L21 9.5z" fill="currentColor" /><path d="M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" fill="currentColor" fillOpacity=".72" /><rect x="4.5" y="12" width="15" height="9" rx="2" fill="currentColor" /><rect x="9.5" y="14.5" width="5" height="6.5" rx="1.2" fill="#fff" fillOpacity=".6" /></>),
  paw: (<><ellipse cx="12" cy="16" rx="5.2" ry="4.4" fill="currentColor" /><ellipse cx="5.6" cy="11" rx="2.1" ry="2.8" fill="currentColor" /><ellipse cx="18.4" cy="11" rx="2.1" ry="2.8" fill="currentColor" /><ellipse cx="9.2" cy="6.4" rx="2.1" ry="2.8" fill="currentColor" /><ellipse cx="14.8" cy="6.4" rx="2.1" ry="2.8" fill="currentColor" /></>),
  gift: (<><rect x="3" y="9" width="18" height="12" rx="3" fill="currentColor" /><rect x="2.5" y="6.5" width="19" height="4.5" rx="2" fill="currentColor" fillOpacity=".8" /><rect x="10.5" y="6.5" width="3" height="14.5" fill="#fff" fillOpacity=".65" /><path d="M12 6.5C10 2.5 6.5 3 7 5.3c.4 1.4 3 1.2 5 1.2zm0 0c2-4 5.5-3.5 5-1.2-.4 1.4-3 1.2-5 1.2z" fill="currentColor" /></>),
  map: (<><path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z" fill="currentColor" /><path d="M9 4v13.5M15 6.5V20" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" /></>),
  phone: (<><rect x="6" y="2" width="12" height="20" rx="3.4" fill="currentColor" /><rect x="8" y="5" width="8" height="11" rx="1.6" fill="#fff" fillOpacity=".55" /><circle cx="12" cy="19" r="1.1" fill="#fff" fillOpacity=".8" /></>),
  user: (<><circle cx="12" cy="7.6" r="4.4" fill="currentColor" /><path d="M3.8 21c.4-4.4 3.6-7 8.2-7s7.8 2.6 8.2 7z" fill="currentColor" /></>),
  camera: (<><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H8l1.4-2h5.2L16 6h2.5A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" fill="currentColor" /><circle cx="12" cy="13" r="3.8" fill="#fff" fillOpacity=".6" /><circle cx="12" cy="13" r="1.8" fill="currentColor" /></>),
  rec: (<><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="5.2" fill="currentColor" /></>),
  eye: (<><path d="M1.8 12S5.6 5 12 5s10.2 7 10.2 7-3.8 7-10.2 7S1.8 12 1.8 12z" fill="currentColor" /><circle cx="12" cy="12" r="3.6" fill="#fff" fillOpacity=".85" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /></>),
  gear: (<><path d="M10.2 2.5h3.6l.6 2.6 1.6.9 2.5-.9 1.8 3.1-2 1.8v1.8l2 1.8-1.8 3.1-2.5-.9-1.6.9-.6 2.6h-3.6l-.6-2.6-1.6-.9-2.5.9-1.8-3.1 2-1.8v-1.8l-2-1.8 1.8-3.1 2.5.9 1.6-.9z" fill="currentColor" /><circle cx="12" cy="12" r="3" fill="#fff" fillOpacity=".7" /></>),
  wood: (<><rect x="2.5" y="8" width="19" height="9" rx="4.5" fill="currentColor" /><ellipse cx="18" cy="12.5" rx="3" ry="4" fill="#fff" fillOpacity=".4" /><ellipse cx="18" cy="12.5" rx="1.2" ry="1.8" fill="currentColor" /><path d="M5 11.5h8M5.5 14h6" stroke="#fff" strokeOpacity=".4" strokeWidth="1.2" strokeLinecap="round" /></>),
  stone: (<><path d="M4 18.5 3 12l4-6.5 6-1.5 6 3 2 7-3 5.5-6 1.5z" fill="currentColor" /><path d="M7 5.5 11 11l8-1.5M11 11l1 8" stroke="#fff" strokeOpacity=".4" strokeWidth="1.3" fill="none" /></>),
  plank: (<><rect x="2" y="9" width="20" height="6" rx="1.6" fill="currentColor" /><path d="M5 12h4M13 12h5" stroke="#fff" strokeOpacity=".45" strokeWidth="1.4" strokeLinecap="round" /><circle cx="4.2" cy="12" r=".9" fill="#fff" fillOpacity=".7" /><circle cx="19.8" cy="12" r=".9" fill="#fff" fillOpacity=".7" /></>),
  brick: (<><rect x="2.5" y="5" width="19" height="14" rx="2" fill="currentColor" /><path d="M2.5 9.7h19M2.5 14.3h19M9 5v4.7M15 9.7v4.6M9 14.3V19" stroke="#fff" strokeOpacity=".5" strokeWidth="1.3" /></>),
  plane: (<><path d="M21.5 3.5c.8-.2 1.2.3 1 1l-2.6 14a1 1 0 0 1-1.6.6l-4.3-3-2.5 3v-4.8z" fill="currentColor" fillOpacity=".7" /><path d="M2 11.2 20.7 3.6 9.8 14.7 12.8 21l-2.5-.6-1.6-3.4L2.2 12.9z" fill="currentColor" /></>),
  bell: (<><path d="M12 2.5a6 6 0 0 0-6 6v4l-2 3.5h16L18 12.5v-4a6 6 0 0 0-6-6z" fill="currentColor" /><path d="M9.6 19a2.6 2.6 0 0 0 4.8 0z" fill="currentColor" /></>),
  dance: (<><circle cx="12" cy="4.6" r="2.4" fill="currentColor" /><path d="M12 8c-2 0-3 1-3.4 3L7 13l-3-1.4M12 8c2 0 3 1 3.4 3l1.6 2.6 3-1.2M12 10v6l-3 5.5M12 16l3 5.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>),
  tree: (<><circle cx="12" cy="9" r="7" fill="currentColor" /><circle cx="7.5" cy="12" r="4.2" fill="currentColor" /><circle cx="16.5" cy="12" r="4.2" fill="currentColor" /><rect x="10.4" y="14" width="3.2" height="8" rx="1.2" fill="currentColor" fillOpacity=".65" /></>),
  swing: (<><path d="M3 21 6 4h12l3 17" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 4v10M15 4v10" stroke="currentColor" strokeWidth="1.6" /><rect x="7.4" y="14" width="3.2" height="1.8" rx=".8" fill="currentColor" /><rect x="13.4" y="14" width="3.2" height="1.8" rx=".8" fill="currentColor" /></>),
  hammer: (<><path d="M13 3.2 16.5 2l4.2 4.2-1.2 3.5-2.5-.6L13 12.6 9.6 9.2z" fill="currentColor" /><path d="M11.4 11 3.8 18.6a2.2 2.2 0 0 0 3.1 3.1L14.5 14z" fill="currentColor" fillOpacity=".7" /></>),
  scales: (<><path d="M12 3v17M7 20.5h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M4 7h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="m4 7-3 7a3.4 3.4 0 0 0 6 0zM20 7l-3 7a3.4 3.4 0 0 0 6 0z" fill="currentColor" /></>),
  paper: (<><path d="M6 3h9l4 4v13a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V4.5A1.5 1.5 0 0 1 6 3z" fill="currentColor" /><path d="M8 11h8M8 14.5h8M8 18h5" stroke="#fff" strokeOpacity=".65" strokeWidth="1.5" strokeLinecap="round" /></>),
  star: (<path d="m12 2.4 2.8 5.9 6.4.9-4.7 4.4 1.2 6.4L12 17l-5.7 3 1.2-6.4L2.8 9.2l6.4-.9z" fill="currentColor" />),
  moon: (<path d="M20.5 14.5A8.8 8.8 0 0 1 9.5 3.5a9 9 0 1 0 11 11z" fill="currentColor" />),
  sun: (<><circle cx="12" cy="12" r="5" fill="currentColor" /><path d="M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3M4.8 4.8l2.1 2.1M17.1 17.1l2.1 2.1M4.8 19.2l2.1-2.1M17.1 6.9l2.1-2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>),
  lock: (<><rect x="4.5" y="10.5" width="15" height="11" rx="3" fill="currentColor" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="2.2" fill="none" /><circle cx="12" cy="16" r="1.6" fill="#fff" fillOpacity=".8" /></>),
  check: (<path d="m4.5 12.8 5 5 10-11" stroke="currentColor" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />),
  arrow: (<path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />),
  back: (<path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />),
  at: (<><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M16 8v5.2a2.6 2.6 0 0 0 5.2 0V12a9.2 9.2 0 1 0-3.6 7.3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></>),
  boat: (<><path d="M2.5 14h19l-3 6H5.5z" fill="currentColor" /><path d="M12 3v10M12 4l7 8h-7z" fill="currentColor" fillOpacity=".75" /></>),
  rocket: (<><path d="M12 2c4 2 6 6 5 11l-2 3H9l-2-3C6 8 8 4 12 2z" fill="currentColor" /><circle cx="12" cy="9" r="2" fill="#fff" fillOpacity=".8" /><path d="M7 14l-3 3 .5 3 3-1.5zM17 14l3 3-.5 3-3-1.5z" fill="currentColor" fillOpacity=".7" /></>),
  crown: (<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-1.8 11H4.8z" fill="currentColor" />),
  close: (<path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />),
  menu: (<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />),
  carrot: (<><path d="M16.5 6.5c2 2 1 6-3 11l-3.6 4.2c-.6.7-1.5.2-1.4-.7L9 15c-1.2-2.6.2-6.2 2.6-7.4z" fill="currentColor" /><path d="M13 6c0-2 1-3.4 2.6-4M15 7c1.2-1.8 3-2.4 5-2M12.4 8c-1-1.6-2.8-2.4-4.6-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" strokeOpacity=".7" /></>),
  quest: (<><rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" /><path d="M12 6.6v7M12 16.6v1.4" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" /></>),
  chat: (<><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="currentColor" /><path d="M7 9h10M7 13h6" stroke="#fff" strokeOpacity=".7" strokeWidth="1.6" strokeLinecap="round" /></>),
  shirt: (<path d="M8.5 3 3 6l2 5 2.5-1V21h9V10l2.5 1 2-5-5.5-3a3.5 3.5 0 0 1-7 0z" fill="currentColor" />),
  bread: (<><path d="M3 12a5 5 0 0 1 5-5h8a5 5 0 0 1 0 10v2.5a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V17a5 5 0 0 1-5-5z" fill="currentColor" /><path d="M9 10.5l1 2M13 10l1 2.4" stroke="#fff" strokeOpacity=".6" strokeWidth="1.6" strokeLinecap="round" /></>),
  train: (<><rect x="5" y="3" width="14" height="15" rx="4" fill="currentColor" /><rect x="7.5" y="6" width="9" height="5" rx="1.4" fill="#fff" fillOpacity=".6" /><circle cx="9" cy="14.5" r="1.2" fill="#fff" fillOpacity=".8" /><circle cx="15" cy="14.5" r="1.2" fill="#fff" fillOpacity=".8" /><path d="M7 21l2-3M17 21l-2-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>),
  play: (<path d="M7 4.5v15l13-7.5z" fill="currentColor" strokeLinejoin="round" />),
};

export type IcoName = keyof typeof P;

export function Ico({ name, size = 22, className = '', style }: { name: IcoName | string; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} aria-hidden="true" focusable="false">
      {P[name] ?? P.star}
    </svg>
  );
}
