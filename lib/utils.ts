export function getRowKey(row: Record<string, string>): string {
  const title = row.title || row.signal_title || row.brief_title || row.name || '';
  const url = row.url || row.link || '';
  const date = row.pub_date || row.date || row.published_date || row.created_at || row.queued_at || '';
  if (url) return `url:${url}`;
  if (title) return `title:${title}-${date}`;
  return `json:${JSON.stringify(row)}`;
}
