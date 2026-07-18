/**
 * Type-safe offset pagination shared across admin data tables (user lists,
 * transaction logs, audit trails). Keeps page/size parsing, bounds-clamping
 * and the count+fetch round-trip in one reusable place.
 */

export interface PageInput {
  page?: string | number | null;
  pageSize?: string | number | null;
}

export interface PageParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Normalises untrusted query params into safe, clamped values. */
export function parsePageParams(
  input: PageInput,
  opts: { defaultSize?: number; maxSize?: number } = {},
): PageParams {
  const defaultSize = opts.defaultSize ?? 20;
  const maxSize = opts.maxSize ?? 100;

  const page = Math.max(1, Math.floor(Number(input.page) || 1));
  const pageSize = Math.min(maxSize, Math.max(1, Math.floor(Number(input.pageSize) || defaultSize)));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/**
 * Runs the count and the page query together and assembles a typed result.
 * The caller supplies the two Prisma calls, so it stays model-agnostic while
 * `T` is inferred from `findMany`:
 *
 *   const users = await paginate(params, {
 *     count: () => readPrisma.user.count({ where }),
 *     findMany: ({ skip, take }) =>
 *       readPrisma.user.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
 *   });
 */
export async function paginate<T>(
  params: PageParams,
  queries: {
    count: () => Promise<number>;
    findMany: (args: { skip: number; take: number }) => Promise<T[]>;
  },
): Promise<Paginated<T>> {
  const [total, items] = await Promise.all([
    queries.count(),
    queries.findMany({ skip: params.skip, take: params.take }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  return {
    items,
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages,
    hasNext: params.page < totalPages,
    hasPrev: params.page > 1,
  };
}
