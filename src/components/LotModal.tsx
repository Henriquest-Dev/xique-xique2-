import { useEffect, useRef, useState } from 'react';
import { sound } from '../services/sound';
import { ArrowRight, Hammer, Home, KeyRound, Palette, Trash2, Users } from 'lucide-react';
import { AccessLevel, HouseStyle, LotData } from '../types/game';
import { gameState } from '../services/gameState';
import { CROPS } from '../game/constants';
import { Button, Modal, Pill, SectionTitle, money } from './ui';
import { GameIcon } from './GameIcon';
import { finance } from '../finance';

interface Props {
  lot: LotData | null;
  onClose: () => void;
  onEnter: (lotId: number) => void;
}

const WALLS = ['#f8fafc', '#fef3c7', '#dbeafe', '#dcfce7', '#ffedd5', '#f3e8ff', '#fca5a5', '#c7d2fe'];
const ROOFS = ['#b91c1c', '#c2410c', '#9a3412', '#475569', '#15803d', '#7c3aed', '#0f766e', '#0369a1'];
const STYLES: { id: HouseStyle; label: string }[] = [
  { id: 'colonial', label: 'Colonial' },
  { id: 'moderna', label: 'Moderna' },
  { id: 'sobrado', label: 'Sobrado' },
  { id: 'terrea', label: 'Térrea' },
];

