// Lazy SVG icon loader. Matches the vanilla Icons class — fetches /images/icons/<name>.svg
// from the Express backend once and caches the raw SVG string.
const cache = new Map();
const inflight = new Map();

export async function loadIcon(name) {
  if (cache.has(name)) return cache.get(name);
  if (inflight.has(name)) return inflight.get(name);

  const url = `/images/icons/${name}.svg`;
  const promise = fetch(url)
    .then((res) => (res.ok ? res.text() : ''))
    .then((text) => {
      cache.set(name, text);
      inflight.delete(name);
      return text;
    })
    .catch(() => {
      inflight.delete(name);
      cache.set(name, '');
      return '';
    });

  inflight.set(name, promise);
  return promise;
}
