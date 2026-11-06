import { ReactNode } from 'react';

/**
 * Ícones SVG inline do jogo.
 *
 * Todos os emojis da interface foram substituídos por estes glifos, desenhados
 * à mão em `currentColor` para herdarem a cor do contexto. Não há dependências
 * externas: cada ícone é um pequeno SVG 24×24.
 */
const GLYPHS: Record<string, ReactNode> = {
  bolt: (<><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></>),
  megaphone: (<><path d="M3 10v4l11 4V6z" /><path d="M14 8c3 0 5 1.5 5 4s-2 4-5 4" /><path d="M6 14l1.5 6h3L9 15" /></>),
  ship: (<><path d="M3 17l2 4h14l2-4z" /><path d="M5 17V11h14v6" /><path d="M9 11V7h6v4" /><path d="M12 7V3" /></>),
  metro: (<><rect x="5" y="3" width="14" height="15" rx="3" /><path d="M5 12h14" /><path d="M9 15h.01M15 15h.01" /><path d="M8 21l2-3M16 21l-2-3" /></>),

  // --- Cidade / marcos -------------------------------------------------------
  city: (
    <>
      <path d="M3 21V9l5-3v15" />
      <path d="M8 21V6l6-3v18" />
      <path d="M14 21V11l7-3v13" />
      <path d="M11 8h.01M11 12h.01M11 16h.01M17 12h.01M17 16h.01M5 13h.01M5 17h.01" />
    </>
  ),
  fountain: (
    <>
      <path d="M4 20h16" />
      <path d="M6 20c0-3 2.7-5 6-5s6 2 6 5" />
      <path d="M12 15V6" />
      <path d="M8.5 8.5c0-1.5 1.5-2.5 3.5-2.5s3.5 1 3.5 2.5" />
      <path d="M12 3v3" />
    </>
  ),
  cityhall: (
    <>
      <path d="M3 10h18L12 4 3 10z" />
      <path d="M5 10v9M9.5 10v9M14.5 10v9M19 10v9" />
      <path d="M3 21h18" />
    </>
  ),
  hospital: (
    <>
      <path d="M5 21V7l7-3 7 3v14" />
      <path d="M12 9v6M9 12h6" />
      <path d="M9 21v-4h6v4" />
    </>
  ),
  stadium: (
    <>
      <ellipse cx="12" cy="12" rx="9" ry="6" />
      <ellipse cx="12" cy="12" rx="4" ry="2.4" />
      <path d="M3 12v3c0 3.3 4 6 9 6s9-2.7 9-6v-3" />
    </>
  ),
  pool: (
    <>
      <path d="M3 9h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9z" />
      <path d="M3 19c1.5 0 1.5-1.2 3-1.2S7.5 19 9 19s1.5-1.2 3-1.2S13.5 19 15 19s1.5-1.2 3-1.2S19.5 19 21 19" />
      <path d="M8 9V5.5A1.5 1.5 0 0 1 9.5 4h1" />
    </>
  ),
  fishing: (
    <>
      <path d="M3 21l9-9" />
      <path d="M12 12c3 0 6-2 8-6-4 0-7 1-9 3" />
      <circle cx="16" cy="13" r="2.2" />
      <path d="M18 11.4V8" />
    </>
  ),
  farm: (
    <>
      <path d="M4 21V11l4-2 4 2v10" />
      <path d="M12 21V8l6-3v16" />
      <path d="M4 21h17" />
      <path d="M7 15h2M15 12h1M15 16h1" />
    </>
  ),
  train: (
    <>
      <rect x="5" y="3" width="14" height="13" rx="3" />
      <path d="M5 9h14" />
      <circle cx="9" cy="13" r="1.2" />
      <circle cx="15" cy="13" r="1.2" />
      <path d="M8 20l1.5-3M16 20l-1.5-3M4 20h16" />
    </>
  ),
  fish: (
    <>
      <path d="M3 12c3-4 7-6 11-6 3 0 5 1 7 3-2 2-4 3-7 3s-7-1-11 0z" />
      <path d="M15 12c0 3 1 5 3 7 1-.7 2-1.7 3-3-2-2-3-3-3-4" />
      <circle cx="8" cy="10.5" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  houses: (
    <>
      <path d="M2 12l5-4 5 4" />
      <path d="M3.5 11v8h7v-8" />
      <path d="M12 13l5-4 5 4" />
      <path d="M13.5 12v7h7v-7" />
    </>
  ),
  hotel: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M7 8h3M14 8h3M7 12h3M14 12h3" />
      <path d="M10 21v-4h4v4" />
    </>
  ),
  plane: (
    <>
      <path d="M10.5 3.5 12 3l1.5.5 1 8L21 15v2l-6.5-1.5L14 20l1.5 1v1L12 21l-3.5 1v-1L10 20l-.5-4.5L3 17v-2l6.5-3.5 1-8z" />
    </>
  ),
  sunset: (
    <>
      <path d="M3 17h18" />
      <path d="M7 17a5 5 0 0 1 10 0" />
      <path d="M12 5v3M5.6 8.6l2 2M18.4 8.6l-2 2" />
      <path d="M3 21h18" />
    </>
  ),
  bakery: (
    <>
      <path d="M4 14c0-3 3.6-6 8-6s8 3 8 6c0 3-3.6 5-8 5s-8-2-8-5z" />
      <path d="M8 10.5c1-2 2.6-3 4-3s3 1 4 3" />
    </>
  ),
  market: (
    <>
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V9z" />
      <path d="M5 13v8h14v-8" />
      <path d="M9 21v-4h6v4" />
    </>
  ),

  // --- Comida / agricultura --------------------------------------------------
  carrot: (
    <>
      <path d="M11 21l6-9 2 2-9 6z" />
      <path d="M13 13l-2-2c-1-1-1-3 1-3 1 0 2 1 2 1s0-2 1-3c1-1 3 0 3 1 0 1-1 2-1 2l3 3" />
    </>
  ),
  corn: (
    <>
      <path d="M12 21c-3 0-5-3-5-7s2-8 5-8 5 4 5 8-2 7-5 7z" />
      <path d="M9 13h6M9 16h6M12 6v15" />
    </>
  ),
  sugarcane: (
    <>
      <path d="M10 21l2-16" />
      <path d="M12 12c2-1 4-3 4-6-3 0-5 2-5 4" />
      <path d="M11 17c-2-1-4-3-4-6 3 0 4 2 5 4" />
    </>
  ),
  tomato: (
    <>
      <circle cx="12" cy="14" r="6.5" />
      <path d="M12 7.5c-1-2-3-2-4-2 1 2 2 2.5 4 2.5s3-.5 4-2.5c-1 0-3 0-4 2z" />
    </>
  ),
  bread: (
    <>
      <path d="M3 12c0-3 4-5 9-5s9 2 9 5-4 5-9 5-9-2-9-5z" />
      <path d="M8 8.5v7M12 7.5v9M16 8.5v7" />
    </>
  ),
  cake: (
    <>
      <path d="M4 20h16v-6c0-1.5-1-2.5-2.5-2.5h-11C5 11.5 4 12.5 4 14v6z" />
      <path d="M4 16c2 1.5 4 1.5 6 0s4-1.5 6 0 2.6 1 4 0" />
      <path d="M12 11.5V8" />
      <path d="M12 8c1.2 0 1.2-2 0-2s-1.2 2 0 2z" />
    </>
  ),
  worm: (
    <>
      <path d="M4 16c0-2 2-3 3.5-3S10 14 10 16s1.5 3 3 3 3-1 3-3-1-3-1-5 1-4 3-4" />
      <circle cx="18" cy="6" r="1.6" />
    </>
  ),
  seeds: (
    <>
      <path d="M5 19c2-4 5-6 9-7" />
      <ellipse cx="13" cy="9" rx="3" ry="4.5" transform="rotate(30 13 9)" />
      <path d="M5 19c-1-3 0-6 2-8" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 8h11v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
      <path d="M15 10h2.5a2.5 2.5 0 0 1 0 5H15" />
      <path d="M4 4.5c0 .8.8 1 .8 1.8M8 4.5c0 .8.8 1 .8 1.8" />
    </>
  ),

  // --- Mobiliário ------------------------------------------------------------
  bed: (
    <>
      <path d="M3 18v-7h18v7" />
      <path d="M3 18v2M21 18v2" />
      <path d="M6 11V8h5v3M13 11V8h5v3" />
      <path d="M3 14h18" />
    </>
  ),
  'bed-single': (
    <>
      <path d="M4 18v-7h13v7" />
      <path d="M4 18v2M17 18v2" />
      <path d="M7 11V8h7v3" />
      <path d="M4 14h13" />
      <path d="M17 12h3v6h-3" />
    </>
  ),
  sofa: (
    <>
      <path d="M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
      <path d="M4 12a2 2 0 0 0-2 2v4h20v-4a2 2 0 0 0-2-2" />
      <path d="M6 12h12v6H6z" />
      <path d="M4 18v2M20 18v2" />
    </>
  ),
  chair: (
    <>
      <path d="M7 4h10v9H7z" />
      <path d="M6 13h12v3H6z" />
      <path d="M8 16v4M16 16v4" />
    </>
  ),
  table: (
    <>
      <path d="M3 9h18v3H3z" />
      <path d="M5 12v8M19 12v8" />
    </>
  ),
  fridge: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M6 10h12" />
      <path d="M9 6v2M9 13v2" />
    </>
  ),
  stove: (
    <>
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <path d="M4 17h16" />
      <path d="M8 5c0-1 1-1 1-2M14 5c0-1 1-1 1-2" />
    </>
  ),
  tv: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  bookcase: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M4 9h16M4 15h16M8 3v6M14 9v6M10 15v6" />
    </>
  ),
  plant: (
    <>
      <path d="M6 13h12l-1.5 8h-9L6 13z" />
      <path d="M12 13V8" />
      <path d="M12 9c-3 0-4-2-4-4 2 0 4 1 4 4zM12 8c3 0 4-2 4-4-2 0-4 1-4 4z" />
    </>
  ),
  rug: (
    <>
      <rect x="3" y="7" width="18" height="10" rx="1.5" />
      <path d="M6 7v10M18 7v10" />
      <path d="M9 10h6M9 14h6" />
    </>
  ),
  lamp: (
    <>
      <path d="M9 4h6l2 8H7l2-8z" />
      <path d="M12 12v8" />
      <path d="M9 21h6" />
    </>
  ),

  // --- UI / estado -----------------------------------------------------------
  truck: (
    <>
      <path d="M2 7h11v9H2z" />
      <path d="M13 10h4l4 3.5V16h-8z" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17.5" cy="18" r="2" />
    </>
  ),
  vote: (
    <>
      <path d="M4 13h16v8H4z" />
      <path d="M9 13V5h6v8" />
      <path d="M11 8l1.5 1.5L15 6.5" />
    </>
  ),
  siren: (
    <>
      <path d="M6 18a6 6 0 0 1 12 0v2H6v-2z" />
      <path d="M4 20h16" />
      <path d="M12 6V3M6.5 8L4.5 6M17.5 8l2-2" />
    </>
  ),
  money: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 12h.01M18 12h.01" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  cart: (
    <>
      <path d="M2 4h2.5l2.2 10.5h11L20 7H6" />
      <circle cx="9" cy="19" r="1.6" />
      <circle cx="17" cy="19" r="1.6" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M10.5 5.5h3" />
      <path d="M11 18.5h2" />
    </>
  ),
  map: (
    <>
      <path d="M9 4L3 6.5v14L9 18l6 2.5 6-2.5v-14L15 6.5 9 4z" />
      <path d="M9 4v14M15 6.5v14" />
    </>
  ),
  home: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  'home-owned': (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5h4v5" />
      <path d="M15.5 4.5l1.5 1.5L20 3" />
    </>
  ),
  sign: (
    <>
      <path d="M6 3h12v8H6z" />
      <path d="M12 11v10" />
      <path d="M8 6h6M8 8.5h4" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="8" r="3.5" />
      <path d="M10.5 10.5L20 20M16 16l2-2M18.5 18.5l2-2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8M17 14.4c2.3.7 4 2.8 4 5.6" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2s0-2 1.5-2h2.5A3.5 3.5 0 0 0 21 13.5C21 7.7 17 3 12 3z" />
      <circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="10" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  construction: (
    <>
      <path d="M3 21h18" />
      <path d="M6 21V8l6-4 6 4v13" />
      <path d="M6 12h12M6 16h12" />
      <path d="M10 8h4" />
    </>
  ),
  road: (
    <>
      <path d="M8 3L4 21M16 3l4 18" />
      <path d="M12 5v3M12 11v3M12 17v3" />
    </>
  ),
  school: (
    <>
      <path d="M12 3l9 4.5-9 4.5L3 7.5 12 3z" />
      <path d="M7 9.5V15c0 1.7 2.2 3 5 3s5-1.3 5-3V9.5" />
      <path d="M21 7.5V14" />
    </>
  ),
  tree: (
    <>
      <path d="M12 21v-6" />
      <path d="M12 15c-3.5 0-6-2.2-6-5s2.5-5 6-5 6 2.2 6 5-2.5 5-6 5z" />
      <path d="M9 21h6" />
    </>
  ),
  pause: (
    <>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </>
  ),
  tools: (
    <>
      <path d="M14.5 3a5 5 0 0 0 6 6l-11 11a2.8 2.8 0 0 1-4-4L16.5 5" />
      <path d="M3 21l3.5-3.5" />
      <path d="M5 3l4 4-2 2-4-4 2-2z" />
    </>
  ),
  mayor: (
    <>
      <path d="M4 12h16l-1.5 9h-13L4 12z" />
      <path d="M7 12l1-6 2 3 2-4 2 4 2-3 1 6" />
      <path d="M9 16h6" />
    </>
  ),
  baker: (
    <>
      <path d="M4 13h16v7H4z" />
      <path d="M6 13c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M8 9.5c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5" />
      <path d="M9 16.5h6" />
    </>
  ),
  farmer: (
    <>
      <circle cx="12" cy="7" r="3.2" />
      <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M4 9h16" />
      <path d="M7 6.5V9M17 6.5V9" />
    </>
  ),
  check: <path d="M4 12.5l5 5L20 6.5" />,
  pin: (
    <>
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  dog: (
    <>
      <path d="M5 9V5l3 2h8l3-2v4" />
      <path d="M5 9v5a7 7 0 0 0 14 0V9" />
      <circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M11 15.5h2" />
    </>
  ),
  cat: (
    <>
      <path d="M5 10V5l3.5 2.5h7L19 5v5" />
      <path d="M5 10v4a7 7 0 0 0 14 0v-4" />
      <path d="M9.5 12.5h.01M14.5 12.5h.01" />
      <path d="M10 16h4" />
    </>
  ),
  capybara: (
    <>
      <ellipse cx="12" cy="14" rx="7" ry="6" />
      <circle cx="17" cy="9.5" r="3.2" />
      <path d="M15.5 9h.01M19 9h.01" />
      <path d="M5 19v2M9 20v1.5M15 20v1.5M19 19v2" />
    </>
  ),
  chicken: (
    <>
      <circle cx="13" cy="9" r="4" />
      <path d="M17 9l3 1.5-3 1.5" />
      <path d="M13 5c0-1.5 1-2 1-3.5 1 1 .5 2 .5 3.5" />
      <path d="M11 13c0 4-2 6-5 7 1-2 1-4 1-5" />
      <path d="M13 13c1 3 3 4 6 4" />
    </>
  ),
  newspaper: (
    <>
      <path d="M4 5h13v14H4z" />
      <path d="M17 8h3v9a2 2 0 0 1-2 2h-1" />
      <path d="M7 8h7M7 11h7M7 14h4" />
      <path d="M13 14h1.5v2H13z" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="8" width="18" height="11" rx="2" />
      <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
      <path d="M10.5 13v2h3v-2" />
    </>
  ),
};

export type GameIconName = keyof typeof GLYPHS;

export function GameIcon({
  name,
  size = 20,
  className = '',
  strokeWidth = 1.7,
}: {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const glyph = GLYPHS[name] ?? GLYPHS.city;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  );
}
