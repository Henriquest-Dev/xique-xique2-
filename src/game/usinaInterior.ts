// Interior andável da Usina Nuclear: reator em vidro, circuitos com fluxo animado,
// sala de turbinas e sala de controlo com painel de dados ao vivo.
import * as THREE from 'three';
import { createTextSprite } from './labels';
import { ENERGY } from './cityLife';
import type { Collider } from './world';
import type { WalkSurface, Portal } from './cityExtras';

export const USINA_ROOM = { cx: -606, cz: 100, y: 60, w: 48, d: 40 };

interface Ctx {
  group: THREE.Group;
  colliders: Collider[];
  surfaces: WalkSurface[];
  portals: Portal[];
  animated: Array<(dt: number, night: number, t: number) => void>;
}

const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, ...extra });

export function buildUsinaInterior(ctx: Ctx) {
  const { group, colliders, surfaces, portals, animated } = ctx;
  const { cx, cz, y, w, d } = USINA_ROOM;
  const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
  const root = new THREE.Group();
  group.add(root);
  const box = (bw: number, bh: number, bd: number, color: string, x: number, yy: number, z: number, emissive?: string) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), emissive ? new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 1.2 }) : mat(color));
    m.position.set(x, yy, z);
    m.castShadow = true; m.receiveShadow = true;
    root.add(m);
    return m;
  };
  const wall = (bw: number, bd: number, x: number, z: number, c = '#cbd5e1', h = 12) => {
    box(bw, h, bd, c, x, y + h / 2, z);
    colliders.push({ minX: x - bw / 2, maxX: x + bw / 2, minZ: z - bd / 2, maxZ: z + bd / 2, tag: 'static' });
  };
  const sign = (text: string, x: number, yy: number, z: number, scale = 0.014) => {
    const l = createTextSprite(text, { scale, fontSize: 40 });
    l.position.set(x, yy, z);
    l.userData.isLabel = true;
    root.add(l);
  };

  // piso e envolvente
  surfaces.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, y });
  box(w, 0.8, d, '#475569', cx, y - 0.4, cz);
  box(w, 0.1, d, '#94a3b8', cx, y + 0.02, cz);
  wall(w + 1, 1, cx, z0 - 0.5, '#e2e8f0');
  wall(w + 1, 1, cx, z1 + 0.5, '#e2e8f0');
  wall(1, d, x0 - 0.5, cz, '#e2e8f0');
  wall(1, d, x1 + 0.5, cz, '#e2e8f0');
  box(w + 2, 0.8, d + 2, '#1e293b', cx, y + 12.4, cz);
  for (let i = 0; i < 6; i++) { const l = box(5, 0.2, 1.4, '#fffbe6', x0 + 6 + i * 7.2, y + 11.9, cz, '#fff4c2'); l.castShadow = false; }
  const light = (lx: number, lz: number, c = '#fff4d6', i = 55) => { const pl = new THREE.PointLight(c, i, 34, 1.4); pl.position.set(lx, y + 8, lz); root.add(pl); };
  light(cx - 14, cz); light(cx + 12, cz); light(cx, cz - 10, '#bfe6ff', 35);
  // faixas de segurança no chão (caminho dos visitantes)
  box(w - 4, 0.04, 0.3, '#facc15', cx, y + 0.07, z1 - 8);
  box(0.3, 0.04, d - 6, '#facc15', cx - 8, y + 0.07, cz);

  // ---------- 1. REATOR (esquerda): cilindro de vidro com núcleo e barras de controlo
  const rx = cx - 14, rz = cz - 3;
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.5, 28), mat('#334155'));
  pool.position.set(rx, y + 0.3, rz); root.add(pool);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 7.5, 28, 1, true), new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0ea5e9', emissiveIntensity: 0.9, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false }));
  water.position.set(rx, y + 4.2, rz); root.add(water);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 9, 28, 1, true), new THREE.MeshStandardMaterial({ color: '#bae6fd', transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, roughness: 0.05 }));
  glass.position.set(rx, y + 5, rz); root.add(glass);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 4.6, 20), new THREE.MeshStandardMaterial({ color: '#4ade80', emissive: '#22c55e', emissiveIntensity: 1.6 }));
  core.position.set(rx, y + 3.2, rz); root.add(core);
  const rods: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5.6, 8), mat('#f8fafc'));
    rod.position.set(rx + Math.cos(a) * 1.3, y + 6.4, rz + Math.sin(a) * 1.3);
    root.add(rod); rods.push(rod);
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 0.7, 28), mat('#64748b'));
  cap.position.set(rx, y + 9.6, rz); root.add(cap);
  colliders.push({ minX: rx - 5.3, maxX: rx + 5.3, minZ: rz - 5.3, maxZ: rz + 5.3, tag: 'static' });
  // grade à volta
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 6), mat('#facc15'));
    post.position.set(rx + Math.cos(a) * 6.4, y + 0.6, rz + Math.sin(a) * 6.4); root.add(post);
  }
  sign('1 · Reator: a fissão aquece a água', rx, y + 11.2, rz + 0.5);

  // ---------- 2. GERADOR DE VAPOR (centro)
  const gx = cx + 1, gz = cz - 8;
  const gen = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 8, 20), mat('#94a3b8', { metalness: 0.5 }));
  gen.position.set(gx, y + 4.2, gz); gen.castShadow = true; root.add(gen);
  const gdome = new THREE.Mesh(new THREE.SphereGeometry(2.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#94a3b8', { metalness: 0.5 }));
  gdome.position.set(gx, y + 8.2, gz); root.add(gdome);
  colliders.push({ minX: gx - 3, maxX: gx + 3, minZ: gz - 3, maxZ: gz + 3, tag: 'static' });
  sign('2 · Gerador de vapor', gx, y + 11.2, gz);

  // ---------- 3. TURBINA (direita): carcaça, veio a girar, alternador
  const tx = cx + 14, tz = cz - 6;
  box(14, 3.6, 4.6, '#64748b', tx, y + 2.4, tz);
  colliders.push({ minX: tx - 7.2, maxX: tx + 7.2, minZ: tz - 2.5, maxZ: tz + 2.5, tag: 'static' });
  const shaft = new THREE.Group();
  shaft.position.set(tx, y + 4.5, tz);
  for (let i = 0; i < 6; i++) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.3 + i * 0.12, 1.3 + i * 0.12, 0.22, 24), mat('#e2e8f0', { metalness: 0.7 }));
    disc.rotation.z = Math.PI / 2; disc.position.x = -5 + i * 1.5; shaft.add(disc);
    for (let b = 0; b < 8; b++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.2), mat('#cbd5e1'));
      const a = (b / 8) * Math.PI * 2;
      fin.position.set(-5 + i * 1.5, Math.sin(a) * (1.5 + i * 0.12), Math.cos(a) * (1.5 + i * 0.12)); fin.rotation.x = -a; shaft.add(fin);
    }
  }
  root.add(shaft);
  const alt = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 4, 20), mat('#1d4ed8', { metalness: 0.4 }));
  alt.rotation.z = Math.PI / 2; alt.position.set(tx + 7.8, y + 4.5, tz); root.add(alt);
  colliders.push({ minX: tx + 5.8, maxX: tx + 10, minZ: tz - 2.2, maxZ: tz + 2.2, tag: 'static' });
  sign('3 · Turbina e alternador', tx + 2, y + 8.4, tz);

  // transformador + torre da rede
  box(3.5, 4, 3.5, '#475569', x1 - 4, y + 2.2, cz - 14);
  colliders.push({ minX: x1 - 6, maxX: x1 - 2, minZ: cz - 16, maxZ: cz - 12, tag: 'static' });
  sign('4 · Rede: energia para as cidades', x1 - 6, y + 6.4, cz - 14);

  // ---------- Tubagens com fluxo animado (esferas a correr no trajecto)
  const flows: { path: THREE.Vector3[]; color: string; n: number; spheres: THREE.Mesh[]; speed: number }[] = [];
  const pipe = (pts: [number, number, number][], color: string, speed: number, n: number) => {
    const path = pts.map(([px, py, pz]) => new THREE.Vector3(px, y + py, pz));
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const len = a.distanceTo(b);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, len, 10), mat('#64748b', { metalness: 0.6 }));
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      root.add(m);
    }
    const spheres: THREE.Mesh[] = [];
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color }));
      root.add(s); spheres.push(s);
    }
    flows.push({ path, color, n, spheres, speed });
  };
  // primário (laranja): reator -> gerador de vapor -> reator
  pipe([[rx + 4.6, 8, rz], [rx + 8, 8, rz], [gx - 3, 8, gz], [gx - 2, 8, gz]], '#f97316', 0.08, 12);
  pipe([[gx - 1.5, 1, gz + 2.7], [gx - 1.5, 1, rz + 8], [rx, 1, rz + 8], [rx, 1, rz + 5.2]], '#fb923c', 0.07, 12);
  // secundário (azul): gerador -> turbina
  pipe([[gx + 3, 8.5, gz], [tx - 8, 8.5, gz], [tx - 8, 8.5, tz], [tx - 6, 5.2, tz]], '#38bdf8', 0.11, 14);
  // eléctrico (amarelo): alternador -> transformador
  pipe([[tx + 9.8, 4.5, tz], [x1 - 4, 4.5, tz], [x1 - 4, 4.5, cz - 12.2]], '#facc15', 0.14, 10);

  // ---------- Sala de controlo (norte-direita da entrada, a sul): consola + ecrã grande
  const sx = cx - 8, sz = z1 - 3;
  box(10, 1.1, 2.4, '#1e293b', sx, y + 0.7, sz);
  box(10, 0.15, 2.6, '#334155', sx, y + 1.3, sz);
  const cv = document.createElement('canvas');
  cv.width = 768; cv.height = 360;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 4.9), new THREE.MeshBasicMaterial({ map: tex }));
  screen.position.set(sx, y + 5, z1 - 0.2);
  screen.rotation.y = Math.PI;
  root.add(screen);
  box(11, 5.6, 0.3, '#0b1220', sx, y + 5, z1 + 0.05);
  const draw = () => {
    const g = cv.getContext('2d')!;
    g.fillStyle = '#05101f'; g.fillRect(0, 0, 768, 360);
    g.fillStyle = '#7dd3fc'; g.font = 'bold 26px sans-serif'; g.fillText('USINA NUCLEAR DE XIQUE · PAINEL', 24, 40);
    const rows: [string, number, number, string][] = [
      ['Nuclear', ENERGY.nuclearMW, 1000, '#22c55e'],
      ['Eólica', ENERGY.windMW, 100, '#38bdf8'],
      ['Consumo', ENERGY.demandMW, 1000, '#facc15'],
    ];
    rows.forEach(([name, v, max, c], i) => {
      const yy = 80 + i * 70;
      g.fillStyle = '#cbd5e1'; g.font = 'bold 22px sans-serif'; g.fillText(`${name}`, 24, yy + 22);
      g.fillStyle = '#111c33'; g.fillRect(170, yy, 440, 30);
      g.fillStyle = c; g.fillRect(170, yy, Math.min(440, (v / max) * 440), 30);
      g.fillStyle = '#fff'; g.fillText(`${Math.round(v)} MW`, 626, yy + 24);
    });
    g.fillStyle = '#94a3b8'; g.font = '20px sans-serif';
    g.fillText(`Reator ${ENERGY.reactorTemp} °C · vento ${ENERGY.windSpeed.toFixed(1)} m/s · moinhos ${ENERGY.windTurbines}`, 24, 320);
    const net = Math.round(ENERGY.nuclearMW + ENERGY.windMW - ENERGY.demandMW);
    g.fillStyle = net >= 0 ? '#4ade80' : '#f87171'; g.font = 'bold 26px sans-serif'; g.fillText(`Saldo ${net >= 0 ? '+' : ''}${net} MW`, 540, 40);
    tex.needsUpdate = true;
  };
  draw();
  sign('Consola de controlo · carrega para abrir o painel', sx, y + 3, sz - 1.6);

  // animação
  let acc = 0;
  animated.push((dt, _n, t) => {
    shaft.rotation.x += dt * (4 + ENERGY.nuclearMW / 400);
    rods.forEach((r, i) => { r.position.y = y + 6.4 + Math.sin(t * 0.6 + i) * 0.35; });
    (core.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.3 + Math.sin(t * 2.2) * 0.35;
    water.material.opacity = 0.34 + Math.sin(t * 1.3) * 0.04;
    for (const f of flows) {
      const segs: number[] = [];
      let total = 0;
      for (let i = 0; i < f.path.length - 1; i++) { const l = f.path[i].distanceTo(f.path[i + 1]); segs.push(l); total += l; }
      f.spheres.forEach((s, k) => {
        let dist = (((t * f.speed * 30 + (k / f.n) * total) % total) + total) % total;
        for (let i = 0; i < segs.length; i++) {
          if (dist <= segs[i]) { s.position.copy(f.path[i]).lerp(f.path[i + 1], dist / segs[i]); break; }
          dist -= segs[i];
        }
      });
    }
    acc += dt;
    if (acc > 1) { acc = 0; draw(); }
  });

  // portais
  portals.push(
    { id: 'int:usina_painel', title: 'Consola da Usina', subtitle: 'Ver o painel de energia', x: sx, z: sz - 2.4, radius: 3.2 },
    { id: 'int:usina_sair', title: 'Saída da Usina', subtitle: 'Voltar ao exterior', x: x1 - 5, z: z1 - 3, radius: 3 },
  );
}
