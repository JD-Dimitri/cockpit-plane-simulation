import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gcInterpolate, type LatLon } from '@a350/sim-core';
import { t } from '../i18n/index.ts';

// ARP du prototype v0 (à remplacer par nav-data en phase 2)
const FMEE: LatLon = { lat: -20.8871, lon: 55.5103 };
const LFPG: LatLon = { lat: 49.0097, lon: 2.5479 };

function toXYZ(p: LatLon, r = 1): [number, number, number] {
  const la = (p.lat * Math.PI) / 180, lo = (p.lon * Math.PI) / 180;
  return [r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo)];
}

/** Globe filaire et route orthodromique : vérifie que Three.js est embarqué et fonctionne hors ligne. */
export function WorldView() {
  const host = useRef<HTMLDivElement>(null);
  const [noGl, setNoGl] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setNoGl(true);
      return;
    }
    const W = 360, H = 260;
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(W, H);
    renderer.domElement.setAttribute('data-testid', 'world-canvas');
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
    camera.position.set(0, 0.35, 3.6);
    camera.lookAt(0, 0.1, 0);
    const globe = new THREE.Group();
    scene.add(globe);

    // méridiens et parallèles tous les 15°
    const grid: number[] = [];
    for (let lat = -75; lat <= 75; lat += 15) for (let lon = 0; lon < 360; lon += 5) {
      grid.push(...toXYZ({ lat, lon }), ...toXYZ({ lat, lon: lon + 5 }));
    }
    for (let lon = 0; lon < 360; lon += 15) for (let lat = -90; lat < 90; lat += 5) {
      grid.push(...toXYZ({ lat, lon }), ...toXYZ({ lat: lat + 5, lon }));
    }
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(grid, 3));
    globe.add(new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({ color: 0x1f4a66 })));

    const route: number[] = [];
    for (let i = 0; i <= 128; i++) route.push(...toXYZ(gcInterpolate(FMEE, LFPG, i / 128), 1.005));
    const routeGeo = new THREE.BufferGeometry();
    routeGeo.setAttribute('position', new THREE.Float32BufferAttribute(route, 3));
    globe.add(new THREE.Line(routeGeo, new THREE.LineBasicMaterial({ color: 0xff00ff })));

    const ptsGeo = new THREE.BufferGeometry();
    ptsGeo.setAttribute('position', new THREE.Float32BufferAttribute([...toXYZ(FMEE, 1.01), ...toXYZ(LFPG, 1.01)], 3));
    globe.add(new THREE.Points(ptsGeo, new THREE.PointsMaterial({ color: 0x00ff66, size: 0.06 })));

    globe.rotation.y = (-30 * Math.PI) / 180;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const frame = () => {
      if (!reduced) globe.rotation.y += 0.002;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      gridGeo.dispose(); routeGeo.dispose(); ptsGeo.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <section className="panel" aria-labelledby="world-title">
      <h2 id="world-title">{t('world.title')}</h2>
      <div ref={host} className="world" role="img" aria-label={t('world.title')} />
      {noGl && <p className="muted">{t('world.nowebgl')}</p>}
    </section>
  );
}
