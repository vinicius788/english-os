import { describe, expect, it, vi } from 'vitest';
import { restorePagesRoute } from './routes';

describe('GitHub Pages client route restoration', () => {
  it('restores a deep route and its search/hash under the repository base', () => {
    const replaceState = vi.fn();
    const search = `?p=${encodeURIComponent('/hoje')}&q=${encodeURIComponent('dia=28')}&h=${encodeURIComponent('atividade')}`;
    expect(restorePagesRoute('/english-os/', { search }, { replaceState })).toBe(true);
    expect(replaceState).toHaveBeenCalledWith(null, '', '/english-os/hoje?dia=28#atividade');
  });

  it('keeps the local base and leaves ordinary visits untouched', () => {
    const replaceState = vi.fn();
    expect(restorePagesRoute('/', { search: '' }, { replaceState })).toBe(false);
    expect(replaceState).not.toHaveBeenCalled();
  });
});
