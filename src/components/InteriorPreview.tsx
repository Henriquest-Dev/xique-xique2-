import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PlacedFurniture } from '../types/game';
import { FURNITURE_CATALOG } from '../game/constants';
import { assets } from '../game/assetLibrary';

interface Props {
  items: PlacedFurniture[];
  height?: number;
}

/**
 * Pré-visualização isométrica da casa. O mundo 3D real continua a ser o motor;
 * aqui só se desenha a divisão 8x7 m com os móveis colocados.
 */
export function InteriorPreview({ items, height = 300 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a1622');

    const camera = new THREE.OrthographicCamera(-7, 7, 7, -7, 0.1, 100);
    camera.position.set(11, 12, 13);
    camera.lookAt(0, 0.7, 0);

    scene.add(new THREE.HemisphereLight('#e0f2fe', '#243b2a', 1.1));
    const sun = new THREE.DirectionalLight('#fff4d6', 1.6);
    sun.position.set(6, 12, 8);
    scene.add(sun);

    // Piso
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 7),
      new THREE.MeshStandardMaterial({ color: '#c8a97d', roughness: 0.9 }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Paredes (fundo + esquerda) e soleira
    const wallMat = new THREE.MeshStandardMaterial({ color: '#e8e0d0', roughness: 0.95, transparent: true, opacity: 0.92 });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.8), wallMat);
    backWall.position.set(0, 1.4, -3.5);
    scene.add(backWall);
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.8), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-4, 1.4, 0);
    scene.add(leftWall);

    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 2.2),
      new THREE.MeshStandardMaterial({ color: '#0f766e', roughness: 0.8 }),
    );
    door.rotation.y = -Math.PI / 2;
    door.position.set(4.02, 1.1, 3.4);
    scene.add(door);

    // Grelha de referência
    const grid = new THREE.GridHelper(8, 8, '#3b4b59', '#22303c');
    grid.position.y = 0.01;
    scene.add(grid);

    let disposed = false;
    const group = new THREE.Group();
    scene.add(group);

    const build = async () => {
      for (const item of items) {
        const def = FURNITURE_CATALOG.find((f) => f.id === item.itemId);
        if (!def) continue;
        try {
          const model = await assets.instance(def.model);
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const longest = Math.max(size.x, size.z);
          const target = Math.max(def.w, def.d);
          if (longest > 0.001) model.scale.multiplyScalar(target / longest);
          model.updateMatrixWorld(true);
          const scaled = new THREE.Box3().setFromObject(model);
          model.position.y -= scaled.min.y;
          model.position.x += item.x + def.w / 2 - 4 - (scaled.min.x + scaled.max.x) / 2;
          model.position.z += item.z + def.d / 2 - 3.5 - (scaled.min.z + scaled.max.z) / 2;
          model.rotation.y = (item.rotation * Math.PI) / 180;
          group.add(model);
        } catch {
          const fallback = new THREE.Mesh(
            new THREE.BoxGeometry(def.w * 0.8, 0.9, def.d * 0.8),
            new THREE.MeshStandardMaterial({ color: '#64748b', flatShading: true }),
          );
          fallback.position.set(item.x + def.w / 2 - 4, 0.45, item.z + def.d / 2 - 3.5);
          group.add(fallback);
        }
      }
      if (!disposed) renderer.render(scene, camera);
    };

    const resize = () => {
      const width = wrap.clientWidth || 1;
      const heightPx = Math.max(200, height);
      renderer.setSize(width, heightPx, false);
      const aspect = width / heightPx;
      const view = 6.4;
      camera.left = -view * aspect;
      camera.right = view * aspect;
      camera.top = view;
      camera.bottom = -view;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };

    resize();
    void build();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    return () => {
      disposed = true;
      observer.disconnect();
      // As geometrias/materiais vêm do cache partilhado de assets: não dispor.
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, [items, height]);

  return (
    <div ref={wrapRef} className="overflow-hidden rounded-2xl border border-white/10">
      <canvas ref={canvasRef} style={{ width: '100%', height }} />
    </div>
  );
}
