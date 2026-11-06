import { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function iconPath(p: string) {
  return <path d={p} fill="currentColor" stroke="none" />;
}

export function IconHouse(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      {iconPath('M12 2L2 12a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1z')}
      {iconPath('M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7')}
      {iconPath('M7 12V6a3 3 0 0 1 6 0v6')}
      {iconPath('M4 19h2')}
      {iconPath('M12 19h2')}
      {iconPath('M20 19h2')}    </svg>
  );
}

export function IconBuilding(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      {iconPath('M3 4h18v16H3z')}
      {iconPath('M3 10h20')}
      {iconPath('M3 16h4M9 16h2M15 16h2M20 16h3')}
      {iconPath('M9 4v6M15 4v6')}
    </svg>
  );
}

export function IconDelivery(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M5 20l2.16-6.19a7.05 7.05 0 0 1 13.68 0L19 20h-14z" fill="currentColor" />
      <path d="M9 12h6v5h-6z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 10h4l-1-1h-2z" fill="currentColor" />
    </svg>
  );
}

export function IconMarket(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M3 3h18v17h-18z" fill="currentColor" />
      <path d="M7 3v5h3V7.5H7V4h2V3z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 3v6h3V8h-3v1h2V3z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 3v4h3V10h-3v3h2V3z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.5" cy="10" r="0.75" fill="currentColor" />
      <circle cx="13.5" cy="9" r="0.75" fill="currentColor" />
      <circle cx="17.5" cy="8" r="0.75" fill="currentColor" />
    </svg>
  );
}

export function IconVote(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M4 10h16M4 14h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="13" y="3" width="11" height="11" rx="1" fill="currentColor" />
      <rect x="3" y="4" width="3" height="16" rx="1" fill="currentColor" />
    </svg>
  );
}

export function IconBakery(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <circle cx="8.5" cy="14" r="4.5" fill="currentColor" />
      <circle cx="9" cy="14" r="3.6" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
      <path d="M16 8c0-2-1.5-4-4-4S8 6 8 8c0 1.3.8 2.5 2 3l1 2h2l1-2c1.2-.5 2-1.7 2-3z" fill="currentColor" />
      <path d="M11.5 8.5c.5 1 1 2 1 3a2 2 0 0 1-1 1.5 4 4 0 0 1-2 0c-.5-.5-.7-1-.7-1.5 0-.5.21-1 .51-1.5z" fill="rgba(0,0,0,0.2)" />
      <path d="M2 8c0-2 1-4 3-6s4 0 4 4" stroke="currentColor" strokeWidth="0.75" fill="none" />
    </svg>
  );
}

export function IconFishing(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <ellipse cx="6" cy="18" rx="4.5" ry="1.25" transform="rotate(-25 6 18)" fill="currentColor" />
      <path d="M12 22a6 6 0 0 1-6-6v-3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M14 7c3 0 5-2 5-5a3 3 0 0 0-6 0c0 2-1 3-2 4" fill="currentColor" />
      <ellipse cx="11" cy="5" rx="2.5" ry="1" transform="rotate(-20 11 5)" fill="currentColor" />
      <path d="M10 5c.5 1.5 1.5 2 3 2-1 .5-2 1.5-2.5 3" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}

export function IconFarm(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <rect x="3" y="9" width="18" height="11" rx="0.5" fill="currentColor" />
      <path d="M3 9V5l2-2h14l2 2v4" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="5" y="12" width="4" height="8" fill="rgba(0,0,0,0.25)" />
      <rect x="8" y="15" width="4" height="5" fill="rgba(0,0,0,0.2)" />
      <rect x="14" y="13" width="5" height="6" fill="rgba(0,0,0,0.25)" />
    </svg>
  );
}

export function IconCoin(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />
      <text x="12" y="15.5" fontSize="9" fontWeight="800" fill="rgba(0,0,0,0.5)" textAnchor="middle">X</text>
    </svg>
  );
}

export function IconMapPin(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M12 2a8 8 0 0 0-8 8c0 3 3 5 3 5h8c0-2 3-4 3-7a8 8 0 0 0-8-8z" fill="currentColor" />
      <circle cx="12" cy="10" r="2.5" fill="#000" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <circle cx="12" cy="9" r="5" fill="currentColor" />
      <path d="M4 21c0-5.5 3.8-10 8-10S20 15.5 20 21" fill="currentColor" />
    </svg>
  );
}

export function IconChat(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M21 11.5l-9 5-9-5V4h18v7.5z" fill="currentColor" />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M12 2v5M12 17v5M2 12h5M17 12h5M4.7 4.7l3.5 3.5M15.8 15.8l3.5 3.5M4.7 19.3l3.5-3.5M15.8 8.2l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconHome(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M3 12l9-8 9 8v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor" />
      <path d="M9 22V12h6v10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconDoor(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <rect x="9" y="5" width="6" height="17" fill="currentColor" />
      <circle cx="13" cy="14" r="0.6" fill="#fff" />
      <path d="M2 22h20" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconSettings2(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M12 5v2M12 17v2M5 12h2M17 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconCar(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M3 13l4-4h11l4 3v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="currentColor" />
      <circle cx="7.5" cy="16.5" r="1.75" fill="#000" />
      <circle cx="17" cy="16.5" r="1.75" fill="#000" />
      <path d="M7 13V9a3 3 0 0 1 6 0v4" stroke="currentColor" strokeWidth="1.25" fill="none" />
    </svg>
  );
}

export function IconMagnify(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <circle cx="10" cy="10" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M15.5 15.5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconChevronsLeft(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M15 5v14M9 12l6-7M9 5h6M9 19h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChevronsRight(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M16 5v14M20 12l-6-7M15 19H9M9 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M20 6l-14 9 5 12 6-14 4 7z" fill="currentColor" />
    </svg>
  );
}

export function IconWifi(props: IconProps) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M1 12s2-5 6-5 6 5 6 5-2 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M5 13s1.3-3 3.5-3 3.5 3 3.5 3-1.3 3-3.5 3-3.5-3-3.5-3z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
