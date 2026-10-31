// @vitest-environment jsdom
/**
 * Tests des composants React avec les vraies dépendances (React, Zustand, Three.js).
 * jsdom n'a pas de WebGL : on y vérifie le repli de la vue 3D ; le rendu WebGL réel
 * est vérifié dans le navigateur (tests/e2e) et dans l'application installée (tests/windows).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Disclaimer } from '../src/components/Disclaimer.tsx';
import { DataPanel } from '../src/components/DataPanel.tsx';
import { TopBar } from '../src/components/TopBar.tsx';
import { WorldView } from '../src/components/WorldView.tsx';
import { useSim } from '../src/store/simStore.ts';

afterEach(() => {
  cleanup();
  useSim.setState({ snap: null, error: null });
});

describe('Disclaimer (EF-004)', () => {
  it('affiche « non certifié », reçoit le focus et appelle onAccept', () => {
    const onAccept = vi.fn();
    render(<Disclaimer onAccept={onAccept} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('non certifié');
    const button = screen.getByTestId('disclaimer-accept');
    expect(document.activeElement).toBe(button);
    fireEvent.click(button);
    expect(onAccept).toHaveBeenCalledTimes(1);
  });
});

describe('TopBar', () => {
  it('sans instantané : boutons désactivés et message d’attente', () => {
    render(<TopBar />);
    expect(screen.getByTestId('sim-time').textContent).toBe('--:--:--');
    expect((screen.getByTestId('pause') as HTMLButtonElement).disabled).toBe(true);
  });

  it('avec un instantané : temps formaté et accélération active signalée', () => {
    useSim.setState({
      snap: { t: 3725.4, step: 0, paused: false, timeScale: 16, altitudeFt: 0, isa: { tempC: 15, pressureHpa: 1013.25, rho: 1.225, soundKt: 661 } },
    });
    render(<TopBar />);
    expect(screen.getByTestId('sim-time').textContent).toBe('01:02:05');
    expect(screen.getByTestId('scale-16').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('scale-1').getAttribute('aria-pressed')).toBe('false');
  });

  it('affiche une erreur du moteur', () => {
    useSim.setState({ error: 'panne simulée' });
    render(<TopBar />);
    expect(screen.getByRole('alert').textContent).toBe('panne simulée');
  });
});

describe('DataPanel (EF-001)', () => {
  it('chaque ligne affiche un statut ; MTOW documentée avec sa source, MLW estimée', () => {
    render(<DataPanel />);
    const rows = screen.getByTestId('data-table').querySelectorAll('tbody tr');
    expect(rows.length).toBe(7);
    const mtow = document.querySelector('[data-key="mass.mtow"]')!;
    expect(mtow.textContent).toContain('documenté');
    expect(mtow.textContent).toContain('Airbus');
    expect(document.querySelector('[data-key="mass.mlw"]')!.textContent).toContain('estimé');
  });
});

describe('WorldView', () => {
  it('sans WebGL : message de repli, aucune exception', () => {
    render(<WorldView />);
    expect(screen.getByText(/La 3D n'est pas disponible/)).toBeTruthy();
  });
});
