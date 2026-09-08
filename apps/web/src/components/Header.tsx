import type { Session } from '../types';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';
type Screen = 'dash' | 'profile' | 'admin';
type Props = {
  screen: Screen;
  session: Session;
  setScreen: (screen: Screen) => void;
  logout: () => void;
  openAuth: () => void;
};
export function Header({ screen, session, setScreen, logout, openAuth }: Props) {
  const { language, setLanguage, t } = useTranslation();
  const { mode, setMode } = useTheme();

  return (
    <header>
      <button className="brand" onClick={() => setScreen('dash')}>
        ◒ <b>Gender IT Observatory</b>
      </button>
      <nav>
        <button className={screen === 'dash' ? 'active' : ''} onClick={() => setScreen('dash')}>
          {t('dashboard')}
        </button>
        {session && (
          <button
            className={screen === 'profile' ? 'active' : ''}
            onClick={() => setScreen('profile')}
          >
            {t('profile')}
          </button>
        )}
        {session?.role === 'admin' && (
          <button className={screen === 'admin' ? 'active' : ''} onClick={() => setScreen('admin')}>
            {t('admin')}
          </button>
        )}
      </nav>
      <div className="header-tools">
        <div className="preferences">
          <label>
            <span>{t('language')}</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as 'uk' | 'en')}
            >
              <option value="uk">Українська</option>
              <option value="en">English</option>
            </select>
          </label>
          <label>
            <span>{t('theme')}</span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as 'system' | 'light' | 'dark')}
            >
              <option value="system">{t('themeSystem')}</option>
              <option value="light">{t('themeLight')}</option>
              <option value="dark">{t('themeDark')}</option>
            </select>
          </label>
        </div>
        {session ? (
          <button className="outline" onClick={logout}>
            {t('logout')}
          </button>
        ) : (
          <button onClick={openAuth}>{t('login')}</button>
        )}
      </div>
    </header>
  );
}
