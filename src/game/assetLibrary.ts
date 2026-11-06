// =============================================================================
// Biblioteca de assets Kenney
// Carrega GLB em cache, normaliza escala/pivô (pés ou base no chão) e cria
// protótipos clonáveis e geometrias para instancing.
// =============================================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

export type AssetKind = 'character' | 'animal' | 'vehicle' | 'train' | 'building' | 'prop' | 'furniture' | 'market' | 'food';

interface ModelDef {
  url: string;
  kind: AssetKind;
  /** Altura final em metros. Sem valor = escala nativa. */
  height?: number;
  /** Correcção de orientação em radianos (frente nativa = +Z). */
  yawOffset?: number;
}

const characterHeight = 1.72;
const petHeight = 0.92;

function def(url: string, kind: AssetKind, height?: number): ModelDef {
  return { url, kind, height };
}

export const MODELS: Record<string, ModelDef> = {
  // --- Personagens Kenney Mini (12 corpos) ---
  'mini/male-a': def('models/mini/character-male-a.glb', 'character', characterHeight),
  'mini/male-b': def('models/mini/character-male-b.glb', 'character', characterHeight),
  'mini/male-c': def('models/mini/character-male-c.glb', 'character', characterHeight),
  'mini/male-d': def('models/mini/character-male-d.glb', 'character', characterHeight),
  'mini/male-e': def('models/mini/character-male-e.glb', 'character', characterHeight),
  'mini/male-f': def('models/mini/character-male-f.glb', 'character', characterHeight),
  'mini/female-a': def('models/mini/character-female-a.glb', 'character', characterHeight),
  'mini/female-b': def('models/mini/character-female-b.glb', 'character', characterHeight),
  'mini/female-c': def('models/mini/character-female-c.glb', 'character', characterHeight),
  'mini/female-d': def('models/mini/character-female-d.glb', 'character', characterHeight),
  'mini/female-e': def('models/mini/character-female-e.glb', 'character', characterHeight),
  'mini/female-f': def('models/mini/character-female-f.glb', 'character', characterHeight),

  // --- Personagens Kenney Blocky (18 corpos) ---
  ...Object.fromEntries('abcdefghijklmnopqr'.split('').map((k) => [`blocky/${k}`, def(`models/blocky/character-${k}.glb`, 'character', characterHeight)])),

  // --- Animais Kenney Cube Pets (3D, com patas articuladas) ---
  'pet/dog': def('models/pets/animal-dog.glb', 'animal', petHeight),
  'pet/cat': def('models/pets/animal-cat.glb', 'animal', petHeight),
  'pet/fox': def('models/pets/animal-fox.glb', 'animal', petHeight),
  'pet/panda': def('models/pets/animal-panda.glb', 'animal', petHeight),
  'pet/bunny': def('models/pets/animal-bunny.glb', 'animal', petHeight),
  'pet/chick': def('models/pets/animal-chick.glb', 'animal', petHeight * 0.6),
  'pet/penguin': def('models/pets/animal-penguin.glb', 'animal', petHeight),
  'pet/pig': def('models/pets/animal-pig.glb', 'animal', petHeight),
  'pet/cow': def('models/pets/animal-cow.glb', 'animal', petHeight * 1.2),
  'pet/parrot': def('models/pets/animal-parrot.glb', 'animal', petHeight * 0.8),
  'pet/deer': def('models/pets/animal-deer.glb', 'animal', petHeight * 1.2),
  'pet/beaver': def('models/pets/animal-beaver.glb', 'animal', petHeight * 0.7),
  'pet/bee': def('models/pets/animal-bee.glb', 'animal', petHeight * 0.5),
  'pet/caterpillar': def('models/pets/animal-caterpillar.glb', 'animal', petHeight * 0.4),
  'pet/crab': def('models/pets/animal-crab.glb', 'animal', petHeight * 0.4),
  'pet/elephant': def('models/pets/animal-elephant.glb', 'animal', petHeight * 1.4),
  'pet/fish': def('models/pets/animal-fish.glb', 'animal', petHeight * 0.5),
  'pet/giraffe': def('models/pets/animal-giraffe.glb', 'animal', petHeight * 1.8),
  'pet/hog': def('models/pets/animal-hog.glb', 'animal', petHeight * 0.9),
  'pet/koala': def('models/pets/animal-koala.glb', 'animal', petHeight * 0.8),
  'pet/lion': def('models/pets/animal-lion.glb', 'animal', petHeight),
  'pet/monkey': def('models/pets/animal-monkey.glb', 'animal', petHeight * 0.8),
  'pet/polar': def('models/pets/animal-polar.glb', 'animal', petHeight * 1.3),
  'pet/tiger': def('models/pets/animal-tiger.glb', 'animal', petHeight * 1.1),

  // --- Carros ---
  'car/sedan': def('models/cars/sedan.glb', 'vehicle'),
  'car/sedan-sports': def('models/cars/sedan-sports.glb', 'vehicle'),
  'car/suv': def('models/cars/suv.glb', 'vehicle'),
  'car/suv-luxury': def('models/cars/suv-luxury.glb', 'vehicle'),
  'car/taxi': def('models/cars/taxi.glb', 'vehicle'),
  'car/hatchback': def('models/cars/hatchback-sports.glb', 'vehicle'),
  'car/van': def('models/cars/van.glb', 'vehicle'),
  'car/delivery': def('models/cars/delivery.glb', 'vehicle'),
  'car/truck': def('models/cars/truck.glb', 'vehicle'),
  'car/police': def('models/cars/police.glb', 'vehicle'),
  'car/ambulance': def('models/cars/ambulance.glb', 'vehicle'),
  'car/tractor': def('models/cars/tractor.glb', 'vehicle'),

  // --- Comboio ---
  'train/locomotive-a': def('models/train/train-locomotive-a.glb', 'train'),
  'train/locomotive-b': def('models/train/train-locomotive-b.glb', 'train'),
  'train/diesel': def('models/train/train-diesel-a.glb', 'train'),
  'train/city': def('models/train/train-electric-city-a.glb', 'train'),
  'train/tram': def('models/train/train-tram-modern.glb', 'train'),
  'train/carriage-box': def('models/train/train-carriage-box.glb', 'train'),
  'train/carriage-container': def('models/train/train-carriage-container-blue.glb', 'train'),
  'train/carriage-flatbed': def('models/train/train-carriage-flatbed.glb', 'train'),

  // --- Vegetação e adereços ---
  'nature/tree-large': def('models/suburban/tree-large.glb', 'prop'),
  'nature/tree-small': def('models/suburban/tree-small.glb', 'prop'),
  'prop/fence': def('models/suburban/fence.glb', 'prop'),
  'prop/fence-low': def('models/suburban/fence-low.glb', 'prop'),
  'prop/planter': def('models/suburban/planter.glb', 'prop'),
  'prop/path': def('models/suburban/path-long.glb', 'prop'),
  'prop/path-stones': def('models/suburban/path-stones-long.glb', 'prop'),
  'prop/driveway': def('models/suburban/driveway-short.glb', 'prop'),
  'prop/water-tower': def('models/industrial/water-tower.glb', 'prop'),
  'prop/windmill': def('models/industrial/windmill.glb', 'prop'),
  'prop/chimney': def('models/industrial/chimney-basic.glb', 'prop'),
  'prop/tank': def('models/industrial/detail-tank.glb', 'prop'),
  'prop/container': def('models/industrial/shipping-container-a.glb', 'prop'),
  'prop/solar': def('models/industrial/solar-panel-flat.glb', 'prop'),

  // --- Edifícios ---
  ...Object.fromEntries('abcdefghijklmnopqrstu'.split('').map((k) => [`bld/suburban-${k}`, def(`models/suburban/building-type-${k}.glb`, 'building')])),
  ...Object.fromEntries('abcdefghijklmn'.split('').map((k) => [`bld/commercial-${k}`, def(`models/commercial/building-${k}.glb`, 'building')])),
  ...Object.fromEntries('abcdefghijklmn'.split('').map((k) => [`bld/low-${k}`, def(`models/commercial/low-detail-building-${k}.glb`, 'building')])),
  ...Object.fromEntries('abcdef'.split('').map((k) => [`bld/industrial-${k}`, def(`models/industrial/building-${k}.glb`, 'building')])),
  ...Object.fromEntries('abcde'.split('').map((k) => [`bld/skyscraper-${k}`, def(`models/commercial/building-skyscraper-${k}.glb`, 'building')])),
  'prop/awning': def('models/commercial/detail-awning.glb', 'prop'),
  'prop/awning-wide': def('models/commercial/detail-awning-wide.glb', 'prop'),
  'prop/parasol': def('models/commercial/detail-parasol-a.glb', 'prop'),

  // --- Mercado ---
  'market/shelf': def('models/market/shelf-boxes.glb', 'market'),
  'market/shelf-end': def('models/market/shelf-end.glb', 'market'),
  'market/display-bread': def('models/market/display-bread.glb', 'market'),
  'market/display-fruit': def('models/market/display-fruit.glb', 'market'),
  'market/freezer': def('models/market/freezer.glb', 'market'),
  'market/cart': def('models/market/shopping-cart.glb', 'market'),
  'market/basket': def('models/market/shopping-basket.glb', 'market'),
  'market/cash-register': def('models/market/cash-register.glb', 'market'),
  'market/employee': def('models/market/character-employee.glb', 'character', characterHeight),

  // --- Comida ---
  'food/bread': def('models/food/bread.glb', 'food'),
  'food/croissant': def('models/food/croissant.glb', 'food'),
  'food/loaf': def('models/food/loaf.glb', 'food'),
  'food/baguette': def('models/food/loaf-baguette.glb', 'food'),
  'food/cake': def('models/food/cake.glb', 'food'),
  'food/donut': def('models/food/donut-chocolate.glb', 'food'),
  'food/carrot': def('models/food/carrot.glb', 'food'),
  'food/corn': def('models/food/corn.glb', 'food'),
  'food/tomato': def('models/food/tomato-slice.glb', 'food'),
  'food/fish': def('models/food/fish.glb', 'food'),
  'food/apple': def('models/food/apple.glb', 'food'),
  'food/cheese': def('models/food/cheese-cut.glb', 'food'),
  'food/coffee': def('models/food/cup-coffee.glb', 'food'),

  // --- Mobiliário (interiores) ---
  'furniture/bedDouble': def('models/furniture/bedDouble.glb', 'furniture'),
  'furniture/bedSingle': def('models/furniture/bedSingle.glb', 'furniture'),
  'furniture/bench': def('models/furniture/bench.glb', 'furniture'),
  'furniture/bookcaseClosed': def('models/furniture/bookcaseClosed.glb', 'furniture'),
  'furniture/chair': def('models/furniture/chair.glb', 'furniture'),
  'furniture/chairRounded': def('models/furniture/chairRounded.glb', 'furniture'),
  'furniture/desk': def('models/furniture/desk.glb', 'furniture'),
  'furniture/kitchenFridge': def('models/furniture/kitchenFridge.glb', 'furniture'),
  'furniture/kitchenStove': def('models/furniture/kitchenStove.glb', 'furniture'),
  'furniture/kitchenSink': def('models/furniture/kitchenSink.glb', 'furniture'),
  'furniture/kitchenCabinet': def('models/furniture/kitchenCabinet.glb', 'furniture'),
  'furniture/lampRoundFloor': def('models/furniture/lampRoundFloor.glb', 'furniture'),
  'furniture/loungeSofa': def('models/furniture/loungeSofa.glb', 'furniture'),
  'furniture/loungeChair': def('models/furniture/loungeChair.glb', 'furniture'),
  'furniture/table': def('models/furniture/table.glb', 'furniture'),
  'furniture/tableCoffee': def('models/furniture/tableCoffee.glb', 'furniture'),
  'furniture/televisionModern': def('models/furniture/televisionModern.glb', 'furniture'),
  'furniture/rugRectangle': def('models/furniture/rugRectangle.glb', 'furniture'),
  'furniture/pottedPlant': def('models/furniture/pottedPlant.glb', 'furniture'),
  'furniture/speaker': def('models/furniture/speaker.glb', 'furniture'),
  'furniture/wallWindow': def('models/furniture/wallWindow.glb', 'furniture'),
};

