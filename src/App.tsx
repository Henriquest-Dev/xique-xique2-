import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { AvatarConfig, Landmark } from './types/game';
import { gameState } from './services/gameState';
import { sound } from './services/sound';
import { CAMERA_ORDER, GameEngine, WorldTarget, type CameraMode } from './game/GameEngine';
import { REALMS, realmAt } from './game/realmsData';
import { LANDMARKS } from './game/constants';
import { HUD } from './components/HUD';
import { Toasts } from './components/Toasts';
import { TitleScreen } from './components/TitleScreen';
import { NpcDialogModal } from './components/NpcDialogModal';
import { HomeBar } from './components/HomeBar';
import { TravelOverlay, type TravelJob } from './components/TravelOverlay';
import { npcLife, type GoTarget } from './services/npcLife';
import { BANK_INT } from './game/cityExtras';
import { LotModal } from './components/LotModal';
import { InteriorModal } from './components/InteriorModal';
import { JobModal, JobTab } from './components/JobModal';
import { MarketModal } from './components/MarketModal';
import { BusinessModal } from './components/BusinessModal';
import { NewspaperModal } from './components/NewspaperModal';
import { ElectionModal } from './components/ElectionModal';
import { AvatarModal } from './components/AvatarModal';
import { PhoneModal } from './components/PhoneModal';
import { ConcessionariaModal } from './components/ConcessionariaModal';
import { finance, playerPos, setBuildable } from './finance';
import { MapModal } from './components/MapModal';
import { PlaceModal, PlaceAction } from './components/PlaceModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminModal } from './components/AdminModal';
import { Joystick } from './components/Joystick';
import { GameIcon } from './components/GameIcon';
import { ShoppingModal } from './components/ShoppingModal';
import { PetShopModal } from './components/PetShopModal';
import { liveStore } from './services/liveStore';
import { economy } from './services/economy';
import { ledger } from './data';
import { BankModal } from './components/BankModal';
import { BackpackModal } from './components/BackpackModal';
import { FurnitureShopModal } from './components/FurnitureShopModal';
import { VehicleRentalModal } from './components/VehicleRentalModal';
import { CityHallModal, MetroModal, PowerPlantModal } from './components/CityLifeModals';
import { campaigns } from './services/campaigns';
import { setLedgerCity } from './data';
import { metroOf } from './game/metroData';
import { USINA_ROOM } from './game/usinaInterior';
import { LIFE_REPORT } from './game/cityLife';
import { webglInfo, buildReport } from './services/diagnostics';
import { isTouchDevice } from './components/HUD';
import { VEHICLES, type VehicleDef } from './game/vehicles';
import { PrefeituraModal } from './components/PrefeituraModal';
import { IndustryModal, type IndustryKind } from './components/IndustryModal';

type Phase = 'title' | 'loading' | 'playing';

const LOADING_TIPS = [
  'Dica: a Padaria Central paga por fornada — para o marcador na zona dourada.',
  'Dica: compra sementes no Mercado da Orla e planta na Fazenda do Sul.',
  'Dica: só podes votar se estiveres junto à urna, na Prefeitura.',
  'Dica: clica no chão para caminhar e arrasta para rodar a câmara.',
  'Dica: o Caramelo segue-te para todo o lado. É lei municipal.',
  'Dica: entrega em menos de 2:30 para receber gorjeta.',
];

const REALM_FARE: Record<string, number> = { savana: 40, floresta: 45, deserto: 50, fazendas: 35, veneza: 90 };
const AIR_DESTINATIONS: { name: string; price: number; x: number; z: number; hint: string; img: string; realm?: string }[] = [
  { name: 'Praça do Caramelo', price: 10, x: 0, z: 20, hint: 'O coração da cidade.', img: 'cinematic/praca.jpg' },
  { name: 'Montanhas do Norte', price: 22, x: 150, z: -300, hint: 'Os três morros habitados.', img: 'cinematic/morro.jpg' },
  { name: 'Praia da Marginal', price: 12, x: -470, z: 100, hint: 'Areia, palmeiras e o porto.', img: 'cinematic/praia.jpg' },
  { name: 'Condomínio Chique-Chique', price: 30, x: 560, z: -318, hint: 'Luxo à beira-mar, com portaria.', img: 'travel/condo.jpg' },
  ...REALMS.map((r) => ({ name: r.name, price: REALM_FARE[r.id] ?? 40, x: r.arrive.x, z: r.arrive.z, hint: r.blurb, img: r.img, realm: r.id })),
];

const TRAVEL_MODES = {
  plane: { mult: 1, seconds: 6, img: 'cinematic/aeroporto.jpg', from: 'Aeroporto Internacional', verb: 'Voo' },
  train: { mult: 0.5, seconds: 11, img: 'travel/estacao.jpg', from: 'Estação Ferroviária', verb: 'Comboio' },
  boat: { mult: 0.4, seconds: 14, img: 'travel/porto.jpg', from: 'Porto de Xique-Xique', verb: 'Barco' },
} as const;


