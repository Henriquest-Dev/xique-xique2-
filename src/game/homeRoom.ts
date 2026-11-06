// =============================================================================
// Interior 3D das casas: uma sala elevada (reutilizada por todos os lotes) onde
// se anda a pé, se vê a janela e se arrastam móveis na grelha 8 x 7.
// =============================================================================
import * as THREE from 'three';
import { assets } from './assetLibrary';
import { FURNITURE_CATALOG } from './constants';
import { gameState } from '../services/gameState';
import type { LotData } from '../types/game';
import type { Collider } from './world';

export const HOME_INT = { cx: -585, cz: 520, y: 60 };
const C = 1.25; // metros por célula
const COLS = 8;
const ROWS = 7;
const W = COLS * C;
const D = ROWS * C;
const WALL_H = 3.1;

type Rot = 0 | 90 | 180 | 270;

export class HomeRoom {
  public group = new THREE.Group();
  public surface = { minX: HOME_INT.cx - W / 2, maxX: HOME_INT.cx + W / 2, minZ: HOME_INT.cz - D / 2, maxZ: HOME_INT.cz + D / 2, y: HOME_INT.y };
  public lot: LotData | null = null;
  private x0 = HOME_INT.cx - W / 2;
  private z0 = HOME_INT.cz - D / 2;
  private furn = new THREE.Group();
  private ids = new Map<THREE.Object3D, string>();
  private wallMats: THREE.MeshStandardMaterial[] = [];
  private winMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  private light = new THREE.PointLight('#ffe2b0', 0, 16, 1.5);
  private ghost: THREE.Object3D | null = null;
  private ghostFor: { itemId: string; rotation: Rot; existing?: string } | null = null;
  private ghostCell = { x: 0, z: 0, ok: false };
  private texLoader = new THREE.TextureLoader();
  public colliders: Collider[] = [];
  public bind(target: Collider[]) { target.push(...this.colliders); this.colliders = target; }
  private dynColliders: Collider[] = [];

