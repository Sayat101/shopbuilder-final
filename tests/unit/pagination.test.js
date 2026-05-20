const { buildPaginationMeta } = require('../../src/utils/pagination');

describe('Pagination', () => {
  test('returns hasMore=false when items <= limit', () => {
    const items = [{ id: '1' }, { id: '2' }];
    const result = buildPaginationMeta(items, 20);
    expect(result.meta.hasMore).toBe(false);
    expect(result.meta.nextCursor).toBeNull();
    expect(result.data).toHaveLength(2);
  });

  test('returns nextCursor and hasMore=true when more items exist', () => {
    // Simulate limit=2, we fetched 3 (limit+1)
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const result = buildPaginationMeta(items, 2);
    expect(result.meta.hasMore).toBe(true);
    expect(result.meta.nextCursor).toBe('b');
    expect(result.data).toHaveLength(2);
  });
});
