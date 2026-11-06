// =============================================================================
// Atores: avatares 3D/2D, pets e animação processual.
// O ponto mais baixo de cada modelo fica sempre em y = 0 (groundModel), e o
// motor coloca o ator na altura real do terreno.
// =============================================================================

import * as THREE from 'three';
import { assets } from './assetLibrary';
import type { AvatarConfig, CompanionId } from '../types/game';

export const COMPANION_MODEL: Record<string, string> = {
  caramelo: 'pet/dog',
  gato: 'pet/cat',
  capivara: 'pet/cow',
  galinha: 'pet/chick',
  panda: 'pet/panda',
};

export type ActorRig = 'humanoid' | 'quadruped' | 'billboard';

export interface Actor {
  /** Raiz posicionada pelo motor (pés em y = 0 local). */
  group: THREE.Group;
  /** Parte que é animada (inclinação, salto, squash). */
  body: THREE.Object3D;
  rig: ActorRig;
  height: number;
  phase: number;
  /** Quanto o ator está na água (0 = seco, 1 = a nadar). */
  swim: number;
  mixer?: THREE.AnimationMixer;
  clips?: Record<string, THREE.AnimationAction>;
  current?: string;
}

/** Liga as animações reais do GLB (idle/walk/sprint/run/sit...). */
function attachClips(actor: Actor, model: THREE.Group): void {
  const list = model.animations ?? [];
  if (!list.length) return;
  const mixer = new THREE.AnimationMixer(model);
  const clips: Record<string, THREE.AnimationAction> = {};
  for (const clip of list) clips[clip.name] = mixer.clipAction(clip);
  actor.mixer = mixer;
  actor.clips = clips;
  play(actor, clips.idle ? 'idle' : Object.keys(clips)[0]);
}

export function play(actor: Actor, name: string, fade = 0.18): void {
  if (!actor.clips || actor.current === name) return;
  const next = actor.clips[name];
  if (!next) return;
  const prev = actor.current ? actor.clips[actor.current] : null;
  next.reset().setEffectiveWeight(1).fadeIn(fade).play();
  prev?.fadeOut(fade);
  actor.current = name;
}

/** Assenta o modelo para que o ponto mais baixo fique em y = 0. */
export function groundModel(object: THREE.Object3D): void {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  if (Number.isFinite(box.min.y)) object.position.y -= box.min.y;
}

function applyTint(root: THREE.Object3D, avatar: AvatarConfig | null) {
  if (!avatar) return;
  // Os modelos Kenney usam um colormap; só tingimos peças com nomes claros.
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
  });
}

function fallbackBody(color: string, height: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, height * 0.45, 4, 8), mat);
  torso.position.y = height * 0.5;
  torso.castShadow = true;
  g.add(torso);
  return g;
}

export async function createActor(avatar: AvatarConfig): Promise<Actor> {
  const group = new THREE.Group();
  group.name = `actor_${avatar.name}`;

  if (avatar.representation === '2d' || avatar.avatarFamily === 'billboard2d') {
    const url = avatar.spriteType || avatar.assetId || 'sprites/animals/dog.png';
    const texture = await new Promise<THREE.Texture>((resolve) => {
      new THREE.TextureLoader().load(
        url.startsWith('sprites/') ? url : `sprites/animals/${url}.png`,
        resolve,
        undefined,
        () => resolve(new THREE.Texture()),
      );
    });
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    sprite.scale.set(1.5, 1.5, 1);
    sprite.center.set(0.5, 0);
    group.add(sprite);
    return { group, body: sprite, rig: 'billboard', height: 1.5, phase: Math.random() * 6, swim: 0 };
  }

  let model: THREE.Group;
  try {
    model = await assets.instance(avatar.assetId);
  } catch {
    model = fallbackBody(avatar.shirtColor || '#38bdf8', 1.7);
  }
  applyTint(model, avatar);
  group.add(model);
  const box = new THREE.Box3().setFromObject(model);
  const height = Math.max(0.4, box.max.y - box.min.y);
  const rig: ActorRig = avatar.avatarFamily === 'animal' || avatar.rigAdapter === 'quadruped' ? 'quadruped' : 'humanoid';
  const actor: Actor = { group, body: model, rig, height, phase: Math.random() * 6, swim: 0 };
  attachClips(actor, model);
  return actor;
}

export async function createCompanion(id: CompanionId): Promise<Actor | null> {
  if (id === 'none') return null;
  const key = COMPANION_MODEL[id] ?? (id.startsWith('pet/') ? id : '');
  if (!key) return null;
  let model: THREE.Group;
  try {
    model = await assets.instance(key);
  } catch {
    return null;
  }
  model.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) m.castShadow = true;
  });
  const group = new THREE.Group();
  group.add(model);
  const box = new THREE.Box3().setFromObject(model);
  const actor: Actor = { group, body: model, rig: 'quadruped', height: box.max.y - box.min.y, phase: Math.random() * 6, swim: 0 };
  attachClips(actor, model);
  return actor;
}

/**
 * Anima o corpo conforme a velocidade. `speed` em m/s, `swim` 0..1 quando o
 * ator está na água (corpo mais baixo e braçada lenta).
 */
export function animateActor(actor: Actor, dt: number, speed: number, running: boolean, swim = 0, pose?: string) {
  actor.swim += (swim - actor.swim) * Math.min(1, dt * 6);
  const moving = speed > 0.15;
  if (actor.mixer && actor.clips) {
    const fast = actor.clips.sprint ? 'sprint' : actor.clips.run ? 'run' : 'walk';
    const want = pose && actor.clips[pose] ? pose : !moving ? 'idle' : running && speed > 5 ? fast : 'walk';
    play(actor, want);
    const scale = want === 'walk' ? Math.max(0.6, speed / 3.2) : want === 'idle' ? 1 : Math.max(0.8, speed / 7);
    actor.mixer.timeScale = scale;
    actor.mixer.update(dt);
    // a nadar o corpo inclina-se e afunda um pouco; o resto vem da animação
    actor.body.position.y = -actor.swim * 0.7;
    actor.body.rotation.x = actor.swim * 0.9;
    return;
  }
  const rate = swim > 0.5 ? 5 : running ? 13 : 8.5;
  if (moving) actor.phase += dt * rate * Math.min(1.4, speed / 3 + 0.4);
  else actor.phase += dt * 1.6;
  const p = actor.phase;
  const body = actor.body;

  if (actor.rig === 'billboard') {
    const bob = moving ? Math.abs(Math.sin(p)) * 0.18 : Math.sin(p) * 0.02;
    body.position.y = bob - actor.swim * 0.5;
    const s = 1 + (moving ? Math.sin(p * 2) * 0.05 : 0);
    body.scale.set(1.5 / s, 1.5 * s, 1);
    return;
  }

  if (actor.rig === 'quadruped') {
    body.position.y = (moving ? Math.abs(Math.sin(p)) * 0.1 : 0) - actor.swim * 0.35;
    body.rotation.z = moving ? Math.sin(p) * 0.08 : 0;
    body.rotation.x = moving ? Math.sin(p * 2) * 0.05 : 0;
    return;
  }

  // humanoide
  const lean = running ? 0.22 : moving ? 0.08 : 0;
  body.position.y = (moving ? Math.abs(Math.sin(p)) * (running ? 0.14 : 0.07) : Math.sin(p) * 0.008) - actor.swim * 0.75;
  body.rotation.x = swim > 0.5 ? 1.1 * actor.swim + Math.sin(p) * 0.08 : lean;
  body.rotation.z = moving ? Math.sin(p) * 0.06 : 0;
}
