import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {registerPwaUpdates} from './lib/pwaRegister';
import {watchPortugueseEditing} from './lib/portugueseEditing';
import './styles/index.css';

registerPwaUpdates();
watchPortugueseEditing();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