  constructor() {
    this.group.name = 'home_room';
    const y = HOME_INT.y;
    const mat = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W + 1, 0.5, D + 1), mat('#c8a06a'));
    floor.position.set(HOME_INT.cx, y - 0.25, HOME_INT.cz);
    floor.receiveShadow = true;
    this.group.add(floor);
    for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) {
      if ((i + j) % 2) continue;
      const t = new THREE.Mesh(new THREE.BoxGeometry(C, 0.03, C), mat('#b78d57'));
      t.position.set(this.x0 + (i + 0.5) * C, y + 0.015, this.z0 + (j + 0.5) * C);
      this.group.add(t);
    }
    const wallMat = new THREE.MeshStandardMaterial({ color: '#e8e0d0', roughness: 0.95 });
    this.wallMats.push(wallMat);
    const wall = (w: number, d: number, x: number, z: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), wallMat);
      m.position.set(x, y + WALL_H / 2, z);
      m.castShadow = true;
      this.group.add(m);
      this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, tag: 'static' });
      const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.2, d + 0.02), mat('#5b3a1a'));
      base.position.set(x, y + 0.1, z);
      this.group.add(base);
    };
    const T = 0.35;
    wall(W + T * 2, T, HOME_INT.cx, this.z0 - T / 2);                 // norte (janelas)
    wall(W + T * 2, T, HOME_INT.cx, this.z0 + D + T / 2);             // sul
    wall(T, D, this.x0 - T / 2, HOME_INT.cz);                         // oeste
    const gap = 0.85;                                                  // porta na parede leste
    wall(T, D / 2 - gap, this.x0 + W + T / 2, this.z0 + (D / 2 - gap) / 2);
    wall(T, D / 2 - gap, this.x0 + W + T / 2, this.z0 + D - (D / 2 - gap) / 2);
    // janelas na parede norte, com vista para a rua
    [-2.7, 2.7].forEach((dx) => {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), this.winMat);
      pane.position.set(HOME_INT.cx + dx, y + 1.75, this.z0 + 0.02);
      this.group.add(pane);
      const f = mat('#f5f1e6');
      for (const [fw, fh, fx, fy] of [[2.4, 0.12, 0, 0.8], [2.4, 0.12, 0, -0.8], [0.12, 1.7, -1.14, 0], [0.12, 1.7, 1.14, 0], [0.06, 1.5, 0, 0], [2.2, 0.06, 0, 0]] as number[][]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.1), f);
        b.position.set(HOME_INT.cx + dx + fx, y + 1.75 + fy, this.z0 + 0.06);
        this.group.add(b);
      }
    });
    this.light.position.set(HOME_INT.cx, y + 2.7, HOME_INT.cz);
    this.group.add(this.light);
    this.group.add(this.furn);
  }

  // ------------------------------------------------------------- conversões
  public cellToWorld(x: number, z: number, w: number, d: number) {
    return { x: this.x0 + (x + w / 2) * C, z: this.z0 + (z + d / 2) * C };
  }
  public entryPos() { return { x: this.x0 + W - 1.4, z: HOME_INT.cz }; }
  public doorPortal() { return { x: this.x0 + W - 0.6, z: HOME_INT.cz, radius: 2.2 }; }
  private dims(itemId: string, rot: Rot) {
    const def = FURNITURE_CATALOG.find((f) => f.id === itemId) ?? FURNITURE_CATALOG[0];
    const r = rot === 90 || rot === 270;
    return { def, w: r ? def.d : def.w, d: r ? def.w : def.d };
  }

  public setNight(n: number) {
    const k = 1 - n * 0.78;
    this.winMat.color.setRGB(k, k, k * (1 + n * 0.1));
    this.light.intensity = this.lot ? 6 + n * 22 : 0;
  }

  // --------------------------------------------------------------- construir
  private async makeModel(itemId: string, rot: Rot, cellX: number, cellZ: number): Promise<THREE.Object3D | null> {
    const { def, w, d } = this.dims(itemId, rot);
    try {
      const model = await assets.instance(def.model);
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const longest = Math.max(size.x, size.z);
      const target = Math.max(def.w, def.d) * C * 0.92;
      if (longest > 0.001) model.scale.multiplyScalar(target / longest);
      model.rotation.y = (rot * Math.PI) / 180;
      model.updateMatrixWorld(true);
      const sb = new THREE.Box3().setFromObject(model);
      const c = this.cellToWorld(cellX, cellZ, w, d);
      model.position.x += c.x - (sb.min.x + sb.max.x) / 2;
      model.position.z += c.z - (sb.min.z + sb.max.z) / 2;
      model.position.y += HOME_INT.y - sb.min.y;
      model.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      return model;
    } catch {
      const fb = new THREE.Mesh(new THREE.BoxGeometry(w * C * 0.8, 0.9, d * C * 0.8), new THREE.MeshStandardMaterial({ color: '#64748b' }));
      const c = this.cellToWorld(cellX, cellZ, w, d);
      fb.position.set(c.x, HOME_INT.y + 0.45, c.z);
      return fb;
    }
  }

  /** (Re)desenha o mobiliário do lote atual. */
  public async setLot(lot: LotData) {
    this.lot = lot;
    const tint = new THREE.Color(lot.wallColor || '#e8e0d0').lerp(new THREE.Color('#ffffff'), 0.55);
    this.wallMats.forEach((m) => m.color.copy(tint));
    const img = lot.sector === 'park' ? 'cinematic/shopping.jpg' : lot.sector === 'main-road' ? 'cinematic/morro.jpg' : 'cinematic/praca.jpg';
    this.texLoader.load(img, (t) => { t.colorSpace = THREE.SRGBColorSpace; this.winMat.map = t; this.winMat.needsUpdate = true; });
    await this.refresh();
  }

  public async refresh() {
    if (!this.lot) return;
    const lot = gameState.getLot(this.lot.id) ?? this.lot;
    this.lot = lot;
    this.furn.clear();
    this.ids.clear();
    this.dynColliders.forEach((c) => { const i = this.colliders.indexOf(c); if (i >= 0) this.colliders.splice(i, 1); });
    this.dynColliders = [];
    for (const it of lot.interiorItems) {
      const m = await this.makeModel(it.itemId, it.rotation, it.x, it.z);
      if (!m) continue;
      this.furn.add(m);
      this.ids.set(m, it.id);
      const { w, d } = this.dims(it.itemId, it.rotation);
      const c = this.cellToWorld(it.x, it.z, w, d);
      const solid = !/rug/i.test(it.itemId);
      if (solid) {
        const col: Collider = { minX: c.x - (w * C) / 2 + 0.08, maxX: c.x + (w * C) / 2 - 0.08, minZ: c.z - (d * C) / 2 + 0.08, maxZ: c.z + (d * C) / 2 - 0.08, tag: 'static' };
        this.dynColliders.push(col);
        this.colliders.push(col);
      }
    }
  }

  public pickFurniture(raycaster: THREE.Raycaster): string | null {
    const hit = raycaster.intersectObjects(this.furn.children, true)[0];
    if (!hit) return null;
    let o: THREE.Object3D | null = hit.object;
    while (o) { const id = this.ids.get(o); if (id) return id; o = o.parent; }
    return null;
  }

  // ---------------------------------------------------------------- fantasma
  public async startPlace(itemId: string, existing?: string) {
    this.cancelPlace();
    let rot: Rot = 0;
    if (existing && this.lot) rot = this.lot.interiorItems.find((i) => i.id === existing)?.rotation ?? 0;
    this.ghostFor = { itemId, rotation: rot, existing };
    await this.buildGhost();
  }
  private async buildGhost() {
    if (!this.ghostFor) return;
    if (this.ghost) { this.group.remove(this.ghost); this.ghost = null; }
    const g = await this.makeModel(this.ghostFor.itemId, this.ghostFor.rotation, this.ghostCell.x, this.ghostCell.z);
    if (!g || !this.ghostFor) return;
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.material = (Array.isArray(m.material) ? m.material : [m.material]).map((mm) => {
        const c = (mm as THREE.MeshStandardMaterial).clone();
        c.transparent = true; c.opacity = 0.62; c.depthWrite = false;
        return c;
      })[0];
      m.castShadow = false;
    });
    this.ghost = g;
    this.group.add(g);
    this.tintGhost();
  }
  private tintGhost() {
    if (!this.ghost) return;
    const col = new THREE.Color(this.ghostCell.ok ? '#22c55e' : '#ef4444');
    this.ghost.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { const mm = m.material as THREE.MeshStandardMaterial; if (mm.emissive) { mm.emissive.copy(col); mm.emissiveIntensity = 0.55; } } });
  }
  public get placing() { return this.ghostFor; }
  public cancelPlace() {
    if (this.ghost) { this.group.remove(this.ghost); this.ghost = null; }
    this.ghostFor = null;
  }
  public async rotateGhost() {
    if (!this.ghostFor) return;
    this.ghostFor.rotation = ((this.ghostFor.rotation + 90) % 360) as Rot;
    await this.buildGhost();
    this.moveGhostTo(this.ghostCell.x, this.ghostCell.z);
  }

  /** Aponta o fantasma para o ponto do chão sob o rato / dedo. */
  public aim(raycaster: THREE.Raycaster) {
    if (!this.ghostFor) return;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -HOME_INT.y);
    const p = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(plane, p)) return;
    const { w, d } = this.dims(this.ghostFor.itemId, this.ghostFor.rotation);
    const cx = Math.min(COLS - w, Math.max(0, Math.round((p.x - this.x0) / C - w / 2)));
    const cz = Math.min(ROWS - d, Math.max(0, Math.round((p.z - this.z0) / C - d / 2)));
    this.moveGhostTo(cx, cz);
  }
  private moveGhostTo(cx: number, cz: number) {
    if (!this.ghostFor || !this.lot) return;
    const { w, d } = this.dims(this.ghostFor.itemId, this.ghostFor.rotation);
    this.ghostCell = { x: cx, z: cz, ok: gameState.canPlaceFurniture(this.lot.id, this.ghostFor.itemId, cx, cz, this.ghostFor.rotation, this.ghostFor.existing) };
    if (this.ghost) {
      const c = this.cellToWorld(cx, cz, w, d);
      // reposiciona pelo centro do bounding box
      const bb = new THREE.Box3().setFromObject(this.ghost);
      this.ghost.position.x += c.x - (bb.min.x + bb.max.x) / 2;
      this.ghost.position.z += c.z - (bb.min.z + bb.max.z) / 2;
    }
    this.tintGhost();
  }
  /** Confirma a colocação (compra ou movimento). */
  public async confirm(): Promise<boolean> {
    if (!this.ghostFor || !this.lot) return false;
    const { itemId, rotation, existing } = this.ghostFor;
    const { x, z } = this.ghostCell;
    const ok = existing ? gameState.moveFurniture(this.lot.id, existing, x, z, rotation) : gameState.placeFurniture(this.lot.id, itemId, x, z, rotation);
    if (ok) {
      this.cancelPlace();
      await this.refresh();
    }
    return ok;
  }
}
