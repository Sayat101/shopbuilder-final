/**
 * Builds Prisma cursor pagination args from query params.
 * Usage: const { take, skip, cursor } = buildPaginationArgs(req.query);
 */
function buildPaginationArgs(query) {
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  const cursor = query.cursor || undefined;

  const args = { take: limit + 1 };
  if (cursor) {
    args.cursor = { id: cursor };
    args.skip = 1;
  }

  return args;
}

/**
 * Builds pagination meta from results.
 * Pass limit+1 items, it will slice and compute nextCursor.
 */
function buildPaginationMeta(items, limit) {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return {
    data,
    meta: {
      limit,
      nextCursor,
      hasMore,
    },
  };
}

module.exports = { buildPaginationArgs, buildPaginationMeta };
