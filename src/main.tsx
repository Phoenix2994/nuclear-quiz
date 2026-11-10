import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initNative, listenBack } from './native';
import './styles.css';

// Su nativo ripristina i dati salvati prima di mostrare l'interfaccia
initNative().finally(() => {
  listenBack();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
