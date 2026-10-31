import { ALLOWED_TIME_SCALES } from '@a350/sim-core';
import { t } from '../i18n/index.ts';
import { send, useSim } from '../store/simStore.ts';

const SCALES = ALLOWED_TIME_SCALES.filter((s) => [1, 4, 16, 64, 256].includes(s));

function hms(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return [h, m, r].map((v) => String(v).padStart(2, '0')).join(':');
}

export function TopBar() {
  const snap = useSim((s) => s.snap);
  const error = useSim((s) => s.error);
  return (
    <header className="topbar">
      <span className="brand">{t('app.title')}</span>
      <div className="clock" role="group" aria-label={t('clock.label')}>
        <span className="label">{t('clock.label')}</span>
        <output className="mono big" data-testid="sim-time" aria-live="off">
          {snap ? hms(snap.t) : '--:--:--'}
        </output>
        <button
          type="button"
          data-testid="pause"
          disabled={!snap}
          aria-pressed={snap?.paused ?? false}
          onClick={() => send({ type: 'sim.pause', paused: !snap?.paused })}
        >
          {snap?.paused ? t('clock.resume') : t('clock.pause')}
        </button>
        <span className="label">{t('clock.scale')}</span>
        {SCALES.map((s) => (
          <button
            key={s}
            type="button"
            data-testid={`scale-${s}`}
            disabled={!snap}
            aria-pressed={snap?.timeScale === s}
            onClick={() => send({ type: 'sim.timeScale', value: s })}
          >
            ×{s}
          </button>
        ))}
      </div>
      {!snap && !error && <span className="muted">{t('clock.waiting')}</span>}
      {error && <span className="error" role="alert">{error}</span>}
    </header>
  );
}
