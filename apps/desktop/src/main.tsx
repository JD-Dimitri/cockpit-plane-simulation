import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Polices embarquées dans l'application (aucune requête réseau, ENF-002)
import '@fontsource/b612/400.css';
import '@fontsource/b612/700.css';
import '@fontsource/b612-mono/400.css';
import './styles.css';
import { App } from './App.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('Élément #root introuvable');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
