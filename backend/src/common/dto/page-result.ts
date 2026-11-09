export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export class PageResult<T> {
  constructor(
    readonly items: T[],
    readonly meta: PageMeta,
  ) {}

  static of<T>(items: T[], total: number, page: number, pageSize: number): PageResult<T> {
    return new PageResult(items, {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  }
}
