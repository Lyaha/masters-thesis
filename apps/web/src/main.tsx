import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './theme';
import { ToastProvider } from './toast';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <I18nProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </I18nProvider>
  </ThemeProvider>,
);