/** Assets necessários para abrir o mundo (os restantes carregam sob demanda). */
export const CORE_ASSETS = [
  'mini/male-a', 'mini/male-b', 'mini/male-d',
  'mini/female-a', 'mini/female-c', 'mini/female-e',
  'pet/dog', 'pet/cat', 'pet/fox', 'pet/panda',
  'car/sedan', 'car/taxi', 'car/van', 'car/truck', 'car/police', 'car/suv',
  'train/locomotive-a', 'train/carriage-box',
  'nature/tree-large', 'nature/tree-small',
  'bld/commercial-a', 'bld/commercial-b', 'bld/commercial-c', 'bld/commercial-d',
  'bld/commercial-e', 'bld/commercial-f',
  'bld/low-a', 'bld/low-b', 'bld/low-c', 'bld/low-d',
  'bld/industrial-a', 'bld/industrial-b',
  'prop/windmill', 'prop/water-tower', 'prop/container', 'prop/tank', 'prop/fence', 'prop/planter',
  'market/shelf', 'market/display-bread', 'market/cart',
  'food/bread', 'food/croissant', 'food/cake', 'food/carrot', 'food/corn', 'food/fish',
];

class AssetLibrary {
  private loader = new GLTFLoader();
  private sources = new Map<string, THREE.Group>();
  private pending = new Map<string, Promise<THREE.Group>>();
  private prepared = new Map<string, THREE.Group>();
  private instanced = new Map<string, { geometry: THREE.BufferGeometry; material: THREE.Material }>();
  private normalized = new Map<string, { geometry: THREE.BufferGeometry; material: THREE.Material }>();
  private failed = new Set<string>();

