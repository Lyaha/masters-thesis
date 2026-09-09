// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import { CsvImport, type DatasetImport } from './CsvImport';

const csv = [
  'institution,region,specialty,educationLevel,year,womenCount,menCount,nonbinaryCount',
  'Test university,Kyiv,Software engineering,bachelor,2025,120,210,3',
].join('\n');

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe('CSV import lifecycle', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    localStorage.setItem('language', 'en');
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  function element<T extends Element>(selector: string): T {
    const found = container.querySelector<T>(selector);
    if (!found) throw new Error(`Missing element: ${selector}`);
    return found;
  }

  async function render(onImport: (dataset: DatasetImport) => Promise<boolean>) {
    await act(async () => {
      root.render(
        <I18nProvider>
          <CsvImport
            categories={[{ id: 'test', name: 'Test data', description: '' }]}
            datasets={[]}
            onImport={onImport}
          />
        </I18nProvider>,
      );
    });
  }

  async function selectFile(text: () => Promise<string> = async () => csv) {
    const input = element<HTMLInputElement>('input[type=file]');
    const file = new File([csv], 'test.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'text', { value: text });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
  }

  async function submit() {
    await act(async () => {
      element('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
  }

  it('starts empty and does not offer the placeholder as importable data', async () => {
    const onImport = vi.fn(async () => true);
    await render(onImport);
    expect(element<HTMLTextAreaElement>('textarea').value).toBe('');
    expect(element<HTMLButtonElement>('button').disabled).toBe(true);
    expect(container.querySelector('table')).toBeNull();
    await submit();
    expect(onImport).not.toHaveBeenCalled();
  });

  it('shows file reading, locks the form, then displays the parsed preview', async () => {
    const reading = deferred<string>();
    const onImport = vi.fn(async () => true);
    await render(onImport);
    await selectFile(() => reading.promise);
    expect(element('[role=status]').textContent).toContain('Reading CSV');
    expect(element<HTMLFieldSetElement>('fieldset').disabled).toBe(true);
    await submit();
    expect(onImport).not.toHaveBeenCalled();
    await act(async () => reading.resolve(csv));
    expect(element<HTMLFieldSetElement>('fieldset').disabled).toBe(false);
    expect(element('table').textContent).toContain('Test university');
    expect(element<HTMLButtonElement>('button').disabled).toBe(false);
  });

  it('blocks duplicate submissions, clears successful imports and allows a new selection', async () => {
    const importing = deferred<boolean>();
    const onImport = vi.fn(() => importing.promise);
    await render(onImport);
    await selectFile();
    const reset = vi.spyOn(element<HTMLFormElement>('form'), 'reset');
    await submit();
    await submit();
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: 'test',
        records: [expect.objectContaining({ institution: 'Test university' })],
      }),
    );
    expect(element('form').getAttribute('aria-busy')).toBe('true');
    expect(element('[role=status]').textContent).toContain('Importing data');
    expect(element<HTMLFieldSetElement>('fieldset').disabled).toBe(true);
    await act(async () => importing.resolve(true));
    expect(reset).toHaveBeenCalledOnce();
    expect(element<HTMLTextAreaElement>('textarea').value).toBe('');
    expect(container.querySelector('.file-name')).toBeNull();
    expect(container.querySelector('table')).toBeNull();
    expect(element<HTMLButtonElement>('button').disabled).toBe(true);
    expect(element('[role=status]').textContent).toContain('Import complete: 1 records');
    await submit();
    expect(onImport).toHaveBeenCalledTimes(1);
    await selectFile();
    expect(element('[role=status]').textContent).not.toContain('Import complete');
    expect(element<HTMLButtonElement>('button').disabled).toBe(false);
  });

  it.each(['false', 'exception'])('retains data and unlocks after %s failure', async (failure) => {
    const onImport = vi.fn(async () => {
      if (failure === 'exception') throw new Error('Network unavailable');
      return false;
    });
    await render(onImport);
    await selectFile();
    await submit();
    expect(element<HTMLTextAreaElement>('textarea').value).toBe(csv);
    expect(element('.file-name').textContent).toContain('test.csv');
    expect(element('table').textContent).toContain('Test university');
    expect(element<HTMLFieldSetElement>('fieldset').disabled).toBe(false);
    expect(element<HTMLButtonElement>('button').disabled).toBe(false);
    expect(element('[role=alert]').textContent).toContain('Could not confirm the import');
    await submit();
    expect(onImport).toHaveBeenCalledTimes(2);
  });

  it('discards stale records when reading the next file fails', async () => {
    const onImport = vi.fn(async () => true);
    await render(onImport);
    await selectFile();
    await selectFile(async () => {
      throw new Error('Cannot read file');
    });
    expect(element<HTMLTextAreaElement>('textarea').value).toBe('');
    expect(element('[role=alert]').textContent).toContain('Cannot read file');
    expect(element<HTMLFieldSetElement>('fieldset').disabled).toBe(false);
    expect(element<HTMLButtonElement>('button').disabled).toBe(true);
    await submit();
    expect(onImport).not.toHaveBeenCalled();
  });
});
