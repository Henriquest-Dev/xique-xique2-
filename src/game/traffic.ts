// =============================================================================
// Trânsito ambiente — carros na Avenida Marginal e comboio na ferrovia.
// Não colide com o jogador: é cenário vivo, não obstáculo.
// =============================================================================

import * as THREE from 'three';
import { MARGINAL_SPLINE_POINTS, RAIL } from './constants';
import { assets } from './assetLibrary';

interface Vehicle {
  group: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  t: number;
  speed: number;
  length: number;
  headlights: THREE.Mesh[];
}

const CAR_KEYS = ['car/sedan', 'car/taxi', 'car/suv', 'car/van', 'car/hatchback', 'car/delivery', 'car/truck'];

function coastLoop(laneOffset: number): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  MARGINAL_SPLINE_POINTS.forEach(([x, z], index) => {
    const prev = MARGINAL_SPLINE_POINTS[Math.max(0, index - 1)];
    const next = MARGINAL_SPLINE_POINTS[Math.min(MARGINAL_SPLINE_POINTS.length - 1, index + 1)];
    const dx = next[0] - prev[0];
    const dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    let nx = -dz / len;
    let nz = dx / len;
    // Aponta para o interior da cidade (o centro aproximado é 0,0)
    if (nx * (0 - x) + nz * (0 - z) < 0) {
      nx = -nx;
      nz = -nz;
    }
    points.push(new THREE.Vector3(x + nx * laneOffset, 4.16, z + nz * laneOffset));
  });

  const back = points
    .slice()
    .reverse()
    .map((p) => p.clone());
  return new THREE.CatmullRomCurve3([...points, ...back], true, 'catmullrom', 0.2);
}

/**
 * Normaliza um modelo de veículo: alinha o eixo maior com +Z, escala para o
 * comprimento desejado e assenta as rodas no chão. Devolve a largura final.
 */
function normalizeVehicle(body: THREE.Group, targetLength: number) {
  body.rotation.y = 0;
  body.position.set(0, 0, 0);
  body.scale.setScalar(1);
  body.updateMatrixWorld(true);

  const initial = new THREE.Box3().setFromObject(body).getSize(new THREE.Vector3());
  // Muitos modelos vêm alinhados a X; rodar para que o carro ande de frente.
  if (initial.x > initial.z) {
    body.rotation.y = Math.PI / 2;
    body.updateMatrixWorld(true);
  }

  const size = new THREE.Box3().setFromObject(body).getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.z, 0.001);
  body.scale.setScalar(targetLength / longest);
  body.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(body);
  body.position.x -= (box.min.x + box.max.x) / 2;
  body.position.z -= (box.min.z + box.max.z) / 2;
  body.position.y -= box.min.y;
  body.updateMatrixWorld(true);

  const centered = new THREE.Box3().setFromObject(body);
  return { length: targetLength, width: centered.max.x - centered.min.x };
}

function addLights(shell: THREE.Group, length: number, width: number) {
  const headMat = new THREE.MeshStandardMaterial({ color: '#fef9c3', emissive: '#fde68a', emissiveIntensity: 0.5 });
  const tailMat = new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#7f1d1d', emissiveIntensity: 0.4 });
  const headlights: THREE.Mesh[] = [];
  const sideOffset = Math.max(0.35, width / 2 - 0.18);
  [-1, 1].forEach((side) => {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.08), headMat);
    light.position.set(side * sideOffset, 0.62, length / 2 - 0.04);
    shell.add(light);
    headlights.push(light);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.06), tailMat);
    tail.position.set(side * sideOffset, 0.62, -length / 2 + 0.04);
    shell.add(tail);
  });
  return headlights;
}

export class TrafficSystem {
  public group = new THREE.Group();
  private vehicles: Vehicle[] = [];
  private train: { group: THREE.Group; x: number; direction: number } | null = null;
  private outer = coastLoop(3.2);
  private inner = coastLoop(-3.2);
  private headlightMaterials: THREE.MeshStandardMaterial[] = [];

