import { useEffect, useState } from 'react';
import { Disclaimer } from './components/Disclaimer.tsx';
import { TopBar } from './components/TopBar.tsx';
import { IsaProbe } from './components/IsaProbe.tsx';
import { WorldView } from './components/WorldView.tsx';
import { DataPanel } from './components/DataPanel.tsx';
import { t } from './i18n/index.ts';
import { acceptDisclaimer, isDisclaimerAccepted } from './storage/settings.ts';
import { startEngine } from './store/simStore.ts';

export function App() {
  const [accepted, setAccepted] = useState(isDisclaimerAccepted);

  useEffect(() => { if (accepted) startEngine(1); }, [accepted]);

  if (!accepted) {
    return <Disclaimer onAccept={() => { acceptDisclaimer(); setAccepted(true); }} />;
  }
  return (
    <div className="app">
      <TopBar />
      <main className="grid" data-testid="main">
        <IsaProbe />
        <WorldView />
        <DataPanel />
      </main>
      <footer className="footer">
        <span>{t('app.phase')}</span>
        <span>{t('footer.notice')}</span>
      </footer>
    </div>
  );
}
