import { A350, entries, type SourcedValue } from '@a350/aircraft-a350';
import { t, type TextKey } from '../i18n/index.ts';

const SHOWN = ['mass.mtow', 'mass.mlw', 'fuel.capacity', 'geometry.wingArea', 'engine.thrustTakeoff', 'engine.tgtTakeoff', 'speeds.vmo'];

/** Montre que chaque valeur porte son statut et sa source (EF-001), rendue par React (texte échappé). */
export function DataPanel() {
  const rows = entries(A350.data).filter(([k]) => SHOWN.includes(k));
  return (
    <section className="panel" aria-labelledby="data-title">
      <h2 id="data-title">{t('data.title')}</h2>
      <table className="data" data-testid="data-table">
        <thead><tr><th scope="col">{t('data.value')}</th><th scope="col">{t('data.status')}</th><th scope="col">{t('data.source')}</th></tr></thead>
        <tbody>
          {rows.map(([key, v]) => (
            <tr key={key} data-key={key}>
              <td><span className="mono">{key}</span><br />{format(v)}</td>
              <td><span className={`badge ${badgeClass(v)}`}>{t(`status.${v.status}` as TextKey)}</span></td>
              <td className="small">{v.source ? A350.sources[v.source]?.title : v.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function format(v: SourcedValue): string {
  const n = typeof v.value === 'number' ? v.value.toLocaleString('fr-FR') : v.value;
  return v.unit ? `${n} ${v.unit}` : n;
}

function badgeClass(v: SourcedValue): string {
  return v.status === 'documenté' ? 'ok' : v.status === 'estimé' ? 'warn' : 'fict';
}
