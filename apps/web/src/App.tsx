import { useEffect, useState } from 'react';
import { request as api } from './api';
import { AuthModal } from './components/AuthModal';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { Profile } from './components/Profile';
import { Admin } from './components/admin/Admin';
import type { DashboardFilters } from './dashboard-filters';
import { useTranslation } from './i18n';
import { useToast } from './toast';
import type { Category, DashboardData, Session } from './types';
import { readSession, writeSetting } from './storage';

type Screen = 'dash' | 'profile' | 'admin';

export function App() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [screen, setScreen] = useState<Screen>('dash');
  const [session, setSession] = useState<Session>(readSession);
  const [showAuth, setShowAuth] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    kind: 'gender-statistics',
    rows: [],
  });
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [loadedCategoryId, setLoadedCategoryId] = useState('');
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading');

  const loadCategories = () =>
    api<Category[]>('/categories')
      .then((items) => {
        setCategories(items);
        setCategoryId((value) =>
          items.some((item) => item.id === value) ? value : items[0]?.id || '',
        );
      })
      .catch((error) => notify(error.message, 'error'));

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoadState(categoryId ? 'loading' : 'ready');
    if (!categoryId) return () => controller.abort();
    api<DashboardData>(`/dashboard?categoryId=${categoryId}`, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setDashboardData(data);
        setLoadedCategoryId(categoryId);
        setLoadState('ready');
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setLoadState('error');
        notify(error.message, 'error');
      });
    return () => controller.abort();
  }, [categoryId, notify]);

  const logout = () => {
    writeSetting('session', null);
    setSession(null);
    setScreen('dash');
  };
  const selectCategory = (id: string) => {
    setCategoryId(id);
    setFilters({});
  };
  const openProfile = () => (session ? setScreen('profile') : setShowAuth(true));

  return (
    <>
      <Header
        screen={screen}
        session={session}
        setScreen={setScreen}
        logout={logout}
        openAuth={() => setShowAuth(true)}
      />
      <main>
        {screen === 'dash' && (
          <Dashboard
            categories={categories}
            categoryId={categoryId}
            setCategoryId={selectCategory}
            data={
              loadedCategoryId === categoryId && loadState === 'ready'
                ? dashboardData
                : { kind: 'gender-statistics', rows: [] }
            }
            loadState={
              loadedCategoryId !== categoryId && loadState === 'ready' && categoryId
                ? 'loading'
                : loadState
            }
            filters={filters}
            setFilters={setFilters}
            openProfile={openProfile}
          />
        )}
        {screen === 'profile' && session && <Profile session={session} notify={notify} />}
        {screen === 'admin' && session?.role === 'admin' && (
          <Admin
            session={session}
            publicCategories={categories}
            reloadCategories={loadCategories}
            notify={notify}
          />
        )}
      </main>
      {showAuth && (
        <AuthModal
          done={(newSession) => {
            writeSetting('session', JSON.stringify(newSession));
            setSession(newSession);
            setShowAuth(false);
            notify(t('loginSuccess'), 'success');
          }}
          close={() => setShowAuth(false)}
        />
      )}
    </>
  );
}