export default function App() {
  const [state, forceRender] = useReducer((value: number) => value + 1, 0);
  const [phase, setPhase] = useState<Phase>('title');
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('A preparar a cidade…');
  const [engineError, setEngineError] = useState<string | null>(null);
  const progressLabelRef = useRef('');
  progressLabelRef.current = progressLabel;
  const [nearby, setNearby] = useState<WorldTarget | null>(null);
  const [position, setPosition] = useState({ x: 0, z: 12 });
  const [heading, setHeading] = useState(0);
  const [cameraMode, setCameraMode] = useState<CameraMode>('third');
  const [panel, setPanel] = useState<string | null>(null);
  const [npcDialog, setNpcDialog] = useState<string | null>(null);
  const [travel, setTravel] = useState<TravelJob | null>(null);
  const [homeSel, setHomeSel] = useState<string | null>(null);
  const [homePlacing, setHomePlacing] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const [recording, setRecording] = useState(false);
  const [clean, setClean] = useState(false);
  const [recFile, setRecFile] = useState<{ url: string; name: string; seconds: number } | null>(null);
  const [industry, setIndustry] = useState<IndustryKind | null>(null);
  const [jobTab, setJobTab] = useState<JobTab>('bakery');
  const [toasts, setToasts] = useState(gameState.getToasts());
  const [loadingTip] = useState(() => LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const panelRef = useRef<string | null>(null);
  const routeActivateRef = useRef<(target: WorldTarget) => void>(() => {});
  const positionRef = useRef(position);
  const lastVisitCheck = useRef(0);
  useEffect(() => {
    if (import.meta.env.DEV) {
      const w = window as unknown as { __npc?: (n: string) => void; __place?: (id: string) => void };
      w.__npc = (n) => setNpcDialog(n);
      (window as unknown as { __ledger?: typeof ledger; __panel?: (p: string) => void }).__ledger = ledger;
      (window as unknown as { __panel?: (p: string) => void }).__panel = (p) => setPanel(p);
      w.__place = (id) => { const l = LANDMARKS.find((x) => x.id === id); if (l) { setSelectedLandmark(l); setPanel('place'); } };
    }
  }, []);
  const lastPositionPush = useRef(0);

  const st = gameState.getState();
  const savedName = st.playerName;
  const hasSave = Boolean(localStorage.getItem('xiquexique2_save_v3') || localStorage.getItem('xiquexique2_save_v1'));

  useEffect(() => {
    const unsubscribeState = gameState.subscribe(() => {
      setToasts(gameState.getToasts());
      forceRender();
    });
    return unsubscribeState;
  }, []);

  useEffect(() => {
    panelRef.current = panel;
    engineRef.current?.setPaused(panel !== null || travel !== null);
  }, [panel, travel]);

  useEffect(() => {
    engineRef.current?.applySettings(st.settings);
    engineRef.current?.setAmbient(st.settings.ambient);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.settings.ambient, st.settings.showTags, st.settings.highQuality]);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const routeActivate = useCallback((target: WorldTarget) => {
    if (panelRef.current) return;
    sound.playClick();

    if (target.kind === 'lot' && target.lotId) {
      setSelectedLotId(target.lotId);
      setPanel('lot');
      return;
    }

    if (target.kind === 'farm') {
      setJobTab('farm');
      setPanel('jobs');
      return;
    }

    if (target.kind === 'npc' && target.npcId) {
      if (npcLife.role(target.title)) {
        setNpcDialog(target.title);
        return;
      }
      const lines = [
        'Bom dia! A cidade está bonita hoje, não está?',
        'Se passares na padaria, traz um pão quente.',
        'A eleição está a mexer com a praça toda.',
        'Cuidado com a velocidade na marginal, a multa é pesada.',
        'Já viste o Xique Park? Aqueles lotes são um sonho.',
      ];
      gameState.addChatMessage(target.title, target.npcId, lines[Math.floor(Math.random() * lines.length)]);
      setPanel('phone');
      return;
    }

    if (target.kind === 'box' && target.boxId) {
      const r = liveStore.claimWorldBox(target.boxId);
      if (r) {
        gameState.toast(
          r.kind === 'coins' ? `Mystery Box: +X$ ${r.amount}!` : r.duplicate ? `Mystery Box: ${r.pet.name} repetido (+X$ ${r.refund})` : `NOVO PET: ${r.pet.name} (${r.pet.rarity})!`,
          'reward',
        );
      }
      return;
    }

    if (target.kind === 'landmark' && target.landmarkId?.startsWith('int:')) {
      if (target.landmarkId === 'int:casa_sair') {
        engineRef.current?.exitHome();
        gameState.toast('Saíste de casa.', 'info');
      } else if (target.landmarkId === 'int:realm_sair') {
        const here = realmAt(position.x, position.z);
        setTravel({
          mode: here?.id === 'veneza' ? 'boat' : 'plane',
          from: here?.name ?? 'Bioma',
          to: 'Praça do Caramelo',
          fromImg: here?.img ?? 'cinematic/aeroporto.jpg',
          toImg: 'cinematic/praca.jpg',
          seconds: 5,
          onMid: () => handleTravel(0, 20),
          onDone: () => {
            setTravel(null);
            gameState.toast('De volta à cidade.', 'success');
          },
        });
      } else if (target.landmarkId === 'int:doca') {
        const l = LANDMARKS.find((x) => x.id === 'porto');
        if (l) { setSelectedLandmark(l); setPanel('place'); }
      } else if (target.landmarkId === 'int:usina') {
        engineRef.current?.teleport(USINA_ROOM.cx + 12, USINA_ROOM.cz + 15, true);
        gameState.toast('Entraste na Usina Nuclear. Caminha e observa o reator.', 'info');
      } else if (target.landmarkId === 'int:concessionaria') {
        setPanel('concessionaria');
      } else if (target.landmarkId === 'int:usina_painel') {
        setPanel('usina');
      } else if (target.landmarkId === 'int:usina_sair') {
        const e = (window as unknown as { __lifeExit?: { x: number; z: number } }).__lifeExit ?? LIFE_REPORT.usinaEntrance as { x: number; z: number } | undefined;
        if (e) engineRef.current?.teleport(e.x, e.z, true);
      } else if (target.landmarkId.startsWith('int:outdoor:')) {
        const slot = target.landmarkId.slice('int:outdoor:'.length);
        setHallCity(slot.split(':')[1] ?? 'cidade');
        setHallSlot(slot);
        setHallTab('ads');
        setPanel('cityhall');
      } else if (target.landmarkId.startsWith('int:prefeitura:')) {
        setHallCity(target.landmarkId.split(':')[2] ?? 'cidade');
        setHallSlot(null);
        setHallTab('eleicao');
        setPanel('cityhall');
      } else if (target.landmarkId.startsWith('int:metro_in:')) {
        const [, , city, st] = target.landmarkId.split(':');
        metroEntry.current = { city, station: st };
        const room = metroOf(city).room;
        engineRef.current?.teleport(room.cx - 14, room.cz + 4, true);
        gameState.toast('Desceste para a plataforma do metro.', 'info');
      } else if (target.landmarkId.startsWith('int:metro_plat:')) {
        const city = target.landmarkId.split(':')[2];
        setMetroCity(city);
        setPanel('metro');
      } else if (target.landmarkId.startsWith('int:metro_sair:')) {
        const city = target.landmarkId.split(':')[2];
        leaveMetro(city);
      } else if (target.landmarkId === 'int:banco_sair') {
        engineRef.current?.teleport(-30, -33, true);
        gameState.toast('Saíste do Banco Xique.', 'info');
      } else setPanel('bank');
      return;
    }

    if (target.kind === 'landmark' && target.landmarkId) {
      const landmark = LANDMARKS.find((item) => item.id === target.landmarkId);
      if (!landmark) return;

      switch (landmark.id) {
        case 'padaria':
          setJobTab('bakery');
          setPanel('jobs');
          return;
        case 'prefeitura':
          setPanel('prefeitura');
          return;
        case 'banco':
          engineRef.current?.teleport(BANK_INT.cx, BANK_INT.cz + 8, true);
          gameState.toast('Entraste no Banco Xique. Fala com os caixas no balcão.', 'info');
          return;
        case 'serraria':
        case 'pedreira':
        case 'fabrica':
          setIndustry(landmark.id as IndustryKind);
          setPanel('industry');
          return;
        case 'shopping':
          setPanel('shopping');
          return;
        case 'loja_pets':
          setPanel('petshop');
          return;
        case 'loja_centro':
          setSelectedLandmark(landmark);
          setPanel('place');
          return;
        case 'mercado_orla':
        case 'loja_oeste':
          setPanel('market');
          return;
        case 'lagoa':
          setJobTab('fishing');
          setPanel('jobs');
          return;
        case 'fazendas':
          setJobTab('farm');
          setPanel('jobs');
          return;
        case 'xique_park': {
          const available = gameState.getState().lots.find((lot) => lot.id > 100 && !lot.ownerId);
          if (available) {
            setSelectedLotId(available.id);
            setPanel('lot');
          } else {
            setSelectedLandmark(landmark);
            setPanel('place');
          }
          return;
        }
        default:
          setSelectedLandmark(landmark);
          setPanel('place');
      }
    }
  }, []);

  routeActivateRef.current = routeActivate;

  useEffect(() => {
    if (!started || !containerRef.current) return;

    const engine = new GameEngine(containerRef.current, {
      onProgress: (percent, label) => {
        setProgress(percent);
        setProgressLabel(label);
      },
      onReady: () => {
        setPhase('playing');
        engine.setPaused(panelRef.current !== null);
        engine.setAmbient(gameState.getState().settings.ambient);
        setProgress(100);
        const home = gameState.ownedLots()[0];
        engine.teleport(home ? home.doorPos[0] : 0, home ? home.doorPos[2] : 12, true);
        gameState.toast('Bem-vindo a Xique-Xique! Segue as missões no canto superior esquerdo.', 'info');
      },
      onNearby: (target) => setNearby(target),
      onHomeSelect: (id) => setHomeSel(id),
      onHomePlacing: (v) => setHomePlacing(v),
      onActivate: (target) => routeActivateRef.current(target),
      onPosition: (x, z, h) => {
        positionRef.current = { x, z };
        playerPos.x = x; playerPos.z = z;
        setHeading(h);
        if (performance.now() - lastVisitCheck.current > 1000) { lastVisitCheck.current = performance.now(); npcLife.markVisit(x, z); }
        const now = performance.now();
        if (now - lastPositionPush.current > 200) {
          lastPositionPush.current = now;
          setPosition({ x, z });
        }
      },
      onDrive: (meters, vehicleId) => {
        if (vehicleId !== 'campaign') return;
        const here = realmAt(positionRef.current.x, positionRef.current.z);
        campaigns.drive(here?.id ?? 'cidade', meters);
      },
      onCameraModeChange: (mode) => setCameraMode(mode),
      onError: (message) => {
        setEngineError(message);
      },
    });
    setBuildable((x, z) => engine.isBuildable(x, z));
    // se ficar preso a carregar, mostra onde parou em vez de ficar parado para sempre
    const watchdog = window.setTimeout(() => {
      if (!engine.isReady()) setEngineError(`O carregamento ficou preso em: "${progressLabelRef.current}"`);
    }, 60000);

    engineRef.current = engine;
    void engine.init();

    return () => {
      window.clearTimeout(watchdog);
      engine.dispose();
      if (engineRef.current === engine) engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  const startGame = (name: string, handle: string, avatar: AvatarConfig, useSave: boolean) => {
    sound.init();
    if (!useSave) {
      gameState.setPlayerName(name);
      gameState.setPlayerHandle(handle);
      gameState.setAvatar(avatar);
    } else if (name) {
      gameState.setPlayerName(name);
    }
    setPhase('loading');
    setStarted(true);
    setProgress(1);
    setProgressLabel('A acordar a cidade…');
  };

  const openPanel = (next: string) => {
    sound.playClick();
    setPanel(next);
  };

  const closePanel = () => {
    if (panel === 'interior') {
      gameState.exitHouse();
    }
    setPanel(null);
  };

  const openInterior = (lotId: number) => {
    const lot = gameState.getLot(lotId);
    setSelectedLotId(lotId);
    setPanel(null);
    if (lot) void engineRef.current?.enterHome(lot);
  };

  const [hallCity, setHallCity] = useState('cidade');
  const [hallSlot, setHallSlot] = useState<string | null>(null);
  const [hallTab, setHallTab] = useState<'eleicao' | 'campanha' | 'ads' | 'ranking'>('eleicao');
  const [metroCity, setMetroCity] = useState('cidade');
  const metroEntry = useRef<{ city: string; station: string } | null>(null);
  const leaveMetro = (city: string) => {
    const line = metroOf(city);
    const st = line.stations.find((s) => s.id === metroEntry.current?.station) ?? line.stations[0];
    engineRef.current?.teleport(st.x, st.z + 4.2, true);
    gameState.toast(`Subiste em ${st.name}.`, 'info');
  };
  const rentVehicle = (v: VehicleDef) => {
    if (!gameState.spendMoney(v.price, `Aluguer: ${v.name}`)) { gameState.toast('Saldo insuficiente.', 'warning'); return; }
    void engineRef.current?.setVehicle(v.id);
    closePanel();
    gameState.toast(`${v.name} alugado por ${v.minutes} minutos. Tecla V para devolver.`, 'success');
    window.clearTimeout(rentTimer.current);
    rentTimer.current = window.setTimeout(() => { if (engineRef.current?.vehicleId === v.id) { void engineRef.current.setVehicle(null); gameState.toast(`O tempo do ${v.name} acabou.`, 'info'); } }, v.minutes * 60000);
  };

  const handleTravel = (x: number, z: number) => {
    engineRef.current?.teleport(x, z, true);
    setPosition({ x, z });
  };

  const selectedLot = selectedLotId != null ? st.lots.find((lot) => lot.id === selectedLotId) ?? null : null;
  const prefeitura = LANDMARKS.find((landmark) => landmark.id === 'prefeitura')!;
  const canVote = Math.hypot(position.x - prefeitura.x, position.z - prefeitura.z) < 24;
  void state;

  const playCooldown = useRef(0);
  const rentTimer = useRef(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      campaigns.tick(2);
      const here = realmAt(positionRef.current.x, positionRef.current.z);
      setLedgerCity(here?.id ?? 'cidade');
      const mine = campaigns.mine(here?.id ?? 'cidade')[0];
      engineRef.current?.setFollowers(mine ? mine.followers : 0, mine?.color ?? '#e11d48');
    }, 2000);
    return () => window.clearInterval(id);
  }, []);
  const work = (label: string, hint: string, pay: number, desc: string): PlaceAction[] => [
    {
      label,
      hint,
      onClick: () => {
        gameState.addMoney(pay, desc);
        gameState.toast(`${desc}: +X$ ${pay}`, 'success');
        closePanel();
      },
    },
  ];

  const placeActions = (landmark: Landmark): PlaceAction[] => {
    switch (landmark.id) {
      case 'loja_centro':
      case 'loja_oeste':
        return landmark.id === 'loja_centro'
          ? [
              { label: 'Mercearia e sementes', hint: 'Sementes, iscas e mercearia.', onClick: () => setPanel('market') },
              { label: 'Loja de Móveis', hint: 'Compra móveis para a mochila e coloca-os em casa.', onClick: () => setPanel('moveis') },
            ]
          : [{ label: 'Entrar na loja', hint: 'Sementes, iscas e mercearia.', onClick: () => setPanel('market') }];
      case 'aeroporto':
      case 'estacao_ferroviaria_viagem':
      case 'estacao_ferroviaria':
      case 'porto': {
        const mode = landmark.id === 'aeroporto' ? 'plane' : landmark.id === 'porto' ? 'boat' : 'train';
        const m = TRAVEL_MODES[mode];
        return AIR_DESTINATIONS.filter((d) => mode !== 'train' || !d.realm).map((d) => {
          const price = Math.max(4, Math.round(d.price * m.mult));
          const realm = d.realm ? REALMS.find((r) => r.id === d.realm) : undefined;
          if (realm?.closed && !economy.hasResidency(realm.id)) {
            const fee = realm.residencyFee ?? 1500;
            return {
              label: `${d.name} · Residência X$ ${fee}`,
              hint: 'Cidade fechada: sem turismo. Só entra quem compra residência (paga à Prefeitura).',
              onClick: () => {
                if (economy.buyResidency(realm.id, realm.name, fee)) {
                  gameState.toast(`Residência de ${realm.name} concedida. Já podes viajar.`, 'success');
                  closePanel();
                } else gameState.toast('Saldo insuficiente para a residência.', 'warning');
              },
            };
          }
          return {
            label: `${d.name} · X$ ${price}`,
            hint: `${m.verb} de ${m.seconds}s. ${d.hint}`,
            onClick: () => {
              if (!gameState.spendMoney(price, `${m.verb}: ${d.name}`)) {
                gameState.toast('Saldo insuficiente para a passagem.', 'warning');
                return;
              }
              closePanel();
              setTravel({
                mode,
                from: m.from,
                to: d.name,
                fromImg: m.img,
                toImg: d.img,
                seconds: m.seconds,
                onMid: () => handleTravel(d.x, d.z),
                onDone: () => {
                  setTravel(null);
                  gameState.toast(`Chegaste a ${d.name}.`, 'success');
                },
              });
            },
          };
        });
      }
      case 'parque_oeste':
      case 'parque_leste':
      case 'parque_norte':
        return [
          {
            label: 'Brincar no parquinho',
            hint: 'Baloiço, escorrega e carrossel. Ganhas X$ 8 (1 vez por minuto).',
            onClick: () => {
              const now = Date.now();
              if (now - playCooldown.current < 60000) gameState.toast('Estás cansado! Espera um minuto.', 'info');
              else {
                playCooldown.current = now;
                gameState.addMoney(8, 'Brincar no parquinho');
                gameState.toast('Que divertido! +X$ 8', 'success');
              }
              closePanel();
            },
          },
        ];
      case 'discoteca':
        return [
          {
            label: 'Entrar e dançar · X$ 15',
            hint: 'Música, luzes neon e muita gente.',
            onClick: () => {
              if (gameState.spendMoney(15, 'Entrada na discoteca')) {
                handleTravel(135, 70);
                gameState.toast('Estás na pista! Luzes neon acendem à noite.', 'success');
                closePanel();
              } else gameState.toast('Saldo insuficiente.', 'warning');
            },
          },
        ];
        return [{ label: 'Passeio de barco · X$ 20', hint: 'Navega pela baía.', onClick: () => { if (gameState.spendMoney(20, 'Passeio de barco')) { gameState.toast('Boa viagem pela baía!', 'success'); closePanel(); } } }];
      case 'chique_chique':
        return [{ label: 'Ir ao Condomínio Chique-Chique', hint: 'Lotes de luxo e moradores.', onClick: () => { handleTravel(560, -318); closePanel(); } }];
      case 'hospital':
        return [
          {
            label: 'Tratamento no pronto-socorro',
            hint: 'Cura ferimentos e recupera o cidadão por X$ 40.',
            onClick: () => {
              if (gameState.spendMoney(40, 'Tratamento no Hospital Regional')) {
                gameState.toast('Tratado e pronto para voltar à rua.', 'success');
                closePanel();
              } else {
                gameState.toast('Saldo insuficiente para o tratamento.', 'warning');
              }
            },
          },
        ];
      case 'estadio':
        return [
          {
            label: 'Assistir a um jogo amigável',
            hint: 'Entrada gratuita para cidadãos.',
            onClick: () => {
              gameState.toast('O Estádio Municipal está cheio. O Zé da Manga marcou um golo!', 'info');
              closePanel();
            },
          },
        ];
      case 'estacao_ferroviaria':
        return [
          {
            label: 'Bilhete turístico no comboio',
            hint: 'X$ 10 · passeio pela linha férrea.',
            onClick: () => {
              if (gameState.spendMoney(10, 'Bilhete turístico do comboio')) {
                gameState.toast('Bilhete comprado. O comboio passa a cada minuto na plataforma.', 'success');
                closePanel();
              }
            },
          },
        ];
      case 'mirante':
        return [
          {
            label: 'Apreciar a vista da baía',
            hint: 'Um dos melhores pores do sol da cidade.',
            onClick: () => {
              gameState.setTimeOfDay(18.2);
              gameState.toast('O sol desce sobre os três morros. Vale a pena.', 'info');
              closePanel();
            },
          },
        ];
      case 'praca_caramelo':
        return [
          {
            label: 'Descansar junto à fonte',
            hint: 'Recupera o fôlego e ouve o caramelo latir.',
            onClick: () => {
              gameState.toast('Sentaste-te na fonte. O Caramelo abanou a cauda.', 'info');
              closePanel();
            },
          },
          {
            label: 'Ir votar na Prefeitura',
            hint: canVote ? 'A urna está por perto.' : 'A Prefeitura fica a oeste da praça.',
            onClick: () => {
              setPanel('election');
            },
          },
        ];
      case 'lagoa':
        return [
          {
            label: 'Pescar na lagoa',
            hint: 'Gasta 1 isca por tentativa.',
            onClick: () => {
              setJobTab('fishing');
              setPanel('jobs');
            },
          },
        ];
      case 'fazendas':
        return [
          {
            label: 'Trabalhar nos canteiros',
            hint: 'Plantar, esperar e colher.',
            onClick: () => {
              setJobTab('farm');
              setPanel('jobs');
            },
          },
        ];
      case 'mercado_orla':
        return [
          {
            label: 'Entrar no mercado',
            hint: 'Sementes, iscas e mercearia.',
            onClick: () => setPanel('market'),
          },
        ];
      case 'prefeitura':
        return [
          {
            label: 'Votar na eleição municipal',
            hint: canVote ? 'A urna está ao teu lado.' : 'Aproxima-te da Prefeitura para votar.',
            onClick: () => setPanel('election'),
          },
        ];
      default:
        return [];
    }
  };

  if (phase === 'title') {
    return <TitleScreen hasSave={hasSave} savedName={savedName} savedHandle={st.playerHandle} onStart={startGame} />;
  }

  // Formato do palco: o jogo ocupa 9:16, 16:9 ou todo o ecrã, sempre centrado.
  const aspect = st.settings.aspect ?? 'auto';
  const stageStyle: React.CSSProperties =
    aspect === 'portrait'
      ? { width: 'min(100vw, calc(100dvh * 9 / 16))', height: 'min(100dvh, calc(100vw * 16 / 9))' }
      : aspect === 'landscape'
      ? { width: 'min(100vw, calc(100dvh * 16 / 9))', height: 'min(100dvh, calc(100vw * 9 / 16))' }
      : { width: '100%', height: '100%' };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <div className="relative overflow-hidden bg-[#07131f]" style={stageStyle}>
      <div ref={containerRef} className="absolute inset-0" />

      {engineError && (
        <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-[#04101a] px-6 text-center">
          <h1 className="font-display text-xl font-extrabold text-white">O motor 3D não arrancou</h1>
          <p className="mt-3 max-w-md break-words rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">{engineError}</p>
          <p className="mt-3 max-w-md text-xs text-slate-400">Placa gráfica: {webglInfo()}</p>
          <div className="mt-5 flex w-full max-w-xs flex-col gap-2">
            <button className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-extrabold text-slate-900" onClick={() => { try { localStorage.setItem('xx_lite', '1'); } catch { /* */ } location.reload(); }}>Tentar modo leve</button>
            <button className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white" onClick={() => location.reload()}>Tentar de novo</button>
            <button className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white" onClick={() => { void navigator.clipboard?.writeText(buildReport()); }}>Copiar relatório do erro</button>
          </div>
        </div>
      )}

      {phase === 'loading' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#04101a]/92 px-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 text-amber-300">
            <GameIcon name="city" size={32} />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">Xique-Xique 2</h1>
          <p className="mt-1 text-sm text-slate-400">{progressLabel}</p>
          <div className="mt-5 h-2 w-full max-w-sm overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-4 max-w-md text-xs leading-relaxed text-slate-500">{loadingTip}</p>
          <div className="mt-6 flex items-center gap-2 text-[11px] text-slate-600">
            <Loader2 size={13} className="animate-spin" /> A carregar modelos Kenney e a construir a cidade
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <>
          <HUD
            state={st}
            nearby={nearby}
            position={position}
            heading={heading}
            cameraMode={cameraMode}
            onOpen={openPanel}
            onActivate={() => nearby && routeActivate(nearby)}
            recording={recording}
            clean={clean}
            onClean={() => setClean((v) => !v)}
            onRecord={async () => {
              const eng = engineRef.current;
              if (!eng) return;
              if (recording) {
                const f = await eng.stopRecording();
                setRecording(false);
                if (f) setRecFile(f);
              } else if (eng.startRecording()) {
                setRecording(true);
                setClean(true);
                gameState.toast('A gravar! Toca em “Mostrar interface” e no botão REC para parar.', 'info');
              } else gameState.toast('O teu navegador não suporta gravação.', 'warning');
            }}
            onCameraMode={(next) => {
              setCameraMode(next);
              engineRef.current?.setCameraMode(next);
              sound.playClick();
            }}
          />

          <div className={`absolute bottom-3 right-3 z-20 ${isTouchDevice() ? '' : 'md:hidden'}`}>
            <Joystick onChange={(x, y) => engineRef.current?.setMoveInput(x, y)} />
          </div>

          <LotModal lot={panel === 'lot' ? selectedLot : null} onClose={() => setPanel(null)} onEnter={openInterior} />

          <InteriorModal lot={panel === 'interior' ? selectedLot : null} onClose={closePanel} />

          <JobModal
            open={panel === 'jobs'}
            tab={jobTab}
            onTab={setJobTab}
            onClose={closePanel}
            position={position}
          />

          <MarketModal open={panel === 'market'} onClose={closePanel} />

          <ShoppingModal open={panel === 'shopping'} onClose={closePanel} />

          <PetShopModal open={panel === 'petshop'} onClose={closePanel} />

          <BankModal open={panel === 'bank'} onClose={closePanel} />

          <BackpackModal open={panel === 'backpack'} onClose={closePanel} />
          <FurnitureShopModal open={panel === 'moveis'} onClose={closePanel} />
          <ConcessionariaModal open={panel === 'concessionaria'} onClose={closePanel} onDrive={(vid) => { void engineRef.current?.setVehicle(vid); closePanel(); gameState.toast('A conduzir o teu carro. Tecla V para guardar.', 'success'); }} />
          <VehicleRentalModal
            open={panel === 'vehicles'}
            onClose={closePanel}
            mountedId={engineRef.current?.vehicleId ?? null}
            onReturn={() => { void engineRef.current?.setVehicle(null); gameState.toast('Veículo devolvido.', 'info'); closePanel(); }}
            onRent={rentVehicle}
          />

          <CityHallModal open={panel === 'cityhall'} onClose={closePanel} city={hallCity} initialTab={hallTab} focusSlot={hallSlot} onRentCar={() => rentVehicle(VEHICLES.find((x) => x.id === 'campaign')!)} />
          <PowerPlantModal open={panel === 'usina'} onClose={closePanel} />
          <MetroModal
            open={panel === 'metro'}
            onClose={closePanel}
            city={metroCity}
            here={metroEntry.current?.station ?? null}
            onLeave={() => { closePanel(); leaveMetro(metroCity); }}
            onRide={(stationId) => {
              const line = metroOf(metroCity);
              const st = line.stations.find((s) => s.id === stationId);
              const from = line.stations.find((s) => s.id === metroEntry.current?.station);
              if (!st || !gameState.spendMoney(6, `Metro: ${st.name}`)) { gameState.toast('Saldo insuficiente para o bilhete.', 'warning'); return; }
              closePanel();
              setTravel({
                mode: 'train', from: from?.name ?? line.name, to: st.name, fromImg: 'travel/metro.jpg', toImg: 'travel/metro.jpg', seconds: 5,
                onMid: () => { metroEntry.current = { city: metroCity, station: stationId }; leaveMetro(metroCity); },
                onDone: () => setTravel(null),
              });
            }}
          />
          <PrefeituraModal open={panel === 'prefeitura'} onClose={closePanel} onCampaigns={() => { setHallCity('cidade'); setHallSlot(null); setHallTab('eleicao'); setPanel('cityhall'); }} onVote={() => setPanel('election')} onLot={(id) => { setSelectedLotId(id); setPanel('lot'); }} />

          <IndustryModal kind={panel === 'industry' ? industry : null} onClose={() => { setIndustry(null); setPanel(null); }} />

          <BusinessModal open={panel === 'business'} onClose={closePanel} />

          <NewspaperModal open={panel === 'newspaper'} onClose={closePanel} />

          <ElectionModal open={panel === 'election'} onClose={closePanel} canVote={canVote} />

          <AvatarModal open={panel === 'avatar'} onClose={closePanel} />

          {st.isInsideHouse && <HomeBar engine={engineRef.current} lot={st.currentHouseId != null ? st.lots.find((l) => l.id === st.currentHouseId) ?? null : null} selected={homeSel} placing={homePlacing} wallet={st.wallet} />}
          <TravelOverlay job={travel} />
          <NpcDialogModal
            npcName={npcDialog}
            onClose={() => setNpcDialog(null)}
            onGo={(to: GoTarget) => {
              setNpcDialog(null);
              if (to.startsWith('jobs:')) { setJobTab(to.slice(5) as JobTab); setPanel('jobs'); return; }
              if (to.startsWith('industry:')) { setIndustry(to.slice(9) as IndustryKind); setPanel('industry'); return; }
              if (to === 'quad') { setPanel('vehicles'); return; }
              if (to === 'usina') { setPanel('usina'); return; }
              if (to.startsWith('cityhall:')) { setHallCity(to.slice(9)); setHallSlot(null); setHallTab('eleicao'); setPanel('cityhall'); return; }
              if (to === 'station' || to === 'port') { const l = LANDMARKS.find((x) => x.id === (to === 'station' ? 'estacao_ferroviaria' : 'porto')); if (l) { setSelectedLandmark(l); setPanel('place'); } return; }
              if (to === 'airport') { const l = LANDMARKS.find((x) => x.id === 'aeroporto'); if (l) { setSelectedLandmark(l); setPanel('place'); } return; }
              setPanel(to);
            }}
          />
          <PhoneModal open={panel === 'phone'} onClose={closePanel} onOpenApp={(p) => { if (p === 'mark') { const r = finance.markStake(playerPos.x, playerPos.z); gameState.toast(r.message, r.ok ? 'success' : 'warning'); closePanel(); } else setPanel(p); }} />

          <MapModal open={panel === 'map'} onClose={closePanel} position={position} onTravel={handleTravel} onGoto={(x, z) => { closePanel(); engineRef.current?.teleport(x, z + 2, true); }} />

          <PlaceModal
            landmark={panel === 'place' ? selectedLandmark : null}
            onClose={() => setPanel(null)}
            actions={selectedLandmark ? placeActions(selectedLandmark) : []}
          />

          <SettingsModal
            open={panel === 'pause' || panel === 'settings'}
            onClose={closePanel}
            onResume={closePanel}
            onOpenAdmin={() => { if (import.meta.env.DEV) setPanel('admin'); }}
          />

          <AdminModal open={panel === 'admin'} onClose={closePanel} onTeleport={handleTravel} />

          {recFile && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="glass w-full max-w-md rounded-3xl p-5 text-center">
                <p className="font-display text-xl font-extrabold text-white">Gravação pronta ({recFile.seconds}s)</p>
                <video src={recFile.url} controls className="mt-3 w-full rounded-xl" />
                <div className="mt-3 flex gap-2">
                  <a href={recFile.url} download={recFile.name} className="flex-1 rounded-2xl bg-gradient-to-r from-amber-300 to-orange-500 px-4 py-3 font-extrabold text-[#2a1604]">Descarregar</a>
                  <button onClick={() => setRecFile(null)} className="rounded-2xl bg-white/10 px-4 py-3 font-bold text-white">Fechar</button>
                </div>
              </div>
            </div>
          )}

          <Toasts toasts={toasts} onDismiss={(id) => gameState.dismissToast(id)} />

          <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-1 text-[10px] text-slate-600 md:flex">
            <Sparkles size={11} /> Xique-Xique 2 · reconstrução completa
          </div>
        </>
      )}
      </div>
    </div>
  );
}
