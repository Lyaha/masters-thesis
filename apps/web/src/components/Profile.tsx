import type { FormEvent } from 'react';
import { request as api } from '../api';
import { useTranslation } from '../i18n';
import type { Session } from '../types';
export function Profile({
  session,
  notify,
}: {
  session: Session;
  notify: (message: string, variant?: 'info' | 'error' | 'success') => void;
}) {
  const { t } = useTranslation();
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api(
        '/profile/statistics',
        {
          method: 'PUT',
          body: JSON.stringify({
            genderIdentity: form.get('gender'),
            institution: form.get('institution'),
            specialty: form.get('specialty'),
            educationLevel: form.get('level'),
            consent: form.get('consent') === 'on',
          }),
        },
        session,
      );
      notify(t('profileSaved'), 'success');
    } catch (error) {
      notify((error as Error).message);
    }
  };
  return (
    <section className="page">
      <span>{t('voluntaryStatistics')}</span>
      <h1>{t('profileTitle')}</h1>
      <p>{t('profileDescription')}</p>
      <form className="form" onSubmit={submit}>
        <label>
          {t('genderIdentity')}
          <select name="gender">
            <option value="woman">{t('woman')}</option>
            <option value="man">{t('man')}</option>
            <option value="nonbinary">{t('nonbinary')}</option>
            <option value="prefer_not_to_say">{t('preferNotToSay')}</option>
          </select>
        </label>
        <label>
          {t('institution')}
          <input name="institution" required placeholder={t('institutionPlaceholder')} />
        </label>
        <label>
          {t('specialty')}
          <input name="specialty" required defaultValue="Інженерія програмного забезпечення" />
        </label>
        <label>
          {t('educationLevel')}
          <select name="level">
            <option>{t('bachelor')}</option>
            <option>{t('master')}</option>
            <option>{t('another')}</option>
          </select>
        </label>
        <label className="check">
          <input name="consent" type="checkbox" required /> {t('consent')}
        </label>
        <button>{t('save')}</button>
      </form>
    </section>
  );
}
