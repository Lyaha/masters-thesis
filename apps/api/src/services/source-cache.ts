export function cachedSource<T>(load: (url: string) => Promise<T>, ttl: number) {
  const cache = new Map<string, { expires: number; value: T }>();
  const pending = new Map<string, Promise<T>>();
  return (url: string): Promise<T> => {
    const found = cache.get(url);
    if (found && found.expires > Date.now()) return Promise.resolve(found.value);
    const running = pending.get(url);
    if (running) return running;
    const request = Promise.resolve()
      .then(() => load(url))
      .then((value) => {
        if (cache.size >= 32) cache.delete(cache.keys().next().value!);
        cache.set(url, { value, expires: Date.now() + ttl });
        return value;
      })
      .finally(() => pending.delete(url));
    pending.set(url, request);
    return request;
  };
}
