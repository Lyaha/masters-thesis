import { useEffect, useMemo, useState } from 'react';
import { request as api } from './api';
import { AuthModal } from './components/AuthModal';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { Profile } from './components/Profile';
import { Admin } from './components/admin/Admin';
import { filterRows, type DashboardFilters } from './dashboard-filters';
import { calculateTotals } from './metrics';
import type { Category, DashboardRow, Session } from './types';

type Screen = 'dash' | 'profile' | 'admin';

export function App() {
  const [screen, setScreen] = useState<Screen>('dash');
  const [session, setSession] = useState<Session>(() =>
    JSON.parse(localStorage.getItem('session') || 'null'),
  );
  const [showAuth, setShowAuth] = useState(false);
  const [notice, setNotice] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>({});

  const loadCategories = () =>
    api<Category[]>('/categories')
      .then((items) => {
        setCategories(items);
        setCategoryId((value) => value || items[0]?.id || '');
      })
      .catch((error) => setNotice(error.message));

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (categoryId) {
      api<DashboardRow[]>(`/dashboard?categoryId=${categoryId}`)
        .then(setRows)
        .catch((error) => setNotice(error.message));
    }
  }, [categoryId]);

  const filteredRows = useMemo(() => filterRows(rows, filters), [rows, filters]);
  const totals = useMemo(() => calculateTotals(filteredRows), [filteredRows]);
  const total = totals.w + totals.m + totals.n;
  const logout = () => {
    localStorage.removeItem('session');
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
        {notice && (
          <p className="notice">
            {notice}
            <button onClick={() => setNotice('')}>×</button>
          </p>
        )}
        {screen === 'dash' && (
          <Dashboard
            categories={categories}
            categoryId={categoryId}
            setCategoryId={selectCategory}
            rows={rows}
            filteredRows={filteredRows}
            filters={filters}
            setFilters={setFilters}
            totals={totals}
            total={total}
            openProfile={openProfile}
          />
        )}
        {screen === 'profile' && session && <Profile session={session} notify={setNotice} />}
        {screen === 'admin' && session?.role === 'admin' && (
          <Admin
            session={session}
            publicCategories={categories}
            reloadCategories={loadCategories}
            notify={setNotice}
          />
        )}
      </main>
      {showAuth && (
        <AuthModal
          done={(newSession) => {
            localStorage.setItem('session', JSON.stringify(newSession));
            setSession(newSession);
            setShowAuth(false);
            setNotice('Авторизація успішна.');
          }}
          close={() => setShowAuth(false)}
        />
      )}
    </>
  );
}