export function LotModal({ lot, onClose, onEnter }: Props) {
  const [handle, setHandle] = useState('');
  const [knock, setKnock] = useState<'idle' | 'waiting' | 'open' | 'denied' | 'away'>('idle');
  const timer = useRef<number | null>(null);
  useEffect(() => {
    setKnock('idle');
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [lot?.id]);
  if (!lot) return null;

  const ring = (kind: 'bell' | 'knock') => {
    if (knock === 'waiting') return;
    if (kind === 'bell') sound.playDoorbell();
    else sound.playKnock();
    setKnock('waiting');
    timer.current = window.setTimeout(() => {
      // o morador responde conforme a política de visitas (e às vezes não está em casa)
      const rnd = (lot.id * 9301 + Math.floor(Date.now() / 60000) * 49297) % 100;
      if (rnd < 20) setKnock('away');
      else if (lot.visitorAccess === 'public') setKnock('open');
      else if (lot.visitorAccess === 'friends' && lot.coResidents.length > 0 && rnd < 50) setKnock('open');
      else setKnock('denied');
      sound.playDoor();
    }, 1800);
  };

  const owned = lot.ownerId === 'player';
  const occupied = Boolean(lot.ownerId) && !owned;
  const affordable = gameState.getState().wallet >= lot.price;
  const state = gameState.getState();

  return (
    <Modal
      open={Boolean(lot)}
      onClose={onClose}
      title={lot.id > 100 ? `Lote #${lot.id} · Xique Park` : `Lote #${lot.id}`}
      subtitle={`${lot.sector === 'park' ? 'Condomínio Xique Park' : 'Centro de Xique-Xique'} · ${lot.width} × ${lot.depth} m`}
      icon={<GameIcon name="home" size={22} className="text-amber-400" />}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-400">
            Carteira: <span className="font-bold text-amber-300">{money(state.wallet)}</span>
          </p>
          {owned ? (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onEnter(lot.id)} icon={<Home size={16} />}>
                Entrar em casa
              </Button>
              <Button onClick={() => onEnter(lot.id)} icon={<Hammer size={16} />}>
                Decorar
              </Button>
            </div>
          ) : occupied ? (
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          ) : (
            <Button
              onClick={() => {
                gameState.claimLot(lot.id);
              }}
              disabled={!affordable}
              icon={<KeyRound size={16} />}
            >
              {affordable ? `Comprar por ${money(lot.price)}` : 'Saldo insuficiente'}
            </Button>
          )}
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-2 border-[#3c4686]/70 bg-gradient-to-br from-sky-500/20 to-amber-400/10 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Pill tone={owned ? 'good' : occupied ? 'info' : 'warn'}>
                  {owned ? 'Tua casa' : occupied ? 'Ocupado' : 'Disponível'}
                </Pill>
                <p className="mt-2 text-lg font-extrabold text-white">
                  {owned ? lot.ownerName : occupied ? lot.ownerName : 'Terreno vazio'}
                </p>
                <p className="text-xs text-slate-400">
                  {owned
                    ? `@${lot.ownerHandle} · ${lot.coResidents.length} co-residente(s)`
                    : occupied
                      ? `@${lot.ownerHandle}`
                      : 'Pronto a construir'}
                </p>
              </div>
              <GameIcon
                name={owned ? 'home-owned' : occupied ? 'home' : 'sign'}
                size={40}
                className={owned ? 'text-emerald-300' : occupied ? 'text-amber-300' : 'text-amber-300'}
              />
            </div>
            <div className="mt-4 flex items-end gap-4 text-xs text-slate-300">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Preço</p>
                <p className="font-display text-2xl font-extrabold text-amber-300">{money(lot.price)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Área</p>
                <p className="font-bold">{lot.width * lot.depth} m²</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Acesso</p>
                <p className="font-bold capitalize">{lot.visitorAccess === 'public' ? 'Público' : lot.visitorAccess === 'friends' ? 'Amigos' : 'Privado'}</p>
              </div>
            </div>
          </div>

          {!owned && !occupied && (
            <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
              <SectionTitle>O que recebes</SectionTitle>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-start gap-1.5"><GameIcon name="construction" size={13} className="mt-0.5 shrink-0 text-slate-400" />Casa de 2 andares construída na hora</li>
                <li className="flex items-start gap-1.5"><GameIcon name="palette" size={13} className="mt-0.5 shrink-0 text-slate-400" />Cores de parede, telhado e estilo editáveis</li>
                <li className="flex items-start gap-1.5"><GameIcon name="sofa" size={13} className="mt-0.5 shrink-0 text-slate-400" />Editor de interiores com 12 móveis</li>
                <li className="flex items-start gap-1.5"><GameIcon name="users" size={13} className="mt-0.5 shrink-0 text-slate-400" />Até 3 co-residentes autorizados</li>
                <li className="flex items-start gap-1.5"><GameIcon name="key" size={13} className="mt-0.5 shrink-0 text-slate-400" />Acesso público, só amigos ou privado</li>
              </ul>
            </div>
          )}

          {owned && (
            <>
              <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
                <SectionTitle right={<Palette size={14} className="text-slate-400" />}>Fachada</SectionTitle>
                <p className="mb-2 text-[11px] font-semibold text-slate-400">Estilo</p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => gameState.customizeHouse(lot.id, { houseStyle: style.id })}
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                        lot.houseStyle === style.id
                          ? 'border-amber-400/70 bg-amber-400/10 text-white'
                          : 'border-2 border-[#3c4686]/70 text-slate-400 hover:text-white'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
                <p className="mb-1.5 text-[11px] font-semibold text-slate-400">Parede</p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {WALLS.map((color) => (
                    <button
                      key={color}
                      onClick={() => gameState.customizeHouse(lot.id, { wallColor: color })}
                      style={{ backgroundColor: color }}
                      className={`h-7 w-7 rounded-full border-2 ${lot.wallColor === color ? 'border-white' : 'border-2 border-[#3c4686]'}`}
                      aria-label={`Parede ${color}`}
                    />
                  ))}
                </div>
                <p className="mb-1.5 text-[11px] font-semibold text-slate-400">Telhado</p>
                <div className="flex flex-wrap gap-1.5">
                  {ROOFS.map((color) => (
                    <button
                      key={color}
                      onClick={() => gameState.customizeHouse(lot.id, { roofColor: color })}
                      style={{ backgroundColor: color }}
                      className={`h-7 w-7 rounded-full border-2 ${lot.roofColor === color ? 'border-white' : 'border-2 border-[#3c4686]'}`}
                      aria-label={`Telhado ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
                <SectionTitle right={<Users size={14} className="text-slate-400" />}>Acesso</SectionTitle>
                <div className="flex flex-wrap gap-1.5">
                  {(['public', 'friends', 'private'] as AccessLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => gameState.customizeHouse(lot.id, { visitorAccess: level })}
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold capitalize transition ${
                        lot.visitorAccess === level
                          ? 'border-amber-300/70 bg-amber-300/10 text-white'
                          : 'border-2 border-[#3c4686]/70 text-slate-400 hover:text-white'
                      }`}
                    >
                      {level === 'public' ? 'Público' : level === 'friends' ? 'Amigos' : 'Privado'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-3">
          {owned && (
            <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
              <SectionTitle>Co-residentes</SectionTitle>
              <div className="space-y-1.5">
                {lot.coResidents.length === 0 && <p className="text-xs text-slate-400">Ninguém autorizado ainda.</p>}
                {lot.coResidents.map((resident) => (
                  <div key={resident} className="flex items-center justify-between rounded-xl bg-[#0b0f2c] px-2.5 py-1.5">
                    <span className="text-xs font-semibold text-slate-200">@{resident}</span>
                    <button
                      onClick={() => gameState.removeCoResident(lot.id, resident)}
                      className="text-slate-400 hover:text-rose-300"
                      aria-label={`Remover ${resident}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              {lot.coResidents.length < 3 && (
                <div className="mt-2 flex gap-1.5">
                  <input
                    value={handle}
                    onChange={(event) => setHandle(event.target.value)}
                    placeholder="@handle"
                    className="min-w-0 flex-1 rounded-lg border border-2 border-[#3c4686] bg-[#0b0f2c] px-2 py-1.5 text-xs text-white outline-none focus:border-amber-300/60"
                  />
                  <Button
                    variant="ghost"
                    className="px-3 py-1.5 text-xs"
                    onClick={() => {
                      gameState.addCoResident(lot.id, handle);
                      setHandle('');
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
              )}
              <p className="mt-2 text-[10px] text-slate-400">
                Nesta versão os handles são locais (sem servidor); servem para organizar quem tem acesso.
              </p>
            </div>
          )}

          {owned && (
            <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
              <SectionTitle>Interior</SectionTitle>
              <p className="text-xs text-slate-400">
                {lot.interiorItems.length} móvel(is) colocados. Abre o editor para arrastar móveis na grelha 8 × 7 m.
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {lot.interiorItems.slice(0, 8).map((item) => (
                  <span key={item.id} className="rounded-lg bg-[#10153a] px-2 py-1 text-[10px] text-slate-300">
                    {item.itemId}
                  </span>
                ))}
              </div>
            </div>
          )}

          {occupied && (
            <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
              <SectionTitle>Visita</SectionTitle>
              <p className="text-xs text-slate-400">
                {lot.visitorAccess === 'private'
                  ? 'Esta casa está marcada como privada.'
                  : lot.visitorAccess === 'friends'
                    ? 'Só co-residentes e amigos autorizados podem entrar.'
                    : 'Acesso público: podes bater à porta e cumprimentar.'}
              </p>
              {knock === 'idle' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button variant="ghost" onClick={() => ring('bell')}>Tocar campainha</Button>
                  <Button variant="ghost" onClick={() => ring('knock')}>Bater à porta</Button>
                </div>
              )}
              {knock === 'waiting' && <p className="mt-2 animate-pulse text-xs text-amber-200">A aguardar resposta de {lot.ownerName}…</p>}
              {knock === 'open' && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-emerald-300">{lot.ownerName} abriu a porta: “Entra, fica à vontade!”</p>
                  <Button className="w-full" onClick={() => onEnter(lot.id)}>Entrar como visita</Button>
                </div>
              )}
              {knock === 'denied' && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-rose-300">{lot.ownerName} espreitou e não deixou entrar.</p>
                  <Button variant="ghost" className="w-full" onClick={() => setKnock('idle')}>Tentar outra vez</Button>
                </div>
              )}
              {knock === 'away' && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-slate-400">Ninguém atendeu. Deve estar fora.</p>
                  <Button variant="ghost" className="w-full" onClick={() => setKnock('idle')}>Tentar outra vez</Button>
                </div>
              )}
            </div>
          )}

          {!owned && (
            <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
              <SectionTitle>Vizinhança</SectionTitle>
              <ul className="space-y-1 text-xs text-slate-400">
                <li className="flex items-start gap-1.5"><GameIcon name="road" size={13} className="mt-0.5 shrink-0 text-slate-400" />Acesso pela {lot.id > 100 ? 'Alameda do Xique Park' : lot.z < 0 ? 'Avenida Principal (norte)' : 'Avenida Principal (sul)'}</li>
                <li className="flex items-start gap-1.5"><GameIcon name="school" size={13} className="mt-0.5 shrink-0 text-slate-400" />Escola, padaria e praça a poucos minutos</li>
                <li className="flex items-start gap-1.5"><GameIcon name="tree" size={13} className="mt-0.5 shrink-0 text-slate-400" />Arborização e iluminação pública</li>
              </ul>
              {lot.id <= 100 && (
                <p className="mt-2 text-[10px] text-slate-400">
                  Dica: plantar {CROPS.cenoura.name.toLowerCase()} na fazenda ajuda a pagar o lote.
                </p>
              )}
            </div>
          )}

          {owned && (
            <Button
              variant="ghost"
              className="w-full text-rose-200"
              onClick={() => {
                if (window.confirm(`Vender o lote #${lot.id} por ${money(lot.price * 0.6)}? Os móveis são perdidos.`)) {
                  const r = finance.sellLotToCity(lot.id);
                  gameState.toast(r.message, r.ok ? 'success' : 'warning');
                }
              }}
              icon={<Trash2 size={15} />}
            >
              Vender lote (60%)
            </Button>
          )}
        </div>
      </div>

      {owned && (
        <button
          onClick={() => onEnter(lot.id)}
          className="mt-3 flex w-full items-center justify-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200"
        >
          Abrir editor de interiores <ArrowRight size={13} />
        </button>
      )}
    </Modal>
  );
}
