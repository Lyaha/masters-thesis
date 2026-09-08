import { type ChangeEvent, type FormEvent, useState } from 'react';
import { parseStatisticsCsv, type StatisticRecord } from '../../csv';
import { useTranslation } from '../../i18n';
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
  const { t } = useTranslation();
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

  return (
    <div className="admin-grid">
      <section className="card">
        <h2>{t('csvImport')}</h2>
        <form className="form small" onSubmit={submit}>
          <label>
            {t('categories')}
            <select name="cat">
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('datasetTitle')}
            <input name="title" defaultValue="Новий статистичний набір" required />
          </label>
          <label>
            {t('period')}
            <input name="period" defaultValue="2025" required />
          </label>
          <label>
            {t('replaceDataset')}
            <select name="replace">
              <option value="">{t('doNotReplace')}</option>
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('csvFile')}
            <input type="file" accept=".csv,text/csv" onChange={selectFile} />
          </label>
          {fileName && (
            <p className="file-name">
              {t('selectedFile')}: {fileName}
            </p>
          )}
          <label>
            CSV
            <textarea value={csv} rows={9} onChange={(event) => validate(event.target.value)} />
          </label>
          {error && <p className="error">{error}</p>}
          <button disabled={!records.length}>
            {t('import')} {records.length ? `(${records.length})` : ''}
          </button>
        </form>
      </section>
      <Preview records={records} />
    </div>
  );
}

function Preview({ records }: { records: StatisticRecord[] }) {
  const { t } = useTranslation();

  return (
    <section className="card">
      <h2>{t('preview')}</h2>
      {records.length ? (
        <>
          <p className="preview-summary">
            {t('previewReady').replace('{count}', String(records.length))}
          </p>
          <div className="preview-table">
            <table>
              <thead>
                <tr>
                  <th>{t('institution')}</th>
                  <th>{t('region')}</th>
                  <th>{t('specialty')}</th>
                  <th>{t('year')}</th>
                  <th>{t('women')}</th>
                  <th>{t('men')}</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 5).map((record, index) => (
                  <tr key={`${record.institution}-${record.year}-${index}`}>
                    <td>{record.institution}</td>
                    <td>{record.region}</td>
                    <td>{record.specialty}</td>
                    <td>{record.year}</td>
                    <td>{record.womenCount}</td>
                    <td>{record.menCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="empty">{t('previewEmpty')}</p>
      )}
    </section>
  );
}
