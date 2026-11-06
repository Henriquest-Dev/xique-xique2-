import { useEffect, useRef } from 'react';
import { LANDMARKS, STRAIGHT_ROADS, WORLD_BOUNDS, getZoneAt } from '../game/constants';
import { LotData } from '../types/game';
import { worldRaster } from '../game/mapRaster';
import { realmAt, VENEZA } from '../game/realmsData';

interface Props {
  x: number;
  z: number;
  heading: number;
  lots: LotData[];
  size?: number;
}

export function Minimap({ x, z, heading, lots, size = 136 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const realm = realmAt(x, z);
    const worldWidth = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX;
    const worldDepth = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ;
    const scale = realm ? size / (realm.half * 2) : size / Math.max(worldWidth, worldDepth);
    const cxw = realm ? realm.cx : WORLD_BOUNDS.minX + worldWidth / 2;
    const czw = realm ? realm.cz : WORLD_BOUNDS.minZ + worldDepth / 2;
    const toX = (wx: number) => size / 2 + (wx - cxw) * scale;
    const toY = (wz: number) => size / 2 + (wz - czw) * scale;

    ctx.clearRect(0, 0, size, size);
    if (realm) {
      const ground: Record<string, string> = { savana: '#c9a95c', floresta: '#2a5f2c', deserto: '#e3c488', fazendas: '#7fae4c', veneza: '#3d6a62' };
      ctx.fillStyle = ground[realm.id] ?? '#888';
      ctx.fillRect(0, 0, size, size);
      if (realm.id === 'veneza') {
        ctx.fillStyle = '#e0d6bd';
        for (let ix = -VENEZA.blocks; ix <= VENEZA.blocks; ix++) {
          for (let iz = -VENEZA.blocks; iz <= VENEZA.blocks; iz++) {
            ctx.fillRect(toX(realm.cx + ix * VENEZA.pitch - VENEZA.block), toY(realm.cz + iz * VENEZA.pitch - VENEZA.block), VENEZA.block * 2 * scale, VENEZA.block * 2 * scale);
          }
        }
      }
      // marco de saída
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(toX(realm.exit.x), toY(realm.exit.z), 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.drawImage(worldRaster(), 0, 0, size, size);
      // Lotes
      lots.forEach((lot) => {
        const owned = lot.ownerId === 'player';
        ctx.fillStyle = owned ? '#f5b52e' : lot.ownerId ? 'rgba(226,232,240,0.42)' : 'rgba(148,163,184,0.24)';
        const px = toX(lot.x);
        const py = toY(lot.z);
        const sq = Math.max(1.4, scale * 7);
        ctx.fillRect(px - sq / 2, py - sq / 2, sq, sq);
      });
    }

    // Marcos (só os do mapa onde o jogador está)
    LANDMARKS.forEach((landmark) => {
      if ((realmAt(landmark.x, landmark.z)?.id ?? null) !== (realm?.id ?? null)) return;
      ctx.fillStyle = landmark.color;
      ctx.beginPath();
      ctx.arc(toX(landmark.x), toY(landmark.z), 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Jogador
    const px = toX(x);
    const py = toY(z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(heading + Math.PI);
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.moveTo(0, -5.5);
    ctx.lineTo(3.6, 4.5);
    ctx.lineTo(0, 2.6);
    ctx.lineTo(-3.6, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Anel de alcance
    ctx.strokeStyle = 'rgba(56,189,248,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, 16, 0, Math.PI * 2);
    ctx.stroke();

    // Moldura
    ctx.strokeStyle = 'rgba(148,197,226,0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  }, [x, z, heading, lots, size]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} style={{ width: size, height: size }} className="rounded-2xl" />
      <div className="pointer-events-none absolute inset-x-1 bottom-1 truncate rounded-lg bg-black/50 px-2 py-1 text-[10px] font-semibold text-slate-300">
        {getZoneAt(x, z)}
      </div>
      <span className="pointer-events-none absolute left-2 top-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
        N
      </span>
    </div>
  );
}
