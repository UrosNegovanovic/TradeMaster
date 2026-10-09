/**
 * A list query that failed before it ever returned data (ROADMAP A9.5). Without this check the `= []`
 * default makes a failed load look like an empty account ("napravite prvu fakturu"). A failed refetch
 * keeps showing the data that was already loaded.
 */
export function failedBeforeFirstLoad(query: { isError: boolean; dataUpdatedAt: number }): boolean {
  return query.isError && query.dataUpdatedAt === 0
}