  constructor() {
    this.group.name = 'traffic';
  }

  public async build(count = 16): Promise<void> {
    for (let i = 0; i < count; i += 1) {
      const key = CAR_KEYS[i % CAR_KEYS.length];
      let group: THREE.Group;
      try {
        group = await assets.instance(key);
      } catch {
        group = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 1.1, 4),
          new THREE.MeshStandardMaterial({ color: i % 2 ? '#38bdf8' : '#f97316', flatShading: true }),
        );
        body.position.y = 0.55;
        group.add(body);
      }
      // A casca exterior não leva escala, para os faróis ficarem em metros reais.
      const shell = new THREE.Group();
      shell.add(group);
      const { length, width } = normalizeVehicle(group, 4.2 + (i % 3) * 0.35);
      const headlights = addLights(shell, length, width);
      const outerLane = i % 2 === 0;
      const curved = new THREE.Group();
      curved.add(shell);
      this.group.add(curved);
      this.vehicles.push({
        group: curved,
        curve: outerLane ? this.outer : this.inner,
        t: (i / count + Math.random() * 0.04) % 1,
        // metros por segundo (a posição é avançada por comprimento de arco)
        speed: (outerLane ? 10 : 8) + Math.random() * 4,
        length,
        headlights,
      });
    }

    await this.buildTrain();
  }

  private async buildTrain() {
    const train = new THREE.Group();
    const keys = ['train/locomotive-a', 'train/carriage-box', 'train/carriage-box'];
    for (let i = 0; i < keys.length; i += 1) {
      let car: THREE.Group;
      try {
        car = await assets.instance(keys[i]);
      } catch {
        car = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 2.4, 8),
          new THREE.MeshStandardMaterial({ color: i === 0 ? '#b91c1c' : '#334155', flatShading: true }),
        );
        body.position.y = 1.2;
        car.add(body);
      }
      const box = new THREE.Box3().setFromObject(car);
      const size = box.getSize(new THREE.Vector3());
      const scale = 9 / Math.max(1, size.z);
      car.scale.setScalar(scale);
      car.updateMatrixWorld(true);
      const scaled = new THREE.Box3().setFromObject(car);
      car.position.y -= scaled.min.y;
      car.position.z = -i * 9.6;
      train.add(car);
    }
    train.position.set(-60, 4.1, RAIL.z);
    this.group.add(train);
    this.train = { group: train, x: -60, direction: 1 };
  }

  public update(dt: number) {
    const time = dt;
    this.vehicles.forEach((vehicle) => {
      vehicle.t = (vehicle.t + (vehicle.speed * time) / Math.max(1, vehicle.curve.getLength())) % 1;
      const point = vehicle.curve.getPointAt(vehicle.t);
      const tangent = vehicle.curve.getTangentAt(vehicle.t);
      vehicle.group.position.set(point.x, 4.16, point.z);
      vehicle.group.rotation.y = Math.atan2(tangent.x, tangent.z);
    });

    if (this.train) {
      this.train.x += this.train.direction * dt * 16;
      if (this.train.x > RAIL.maxX - 40) {
        this.train.x = RAIL.maxX - 40;
        this.train.direction = -1;
      } else if (this.train.x < RAIL.minX + 40) {
        this.train.x = RAIL.minX + 40;
        this.train.direction = 1;
      }
      this.train.group.position.x = this.train.x;
    }
  }

  public setNight(night: number) {
    this.headlightMaterials.forEach((m) => {
      m.emissiveIntensity = 0.15 + night * 2.4;
    });
    this.vehicles.forEach((vehicle) => {
      vehicle.headlights.forEach((light) => {
        const material = light.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 0.2 + night * 2.6;
      });
    });
  }

  public dispose() {
    this.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((m) => m.dispose());
      }
    });
    this.group.clear();
    this.vehicles = [];
  }
}
