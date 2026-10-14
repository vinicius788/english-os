/** Restore a client route after GitHub Pages serves its 404.html fallback. */
export function restorePagesRoute(
  baseUrl: string,
  location: Pick<Location, 'search'>,
  history: Pick<History, 'replaceState'>,
) {
  const params = new URLSearchParams(location.search);
  const route = params.get('p');
  if (!route) return false;

  const basePath = baseUrl.replace(/\/$/, '');
  const routePath = route.startsWith('/') ? route : `/${route}`;
  const query = params.get('q');
  const hash = params.get('h');
  const destination = `${basePath}${routePath}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
  history.replaceState(null, '', destination);
  return true;
}
