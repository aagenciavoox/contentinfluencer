import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Registra o service worker — atualiza automaticamente em segundo plano
registerSW({
  onNeedRefresh() {
    // Atualização disponível: recarrega silenciosamente
    // (registerType: 'autoUpdate' já faz isso, mas mantemos para log)
    if (import.meta.env.DEV) {
      console.log('[PWA] Nova versão disponível, atualizando...');
    }
  },
  onOfflineReady() {
    if (import.meta.env.DEV) {
      console.log('[PWA] App pronto para uso offline.');
    }
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
