import { type FormEvent, useEffect, useState } from 'react';
import { request as api } from '../../api';
import type { Category, Dataset, Session, Source } from '../../types';
import { CsvImport, type DatasetImport } from './CsvImport';

type Action = (url: string, options?: RequestInit) => Promise<boolean>;
type Notify = (message: string) => void;
type Tab = 'categories' | 'sources' | 'import';

const tabs: { id: Tab; name: string }[] = [
  { id: 'categories', name: 'Категорії' },
  { id: 'sources', name: 'API-джерела' },
  { id: 'import', name: 'Імпорт CSV' },
];

type Props = {
  session: Session;
  publicCategories: Category[];
  reloadCategories: () => Promise<void>;
  notify: Notify;
};

export function Admin({ session, publicCategories, reloadCategories, notify }: Props) {
  const [tab, setTab] = useState<Tab>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  const load = async () => {
    try {
      const [nextCategories, nextSources, nextDatasets] = await Promise.all([
        api<Category[]>('/admin/categories', {}, session),
        api<Source[]>('/admin/sources', {}, session),
        api<Dataset[]>('/admin/datasets', {}, session),
      ]);
      setCategories(nextCategories);
      setSources(nextSources);
      setDatasets(nextDatasets);
    } catch (error) {
      notify((error as Error).message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act: Action = async (url, options = {}) => {
    try {
      await api(url, options, session);
      await Promise.all([load(), reloadCategories()]);
      return true;
    } catch (error) {
      notify((error as Error).message);
      return false;
    }
  };

  const importDataset = async (dataset: DatasetImport) => {
    const imported = await act('/admin/datasets/import', {
      method: 'POST',
      body: JSON.stringify(dataset),
    });
    if (imported) notify(`Імпорт завершено: ${dataset.records.length} записів`);
    return imported;
  };

  const importCategories = categories.length ? categories : publicCategories;

  return (
    <section className="page admin">
      <span>КОНТРОЛЬ ДАНИХ</span>
      <h1>Адміністративна панель</h1>
      <div className="tabs">
        {tabs.map(({ id, name }) => (
          <button className={tab === id ? 'active' : ''} onClick={() => setTab(id)} key={id}>
            {name}
          </button>
        ))}
      </div>
      {tab === 'categories' && <Categories categories={categories} act={act} />}
      {tab === 'sources' && <Sources categories={categories} sources={sources} act={act} />}
      {tab === 'import' && (
        <CsvImport categories={importCategories} datasets={datasets} onImport={importDataset} />
      )}
    </section>
  );
}

function Categories({ categories, act }: { categories: Category[]; act: Action }) {
  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const created = await act('/admin/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: form.get('name'),
        description: form.get('description'),
        visible: true,
      }),
    });
    if (created) event.currentTarget.reset();
  };

  return (
    <div className="admin-grid">
      <section className="card">
        <h2>Нова категорія</h2>
        <form className="form small" onSubmit={add}>
          <label>
            Назва
            <input name="name" required />
          </label>
          <label>
            Опис
            <textarea name="description" required />
          </label>
          <button>Створити</button>
        </form>
      </section>
      <section className="card">
        <h2>Наявні категорії</h2>
        <List>
          {categories.map((category) => (
            <div className="row" key={category.id}>
              <div>
                <b>{category.name}</b>
                <small>{category.description}</small>
              </div>
              <button
                className="outline"
                onClick={() =>
                  act(`/admin/categories/${category.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ visible: !category.visible }),
                  })
                }
              >
                {category.visible ? 'Приховати' : 'Показати'}
              </button>
            </div>
          ))}
        </List>
      </section>
    </div>
  );
}

function Sources({
  categories,
  sources,
  act,
}: {
  categories: Category[];
  sources: Source[];
  act: Action;
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const categoryId = selectedCategoryId ?? categories[0]?.id ?? '';
  const isNewCategory = selectedCategoryId === '';

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const created = await act('/admin/sources', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: categoryId || undefined,
        category: isNewCategory
          ? {
              name: form.get('categoryName'),
              description: form.get('categoryDescription'),
            }
          : undefined,
        name: form.get('name'),
        baseUrl: form.get('url'),
        importType: form.get('type'),
        enabled: true,
      }),
    });
    if (created) event.currentTarget.reset();
  };

  return (
    <div className="admin-grid">
      <section className="card">
        <h2>Підключити джерело</h2>
        <form className="form small" onSubmit={add}>
          <label>
            Категорія
            <select
              value={categoryId}
              onChange={(event) => setSelectedCategoryId(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
              <option value="">+ Нова категорія</option>
            </select>
          </label>
          {isNewCategory && (
            <>
              <label>
                Назва нової категорії
                <input name="categoryName" required placeholder="Освітні дані ЄС" />
              </label>
              <label>
                Опис категорії
                <textarea name="categoryDescription" required />
              </label>
            </>
          )}
          <label>
            Назва
            <input name="name" required placeholder="UNESCO API" />
          </label>
          <label>
            URL
            <input name="url" type="url" placeholder="https://..." />
          </label>
          <label>
            Тип
            <select name="type">
              <option value="api">API</option>
              <option value="csv">CSV</option>
              <option value="manual">Ручне</option>
            </select>
          </label>
          <button>Додати</button>
        </form>
      </section>
      <section className="card">
        <h2>API-джерела</h2>
        <List>
          {sources.map((source) => (
            <div className="row" key={source.id}>
              <div>
                <b>{source.name}</b>
                <small>
                  {source.category_name} · {source.import_type}{' '}
                  {source.base_url && `· ${source.base_url}`}
                </small>
              </div>
              <div>
                <button
                  className="outline"
                  onClick={() =>
                    act(`/admin/sources/${source.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ enabled: !source.enabled }),
                    })
                  }
                >
                  {source.enabled ? 'Вимкнути' : 'Увімкнути'}
                </button>
                <button
                  className="danger"
                  onClick={() => act(`/admin/sources/${source.id}`, { method: 'DELETE' })}
                >
                  Видалити
                </button>
              </div>
            </div>
          ))}
        </List>
      </section>
    </div>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <div className="list">{children}</div>;
}
