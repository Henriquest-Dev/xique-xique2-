import { useCallback, useMemo, useRef, useState } from 'react';
import { Box, DoorOpen, RotateCw, Trash2 } from 'lucide-react';
import { LotData } from '../types/game';
import { FURNITURE_CATALOG } from '../game/constants';
import { gameState } from '../services/gameState';
import { Button, Modal, SectionTitle, money } from './ui';
import { InteriorPreview } from './InteriorPreview';
import { GameIcon } from './GameIcon';

interface Props {
  lot: LotData | null;
  onClose: () => void;
}

const CELL = 34;
const ROOM_W = 8;
const ROOM_D = 7;

type Rotation = 0 | 90 | 180 | 270;
type DragSource =
  | { kind: 'catalog'; itemId: string }
  | { kind: 'placed'; furnitureId: string; itemId: string };

function cellsFor(itemId: string, x: number, z: number, rotation: Rotation) {
  const def = FURNITURE_CATALOG.find((f) => f.id === itemId);
  if (!def) return { w: 1, d: 1 };
  const rotated = rotation === 90 || rotation === 270;
  return { w: rotated ? def.d : def.w, d: rotated ? def.w : def.d };
}

export function InteriorModal({ lot, onClose }: Props) {
  const [selected, setSelected] = useState<string>(FURNITURE_CATALOG[0].id);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [hover, setHover] = useState<{ x: number; z: number } | null>(null);
  const [drag, setDrag] = useState<DragSource | null>(null);
  const [selectedPlaced, setSelectedPlaced] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const definition = useMemo(
    () => FURNITURE_CATALOG.find((f) => f.id === selected) ?? FURNITURE_CATALOG[0],
    [selected]
  );

  const cellFromPointer = useCallback((clientX: number, clientY: number) => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / (rect.width / ROOM_W));
    const z = Math.floor((clientY - rect.top) / (rect.height / ROOM_D));
    if (x < 0 || z < 0 || x >= ROOM_W || z >= ROOM_D) return null;
    return { x, z };
  }, []);

  if (!lot) return null;

  const owned = lot.ownerId === 'player';
  const dims = cellsFor(definition.id, 0, 0, rotation);
  const canPlaceHere =
    owned && hover
      ? gameState.canPlaceFurniture(
          lot.id,
          definition.id,
          hover.x,
          hover.z,
          rotation,
          drag?.kind === 'placed' ? drag.furnitureId : undefined
        )
      : false;

  const dropAt = (cell: { x: number; z: number }) => {
    if (!drag) return;
    if (drag.kind === 'catalog') {
      if (gameState.placeFurniture(lot.id, drag.itemId, cell.x, cell.z, rotation)) {
        setSelectedPlaced(null);
      }
    } else {
      gameState.moveFurniture(lot.id, drag.furnitureId, cell.x, cell.z, rotation);
      setSelectedPlaced(drag.furnitureId);
    }
    setDrag(null);
  };

  const startDrag = (source: DragSource) => {
    setDrag(source);
    if (source.kind === 'catalog') setSelected(source.itemId);
    else setSelectedPlaced(source.furnitureId);
  };

  const handlePlacedPointerDown = (event: React.PointerEvent, furnitureId: string, itemId: string) => {
    if (!owned) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    startDrag({ kind: 'placed', furnitureId, itemId });
  };

  return (
    <Modal
      open={Boolean(lot)}
      onClose={onClose}
      title={`Casa do Lote #${lot.id}`}
      subtitle="Editor de interiores · arrasta os móveis dentro da planta"
      icon={<GameIcon name="sofa" size={22} className="text-amber-400" />}
      width="max-w-5xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-400">
            Carteira: <span className="text-amber-300">{money(gameState.getState().wallet)}</span> ·{' '}
            {lot.interiorItems.length} móveis
          </p>
          <div className="flex gap-2">
            {selectedPlaced && (
              <Button
                variant="ghost"
                className="text-rose-200"
                onClick={() => {
                  gameState.removeFurniture(lot.id, selectedPlaced);
                  setSelectedPlaced(null);
                }}
                icon={<Trash2 size={15} />}
              >
                Remover móvel
              </Button>
            )}
            {owned && (
              <Button variant="ghost" onClick={() => gameState.sleep()}>
                Dormir
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} icon={<DoorOpen size={16} />}>
              Sair
            </Button>
          </div>
        </div>
      }
    >
      {!owned ? (
        <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200">
          Só o proprietário pode decorar esta casa.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <InteriorPreview items={lot.interiorItems} height={300} />

            <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
              <SectionTitle
                right={
                  <button
                    onClick={() => setRotation(((rotation + 90) % 360) as Rotation)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200"
                  >
                    <RotateCw size={12} /> Rodar {rotation}°
                  </button>
                }
              >
                Planta · {ROOM_W} × {ROOM_D} m
              </SectionTitle>

              <div className="flex justify-center overflow-x-auto pb-1">
                <div
                  ref={gridRef}
                  className="relative touch-none rounded-lg border border-2 border-[#3c4686] bg-[#c8a97d]/20"
                  style={{ width: CELL * ROOM_W, height: CELL * ROOM_D }}
                  onPointerMove={(event) => {
                    const cell = cellFromPointer(event.clientX, event.clientY);
                    if (cell) setHover(cell);
                  }}
                  onPointerLeave={() => {
                    if (!drag) setHover(null);
                  }}
                  onPointerUp={(event) => {
                    const cell = cellFromPointer(event.clientX, event.clientY);
                    if (cell) dropAt(cell);
                    else setDrag(null);
                  }}
                  onPointerCancel={() => setDrag(null)}
                >
                  {/* Grelha */}
                  {Array.from({ length: ROOM_W * ROOM_D }).map((_, index) => {
                    const x = index % ROOM_W;
                    const z = Math.floor(index / ROOM_W);
                    return (
                      <button
                        key={index}
                        onMouseEnter={() => setHover({ x, z })}
                        onFocus={() => setHover({ x, z })}
                        onClick={() => {
                          if (drag) return;
                          if (selectedPlaced) {
                            setSelectedPlaced(null);
                            return;
                          }
                          gameState.placeFurniture(lot.id, definition.id, x, z, rotation);
                        }}
                        style={{ left: x * CELL, top: z * CELL, width: CELL, height: CELL }}
                        className={`absolute border border-white/[0.06] transition ${
                          hover?.x === x && hover?.z === z ? 'bg-amber-300/20' : 'hover:bg-white/10'
                        }`}
                        aria-label={`Célula ${x},${z}`}
                      />
                    );
                  })}

                  {/* Fantasma do móvel em arrasto / selecionado */}
                  {hover && (drag || canPlaceHere) && (
                    <div
                      className={`pointer-events-none absolute rounded border-2 ${
                        drag
                          ? canPlaceHere
                            ? 'border-emerald-300/80 bg-emerald-300/25'
                            : 'border-rose-400/80 bg-rose-400/20'
                          : 'border-amber-300/70 bg-amber-300/20'
                      }`}
                      style={{
                        left: hover.x * CELL,
                        top: hover.z * CELL,
                        width: dims.w * CELL,
                        height: dims.d * CELL,
                      }}
                    />
                  )}

                  {/* Móveis colocados (arrastáveis) */}
                  {lot.interiorItems.map((item) => {
                    const def = FURNITURE_CATALOG.find((f) => f.id === item.itemId);
                    if (!def) return null;
                    const cell = cellsFor(item.itemId, item.x, item.z, item.rotation);
                    const beingDragged = drag?.kind === 'placed' && drag.furnitureId === item.id;
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onPointerDown={(event) => handlePlacedPointerDown(event, item.id, item.itemId)}
                        onClick={() => setSelectedPlaced(item.id)}
                        title={`${def.name} · arrasta para mover`}
                        style={{
                          left: item.x * CELL,
                          top: item.z * CELL,
                          width: cell.w * CELL,
                          height: cell.d * CELL,
                          touchAction: 'none',
                        }}
                        className={`absolute flex cursor-grab items-center justify-center rounded border active:cursor-grabbing ${
                          beingDragged
                            ? 'border-amber-300 bg-amber-400/40 opacity-70'
                            : selectedPlaced === item.id
                            ? 'border-rose-300 bg-rose-400/25'
                            : 'border-2 border-[#3c4686] bg-white/15 hover:bg-white/25'
                        }`}
                      >
                        <GameIcon name={def.icon} size={16} className="text-amber-100" />
                      </div>
                    );
                  })}

                  {/* Porta */}
                  <div
                    className="pointer-events-none absolute flex items-center justify-center rounded bg-emerald-500/30 text-[9px] font-bold text-emerald-100"
                    style={{ left: 7 * CELL, top: 3 * CELL, width: CELL, height: CELL * 1.2 }}
                  >
                    porta
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-slate-400">
                Arrasta um móvel da planta para o moveres, ou arrasta um item do catálogo para o colocares. A
                soleira da porta fica sempre livre.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
              <SectionTitle right={<Box size={14} className="text-slate-400" />}>Catálogo</SectionTitle>
              <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {FURNITURE_CATALOG.map((item) => (
                  <button
                    key={item.id}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
                      startDrag({ kind: 'catalog', itemId: item.id });
                    }}
                    onPointerMove={(event) => {
                      if (!drag) return;
                      const cell = cellFromPointer(event.clientX, event.clientY);
                      if (cell) setHover(cell);
                    }}
                    onPointerUp={(event) => {
                      if (!drag) return;
                      const cell = cellFromPointer(event.clientX, event.clientY);
                      if (cell) dropAt(cell);
                      else setDrag(null);
                    }}
                    onClick={() => setSelected(item.id)}
                    className={`flex w-full touch-none items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${
                      selected === item.id
                        ? 'border-amber-400/60 bg-amber-400/10'
                        : 'border-[#3c4686]/40 bg-[#10153a] hover:bg-[#1a2150]'
                    }`}
                  >
                    <GameIcon name={item.icon} size={18} className="shrink-0 text-amber-300" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-slate-100">{item.name}</span>
                      <span className="block text-[10px] text-slate-400">
                        {item.w}×{item.d} m · {money(item.price)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <Button
                className="mt-3 w-full"
                disabled={!hover || !canPlaceHere}
                onClick={() => hover && gameState.placeFurniture(lot.id, definition.id, hover.x, hover.z, rotation)}
                icon={<Box size={15} />}
              >
                Colocar {definition.name}
              </Button>
            </div>

            <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
              <SectionTitle>Resumo</SectionTitle>
              <div className="space-y-1 text-xs text-slate-400">
                <p>
                  Móvel selecionado: <span className="font-semibold text-slate-200">{definition.name}</span>
                </p>
                <p>
                  Ocupa {dims.w} × {dims.d} m
                </p>
                <p>Preço: {money(definition.price)}</p>
                <p>Devolução ao remover: 50%</p>
              </div>
            </div>

            {selectedPlaced && (
              <p className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-[11px] text-rose-200">
                Móvel selecionado. Arrasta-o para o mover, ou usa “Remover móvel”.
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
