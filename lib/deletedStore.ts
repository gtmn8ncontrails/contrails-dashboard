import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'deleted_entries.json');

export type DeletedEntry = {
  row: Record<string, string>;
  sourceKey: 'stage1' | 'approvedBriefs' | 'stage3Queue' | 'stage3Output' | 'rejectedSignals' | 'errors' | 'w2Errors';
  deletedAt: number;
};

export function getDeletedEntries(): DeletedEntry[] {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading deleted entries:', error);
    return [];
  }
}

export function saveDeletedEntries(entries: DeletedEntry[]): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(entries, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving deleted entries:', error);
  }
}

export function getRowKey(row: Record<string, string>): string {
  const title = row.title || row.signal_title || row.brief_title || row.name || '';
  const url = row.url || row.link || '';
  const date = row.pub_date || row.date || row.published_date || row.created_at || row.queued_at || '';
  if (url) return `url:${url}`;
  if (title) return `title:${title}-${date}`;
  return `json:${JSON.stringify(row)}`;
}
