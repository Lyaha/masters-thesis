import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import { parseStatisticsCsv, type StatisticRecord } from '../../csv';
import { useTranslation } from '../../i18n';
import type { Category, Dataset } from '../../types';

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
  const [csv, setCsv] = useState('');
  const [records, setRecords] = useState<StatisticRecord[]>([]);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [phase, setPhase] = useState<'idle' | 'reading' | 'importing'>('idle');
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const busyRef = useRef(false);
  const busy = phase !== 'idle';

  const validate = (nextCsv: string) => {
    setCsv(nextCsv);
    setImportedCount(null);
    if (!nextCsv.trim()) {
      setRecords([]);
      setError('');
      return;
    }
    try {
      setRecords(parseStatisticsCsv(nextCsv));
      setError('');
    } catch (reason) {
      setRecords([]);
      setError((reason as Error).message);
    }
  };

  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    if (busyRef.current) return;
    const [file] = Array.from(event.target.files || []);
    if (!file) return;

    busyRef.current = true;
    setPhase('reading');
    setImportedCount(null);
    setError('');
    setCsv('');
    setRecords([]);
    setFileName(file.name);
    try {
      validate(await file.text());
    } catch (reason) {
      setRecords([]);
      setError((reason as Error).message);
      setFileName('');
    } finally {
      busyRef.current = false;
      setPhase('idle');
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busyRef.current || !records.length) return;

    const element = event.currentTarget;
    const form = new FormData(element);
    busyRef.current = true;
    setPhase('importing');
    setError('');
    setImportedCount(null);
    try {
      const imported = await onImport({
        categoryId: form.get('cat'),
        title: form.get('title'),
        periodLabel: form.get('period'),
        replaceDatasetId: form.get('replace') || undefined,
        records,
      });

      if (imported) {
        setImportedCount(records.length);
        setCsv('');
        setRecords([]);
        setFileName('');
        element.reset();
      } else {
        setError(t('importFailed'));
      }
    } catch {
      setError(t('importFailed'));
    } finally {
      busyRef.current = false;
      setPhase('idle');
    }
  };

  return (
    <div className="admin-grid">
      <section className="card">
        <h2>{t('csvImport')}</h2>
        <form className="form small" onSubmit={submit} aria-busy={busy}>
          <fieldset className="import-fields" disabled={busy}>
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
              <textarea
                value={csv}
                rows={9}
                placeholder={t('csvPlaceholder')}
                onChange={(event) => validate(event.target.value)}
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button disabled={busy || !records.length}>
              {t(
                phase === 'importing'
                  ? 'importInProgress'
                  : phase === 'reading'
                    ? 'csvReading'
                    : 'import',
              )}{' '}
              {records.length ? `(${records.length})` : ''}
            </button>
          </fieldset>
        </form>
        <div role="status" aria-live="polite" aria-atomic="true">
          {busy && (
            <div className="import-status">
              <span className="import-spinner" aria-hidden="true" />
              <div>
                <strong>{t(phase === 'reading' ? 'csvReading' : 'importInProgress')}</strong>
                <p>{t(phase === 'reading' ? 'csvReadingHint' : 'importWaitHint')}</p>
              </div>
            </div>
          )}
          {importedCount !== null && (
            <div className="import-status">
              <span aria-hidden="true">✓</span>
              <div>
                <strong>{t('importFinished').replace('{count}', String(importedCount))}</strong>
                <p>{t('importNextFile')}</p>
              </div>
            </div>
          )}
        </div>
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
