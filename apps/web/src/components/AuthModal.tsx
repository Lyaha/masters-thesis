import { type FormEvent, useState } from 'react';
import { request as api } from '../api';
import { useTranslation } from '../i18n';
import type { Session } from '../types';
export function AuthModal({
  close,
  done,
}: {
  close: () => void;
  done: (session: Session) => void;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      done(
        await api(`/auth/${mode}`, {
          method: 'POST',
          body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
        }),
      );
    } catch (reason) {
      setError((reason as Error).message);
    }
  };
  return (
    <div className="veil">
      <form className="modal" onSubmit={submit}>
        <button type="button" className="x" onClick={close} aria-label={t('close')}>
          ×
        </button>
        <span>{t('personalArea')}</span>
        <h2>{mode === 'login' ? t('signIn') : t('registration')}</h2>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          {t('password')}
          <input name="password" type="password" minLength={8} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button>{mode === 'login' ? t('signIn') : t('createAccount')}</button>
        <button
          className="link"
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? t('register') : t('haveAccount')}
        </button>
      </form>
    </div>
  );
}
