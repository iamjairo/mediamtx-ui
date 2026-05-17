import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './styles/main.css';
import App from './App.jsx';
import { ToastProvider } from './lib/toast.jsx';
import { SettingsProvider } from './lib/settings.jsx';
import { ViewerHintProvider } from './lib/viewerHint.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <SettingsProvider>
          <ViewerHintProvider>
            <App />
          </ViewerHintProvider>
        </SettingsProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);