  public async load(key: string): Promise<THREE.Group> {
    const cached = this.sources.get(key);
    if (cached) return cached;

    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight;

    const model = MODELS[key];
    if (!model) throw new Error(`Asset desconhecido: ${key}`);

    const promise = this.loader
      .loadAsync(model.url)
      .then((gltf) => {
        const scene = gltf.scene;
        scene.animations = gltf.animations;
        scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            const material = mesh.material as THREE.MeshStandardMaterial;
            if (material && 'roughness' in material) {
              material.roughness = Math.min(1, Math.max(0.55, material.roughness ?? 0.85));
              material.metalness = Math.min(0.15, material.metalness ?? 0);
            }
          }
        });
        this.sources.set(key, scene);
        this.pending.delete(key);
        return scene;
      })
      .catch((error) => {
        this.pending.delete(key);
        this.failed.add(key);
        console.warn(`[assets] falha ao carregar ${key}:`, error);
        throw error;
      });

    this.pending.set(key, promise);
    return promise;
  }

  /** Carrega em paralelo com progresso agregado. */
  public async preload(keys: string[], onProgress?: (done: number, total: number, label: string) => void): Promise<void> {
    const total = keys.length;
    let done = 0;
    const queue = [...keys];
    const workers = Array.from({ length: Math.min(6, total) }, async () => {
      while (queue.length > 0) {
        const key = queue.shift();
        if (!key) return;
        try {
          await this.load(key);
        } catch {
          // Placeholder silencioso: o jogo continua sem este modelo.
        }
        done += 1;
        onProgress?.(done, total, key);
      }
    });
    await Promise.all(workers);
  }

  /** Protótipo normalizado: origem entre os pés/base, XZ centrado. */
  public async prototype(key: string, heightOverride?: number): Promise<THREE.Group> {
    const cacheKey = `${key}@${heightOverride ?? 'native'}`;
    const hit = this.prepared.get(cacheKey);
    if (hit) return hit;

    const source = await this.load(key);
    const inner = cloneSkinned(source) as THREE.Group;
    const model = MODELS[key];
    const targetHeight = heightOverride ?? model.height;

    const box = new THREE.Box3().setFromObject(inner);
    const size = box.getSize(new THREE.Vector3());
    const scale = targetHeight && size.y > 0.0001 ? targetHeight / size.y : 1;
    inner.scale.multiplyScalar(scale);

    box.setFromObject(inner);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.x -= center.x;
    inner.position.z -= center.z;
    inner.position.y -= box.min.y;

    const wrapper = new THREE.Group();
    wrapper.name = `asset_${key}`;
    inner.animations = source.animations;
    wrapper.add(inner);
    wrapper.animations = source.animations;
    if (model.yawOffset) wrapper.rotation.y = model.yawOffset;
    wrapper.userData.assetKey = key;
    this.prepared.set(cacheKey, wrapper);
    return wrapper;
  }

  /** Instância pronta para o mundo. */
  public async instance(key: string, height?: number): Promise<THREE.Group> {
    const proto = await this.prototype(key, height);
    const copy = cloneSkinned(proto) as THREE.Group;
    copy.animations = proto.animations;
    return copy;
  }

  /** Geometria achatada + material para InstancedMesh. */
  public async instancedGeometry(key: string): Promise<{ geometry: THREE.BufferGeometry; material: THREE.Material }> {
    const hit = this.instanced.get(key);
    if (hit) return hit;

    const source = await this.load(key);
    source.updateMatrixWorld(true);
    const geometries: THREE.BufferGeometry[] = [];
    let material: THREE.Material | null = null;

    source.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const geo = mesh.geometry.clone();
        geo.applyMatrix4(mesh.matrixWorld);
        // Normaliza atributos para permitir fusão
        if (geo.attributes.uv2) geo.deleteAttribute('uv2');
        if (geo.attributes.tangent) geo.deleteAttribute('tangent');
        geometries.push(geo);
        if (!material) material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      }
    });

    if (geometries.length === 0 || !material) throw new Error(`Sem geometria para ${key}`);

    let geometry = geometries[0];
    if (geometries.length > 1) {
      const merged = mergeGeometries(geometries, false);
      if (merged) geometry = merged;
    }
    geometry.computeBoundingBox();
    const result = { geometry, material };
    this.instanced.set(key, result);
    return result;
  }

  /**
   * Geometria normalizada para instancing: base em y=0, centro XZ na origem
   * e escala definida pela altura final em metros.
   */
  public async normalizedGeometry(key: string, height?: number): Promise<{ geometry: THREE.BufferGeometry; material: THREE.Material }> {
    const cacheKey = `${key}#${height ?? 'native'}`;
    const hit = this.normalized.get(cacheKey);
    if (hit) return hit;

    const base = await this.instancedGeometry(key);
    const geometry = base.geometry.clone();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const size = box.getSize(new THREE.Vector3());
    const scale = height && size.y > 0.0001 ? height / size.y : 1;
    geometry.scale(scale, scale, scale);
    geometry.computeBoundingBox();
    const b = geometry.boundingBox!;
    const center = b.getCenter(new THREE.Vector3());
    geometry.translate(-center.x, -b.min.y, -center.z);
    geometry.computeBoundingSphere();

    const result = { geometry, material: base.material };
    this.normalized.set(cacheKey, result);
    return result;
  }

  public hasFailed(key: string): boolean {
    return this.failed.has(key);
  }

  public loadedCount(): number {
    return this.sources.size;
  }

  public dispose(): void {
    this.sources.forEach((scene) => {
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((m) => {
            const map = (m as THREE.MeshStandardMaterial).map;
            if (map) map.dispose();
            m.dispose();
          });
        }
      });
    });
    this.sources.clear();
    this.prepared.clear();
    this.instanced.clear();
    this.normalized.clear();
  }
}

export const assets = new AssetLibrary();
