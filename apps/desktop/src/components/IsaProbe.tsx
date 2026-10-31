import { useEffect, useRef } from 'react';
import { t } from '../i18n/index.ts';
import { MAX_ALT_FT, MIN_ALT_FT, type DemoSnapshot } from '../sim/demoModel.ts';
import { send, useSim } from '../store/simStore.ts';

/**
 * Sonde ISA : un curseur (commande vers le moteur) et un petit écran canvas
 * dessiné à partir de l'instantané, comme le seront le PFD et le ND.
 */
export function IsaProbe() {
  const snap = useSim((s) => s.snap);
  return (
    <section className="panel" aria-labelledby="probe-title">
      <h2 id="probe-title">{t('probe.title')}</h2>
      <label className="slider">
        <span>{t('probe.altitude')} : <output className="mono" data-testid="probe-alt">{snap ? Math.round(snap.altitudeFt) : '—'}</output> ft</span>
        <input
          type="range"
          min={MIN_ALT_FT}
          max={MAX_ALT_FT}
          step={500}
          defaultValue={0}
          disabled={!snap}
          data-testid="probe-slider"
          onChange={(e) => send({ type: 'probe.altitude', feet: Number(e.currentTarget.value) })}
        />
      </label>
      <ProbeDisplay snap={snap} />
      <dl className="readout">
        <dt>{t('probe.temperature')}</dt><dd className="mono" data-testid="probe-temp">{snap ? snap.isa.tempC.toFixed(2) : '—'} °C</dd>
        <dt>{t('probe.pressure')}</dt><dd className="mono">{snap ? snap.isa.pressureHpa.toFixed(1) : '—'} hPa</dd>
        <dt>{t('probe.density')}</dt><dd className="mono">{snap ? snap.isa.rho.toFixed(4) : '—'} kg/m³</dd>
        <dt>{t('probe.sound')}</dt><dd className="mono">{snap ? snap.isa.soundKt.toFixed(1) : '—'} kt</dd>
      </dl>
      <p className="muted small">{t('probe.hint')}</p>
    </section>
  );
}

/** Écran de démonstration : bande d'altitude façon écran avion, police B612. */
function ProbeDisplay({ snap }: { snap: DemoSnapshot | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    const dpr = window.devicePixelRatio || 1;
    const W = 320, H = 180;
    if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    if (!snap) return;
    const alt = snap.altitudeFt;
    g.font = '13px "B612 Mono", monospace';
    g.textBaseline = 'middle';
    // graduations tous les 500 ft, 100 ft = 6 px
    for (let a = Math.floor((alt - 1500) / 500) * 500; a <= alt + 1500; a += 500) {
      const y = H / 2 - (a - alt) * 0.06;
      g.strokeStyle = '#fff';
      g.beginPath(); g.moveTo(230, y); g.lineTo(244, y); g.stroke();
      if (a % 1000 === 0) { g.fillStyle = '#fff'; g.fillText(String(a / 100).padStart(3, '0'), 250, y); }
    }
    // fenêtre de lecture : masque les graduations situées dessous
    g.fillStyle = '#000';
    g.fillRect(226, H / 2 - 12, 88, 24);
    g.strokeStyle = '#ffd400'; g.lineWidth = 2;
    g.strokeRect(226, H / 2 - 12, 88, 24);
    g.lineWidth = 1;
    g.fillStyle = '#00ff66';
    g.font = '15px "B612 Mono", monospace';
    g.fillText(String(Math.round(alt)), 236, H / 2);
    g.fillStyle = '#00c8ff';
    g.font = '13px "B612", sans-serif';
    g.fillText(`SAT ${snap.isa.tempC.toFixed(0)}°C`, 16, 40);
    g.fillText(`${snap.isa.pressureHpa.toFixed(0)} hPa`, 16, 64);
    g.fillStyle = '#fff';
    g.fillText(`×${snap.timeScale}${snap.paused ? '  PAUSE' : ''}`, 16, H - 24);
  }, [snap]);
  return (
    <canvas
      ref={canvas}
      className="display"
      style={{ width: 320, height: 180 }}
      role="img"
      aria-label={snap ? `Altitude ${Math.round(snap.altitudeFt)} pieds, température ${snap.isa.tempC.toFixed(0)} degrés` : 'Écran éteint'}
    />
  );
}
