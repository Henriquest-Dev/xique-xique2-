import { useMemo, useState } from 'react';
import { REALMS, venezaCell, type RealmDef } from '../game/realmsData';
import { pointsOf, type PointKind } from '../game/mapPoints';
import { tr, cityName, realmBlurb } from '../services/i18n';
import { GameIcon } from './GameIcon';
import { Button } from './ui';

const KIND_ICON: Record<PointKind, string> = { arrive: 'plane', exit: 'ship', hall: 'cityhall', metro: 'metro', ad: 'sign', dock: 'ship', npc: 'users', power: 'bolt', bank: 'money', shop: 'cart' };
const KIND_COLOR: Record<PointKind, string> = { arrive: '#38bdf8', exit: '#38bdf8', hall: '#fbbf24', metro: '#f59e0b', ad: '#a78bfa', dock: '#22d3ee', npc: '#f472b6', power: '#4ade80', bank: '#fde047', shop: '#fb923c' };

/** Mapa de uma ilha: terreno simplificado + pontos de interesse + jogador. */
export function RealmMap({ realm, position, onGo }: { realm: RealmDef; position: { x: number; z: number }; onGo: (x: number, z: number) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const size = 520;
  const pad = 20;
  const s = (size - pad * 2) / (realm.half * 2);
  const px = (x: number) => pad + (x - (realm.cx - realm.half)) * s;
  const pz = (z: number) => pad + (z - (realm.cz - realm.half)) * s;
  const pts = pointsOf(realm.id);
  const tiles = useMemo(() => {
    if (realm.id !== 'veneza') return null;
    const out: { x: number; z: number; t: string }[] = [];
    const step = 8;
    for (let lx = -realm.half; lx < realm.half; lx += step) for (let lz = -realm.half; lz < realm.half; lz += step) {
      const t = venezaCell(lx + step / 2, lz + step / 2);
      if (t === 'canal') out.push({ x: lx, z: lz, t });
      else if (t === 'bridge') out.push({ x: lx, z: lz, t });
      else if (t === 'block') out.push({ x: lx, z: lz, t });
    }
    return out;
  }, [realm]);
  const ground = { savana: '#c9a86a', floresta: '#2f6b3a', deserto: '#e0b872', fazendas: '#7aa84a', veneza: '#3c6e63' }[realm.id];
  const selected = pts.find((p) => `${p.kind}:${p.name}` === sel);
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border-2 border-[#3c4686]/70 bg-[#10153a] px-3 py-2 text-white">
        <p className="text-sm font-extrabold">{cityName(realm.id)}</p>
        <p className="text-[11px] text-slate-400">{realmBlurb(realm.id)}</p>
      </div>
      <div className="mx-auto overflow-hidden rounded-2xl border-4 border-[#3c4686]" style={{ width: 'min(520px, calc(100dvh - 440px))', minWidth: 260 }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="block w-full" style={{ background: realm.water }}>
          <rect x={pad} y={pad} width={size - pad * 2} height={size - pad * 2} rx={16} fill={ground} stroke="#f8fafc" strokeOpacity={0.35} strokeWidth={4} />
          {tiles?.map((t, i) => <rect key={i} x={px(realm.cx + t.x)} y={pz(realm.cz + t.z)} width={8 * s + 0.6} height={8 * s + 0.6} fill={t.t === 'canal' ? '#2a6a8a' : t.t === 'bridge' ? '#e5d3a8' : '#d8c9a5'} />)}
          {pts.map((p) => {
            const key = `${p.kind}:${p.name}`;
            const on = sel === key;
            return (
              <g key={key} transform={`translate(${px(p.x)} ${pz(p.z)})`} onClick={() => setSel(on ? null : key)} style={{ cursor: 'pointer' }}>
                <circle r={on ? 14 : 10} fill={KIND_COLOR[p.kind]} stroke="#0b0f2c" strokeWidth={2.5} />
                <foreignObject x={-7} y={-7} width={14} height={14} pointerEvents="none"><div style={{ width: 14, height: 14, color: '#0b0f2c' }}><GameIcon name={KIND_ICON[p.kind]} size={14} /></div></foreignObject>
              </g>
            );
          })}
          <g transform={`translate(${px(position.x)} ${pz(position.z)})`}>
            <circle r={9} fill="#ef4444" stroke="#fff" strokeWidth={3} />
            <circle r={16} fill="none" stroke="#ef4444" strokeWidth={2} opacity={0.5} />
          </g>
        </svg>
      </div>
      <div className="min-h-[64px] rounded-2xl border-2 border-[#3c4686]/70 bg-[#10153a] px-3 py-2 text-white">
        {selected ? (
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: KIND_COLOR[selected.kind], color: '#0b0f2c' }}><GameIcon name={KIND_ICON[selected.kind]} size={20} /></span>
            <p className="flex-1 text-sm font-extrabold">{selected.name}</p>
            <Button onClick={() => onGo(selected.x, selected.z)}>{tr('map.go')}</Button>
          </div>
        ) : <p className="text-xs text-slate-400">{tr('map.islandHint')}</p>}
      </div>
      <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-300">
        {(Object.keys(KIND_COLOR) as PointKind[]).filter((k) => pts.some((p) => p.kind === k)).map((k) => (
          <span key={k} className="flex items-center gap-1 rounded-full bg-[#232a55] px-2 py-1"><i className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLOR[k] }} />{tr(`kind.${k}`)}</span>
        ))}
      </div>
    </div>
  );
}
export { REALMS };
