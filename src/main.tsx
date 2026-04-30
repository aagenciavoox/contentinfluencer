import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './styles/index.css';

// Registra o service worker — atualiza automaticamente em segundo plano
const updateSW = registerSW({
  immediate: true,

  onNeedRefresh() {
    if (import.meta.env.DEV) {
      console.log('[PWA] Nova versão disponível, atualizando...');
    }

    updateSW(true);
  },

  onOfflineReady() {
    if (import.meta.env.DEV) {
      console.log('[PWA] App pronto para uso offline.');
    }
  },

  onRegisteredSW(swUrl, registration) {
    if (import.meta.env.DEV) {
      console.log('[PWA] Service Worker registrado:', swUrl);
    }

    registration?.update();
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);