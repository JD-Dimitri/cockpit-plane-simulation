import { useEffect, useRef } from 'react';
import { t } from '../i18n/index.ts';

/** Avertissement obligatoire au premier lancement (EF-004). */
export function Disclaimer({ onAccept }: { onAccept: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => { button.current?.focus(); }, []);
  return (
    <div className="overlay">
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="disc-title" data-testid="disclaimer">
        <h1 id="disc-title">{t('disclaimer.title')}</h1>
        <p><strong>{t('disclaimer.body1')}</strong></p>
        <p>{t('disclaimer.body2')}</p>
        <p className="muted">{t('disclaimer.body3')}</p>
        <button ref={button} type="button" className="primary" onClick={onAccept} data-testid="disclaimer-accept">
          {t('disclaimer.accept')}
        </button>
      </section>
    </div>
  );
}
