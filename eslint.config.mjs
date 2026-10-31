// Règles d'architecture (docs/TECHNICAL_ARCHITECTURE.md § 2 et § 8) :
// - les paquets du moteur n'importent ni React, ni le DOM, ni Three.js ;
// - aucune écriture HTML brute (fin de l'injection innerHTML du prototype v0).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const noRawHtml = {
  'no-restricted-properties': ['error',
    { property: 'innerHTML', message: 'Interdit : utiliser le rendu React (échappement automatique).' },
    { property: 'outerHTML', message: 'Interdit : utiliser le rendu React.' },
  ],
  'no-restricted-syntax': ['error',
    { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'Interdit : aucune donnée HTML brute.' },
    { selector: "CallExpression[callee.property.name='insertAdjacentHTML']", message: 'Interdit.' },
  ],
};

export default tseslint.config(
  { ignores: ['**/dist/**', '**/target/**', 'legacy/**', 'tools/offline-check/out/**', '**/node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: noRawHtml },
  {
    files: ['packages/**/*.ts'],
    languageOptions: { globals: { ...globals.es2022 } },
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['react', 'react-dom', 'react/*'], message: 'Le moteur ne connaît pas l’interface.' },
          { group: ['three', 'three/*'], message: 'Le moteur ne dépend pas du rendu 3D.' },
          { group: ['@tauri-apps/*'], message: 'Le moteur ne dépend pas de Tauri.' },
        ],
      }],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'navigator'],
    },
  },
  {
    files: ['apps/desktop/src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    // scripts Node qui exécutent aussi du code dans la page (page.evaluate)
    files: ['tests/**/*.mjs', 'tools/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
