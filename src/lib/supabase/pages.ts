const PAGE = 1000;

/** Every row a query returns, a thousand at a time: the API hands back at most 1,000 per request. */
export async function allPages<T>(what: string, page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { code?: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) {
      console.error(`loading ${what} failed`, { code: error.code });
      throw new Error(`Could not load ${what}`);
    }
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}
