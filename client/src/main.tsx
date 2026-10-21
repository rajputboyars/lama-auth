import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AuthProvider } from './hooks/auth';
import { ModeProvider } from './hooks/mode';
import { ThemeProvider } from './hooks/theme';
import { WizardProvider } from './hooks/wizard';
import { LangProvider } from './i18n';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LangProvider>
          <ModeProvider>
            <WizardProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </WizardProvider>
          </ModeProvider>
        </LangProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
