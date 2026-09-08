import { type ChangeEvent, type FormEvent, useState } from 'react';
import { parseStatisticsCsv, type StatisticRecord } from '../../csv';
import type { Category, Dataset } from '../../types';

const exampleCsv = [
  'institution,region,specialty,educationLevel,year,womenCount,menCount,nonbinaryCount',
  'Демо університет,Київ,Інженерія програмного забезпечення,бакалавр,2025,120,210,3',
].join('\n');

export type DatasetImport = {
  categoryId: FormDataEntryValue | null;
  title: FormDataEntryValue | null;
  periodLabel: FormDataEntryValue | null;
  replaceDatasetId?: FormDataEntryValue;
  records: StatisticRecord[];
};

type Props = {
  categories: Category[];
  datasets: Dataset[];
  onImport: (dataset: DatasetImport) => Promise<boolean>;
};

export function CsvImport({ categories, datasets, onImport }: Props) {
  const [csv, setCsv] = useState(exampleCsv);
  const [records, setRecords] = useState<StatisticRecord[]>(() => parseStatisticsCsv(exampleCsv));
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const validate = (nextCsv: string) => {
    setCsv(nextCsv);
    try {
      setRecords(parseStatisticsCsv(nextCsv));
      setError('');
    } catch (reason) {
      setRecords([]);
      setError((reason as Error).message);
    }
  };

  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = Array.from(event.target.files || []);
    if (!file) return;

    try {
      validate(await file.text());
      setFileName(file.name);
    } catch (reason) {
      setRecords([]);
      setError((reason as Error).message);
      setFileName('');
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!records.length) return;

    const form = new FormData(event.currentTarget);
    const imported = await onImport({
      categoryId: form.get('cat'),
      title: form.get('title'),
      periodLabel: form.get('period'),
      replaceDatasetId: form.get('replace') || undefined,
      records,
    });

    if (imported) {
      setFileName('');
      event.currentTarget.reset();
    }
  };

  return <div className="admin-grid">
    <section className="card">
      <h2>Імпорт CSV</h2>
      <form className="form small" onSubmit={submit}>
        <label>
          Категорія
          <select name="cat">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        </label>
        <label>
          Назва набору
          <input name="title" defaultValue="Новий статистичний набір" required />
        </label>
        <label>
          Період
          <input name="period" defaultValue="2025" required />
        </label>
        <label>
          Замінити набір
          <select name="replace">
            <option value="">Не замінювати</option>
            {datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.title}</option>)}
          </select>
        </label>
        <label>
          CSV-файл
          <input type="file" accept=".csv,text/csv" onChange={selectFile} />
        </label>
        {fileName && <p className="file-name">Обрано файл: {fileName}</p>}
        <label>
          CSV
          <textarea value={csv} rows={9} onChange={(event) => validate(event.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button disabled={!records.length}>Імпортувати {records.length ? `(${records.length})` : ''}</button>
      </form>
    </section>
    <Preview records={records} />
  </div>;
}

function Preview({ records }: { records: StatisticRecord[] }) {
  return <section className="card">
    <h2>Передперегляд</h2>
    {records.length ? <>
      <p className="preview-summary">Готово до імпорту: {records.length} записів. Показано перші 5.</p>
      <div className="preview-table">
        <table>
          <thead>
            <tr>
              <th>ЗВО</th>
              <th>Регіон</th>
              <th>Спеціальність</th>
              <th>Рік</th>
              <th>Жінки</th>
              <th>Чоловіки</th>
            </tr>
          </thead>
          <tbody>
            {records.slice(0, 5).map((record, index) => <tr key={`${record.institution}-${record.year}-${index}`}>
              <td>{record.institution}</td>
              <td>{record.region}</td>
              <td>{record.specialty}</td>
              <td>{record.year}</td>
              <td>{record.womenCount}</td>
              <td>{record.menCount}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </> : <p className="empty">Завантажте коректний CSV, щоб побачити передперегляд.</p>}
  </section>;
}
