import { HttpError } from '../http.js';

const edboEndpoint = 'https://registry.edbo.gov.ua/api/opendata/university-entrant';

export const sourceEndpoints = [
  edboEndpoint,
  `${edboEndpoint}/`,
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/educ_uoe_enrt03',
] as const;

export function isAllowedSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      !url.hash &&
      !url.search &&
      sourceEndpoints.includes(url.href as (typeof sourceEndpoints)[number])
    );
  } catch {
    return false;
  }
}

export type FetchData = (url: URL, options: RequestInit) => Promise<Response>;

export const fetchOpenData: FetchData = async (url, options) => {
  const endpoint = new URL(url);
  endpoint.search = '';
  if (!isAllowedSourceUrl(endpoint.href)) throw new HttpError(400, 'Недозволена адреса джерела');
  const target = new URL(url);
  // EDEBO's legacy trailing-slash address returns 308. Use its known canonical
  // endpoint directly while continuing to reject all HTTP redirects.
  if (endpoint.href === `${edboEndpoint}/`) target.pathname = new URL(edboEndpoint).pathname;
  try {
    return await fetch(target, { ...options, redirect: 'error' });
  } catch {
    throw new HttpError(502, 'Зовнішнє джерело тимчасово недоступне');
  }
};
