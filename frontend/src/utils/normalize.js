export function extractList(data, ...keys) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  for (const value of Object.values(data || {})) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

export function extractTotal(data) {
  return data?.total ?? data?.count ?? 0;
}

export function extractTotalPages(data, perPage = 20) {
  return data?.total_pages ?? data?.pages ?? Math.ceil(extractTotal(data) / perPage) || 1;
}
