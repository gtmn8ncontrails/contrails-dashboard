import { NextResponse } from 'next/server';
import { getDeletedEntries, saveDeletedEntries, getRowKey, DeletedEntry } from '@/lib/deletedStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const entries = getDeletedEntries();
    return NextResponse.json({ success: true, deletedEntries: entries });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, entry } = await request.json() as { action: 'delete' | 'restore'; entry: DeletedEntry };

    if (!entry || !entry.row || !entry.sourceKey) {
      return NextResponse.json({ success: false, error: 'Invalid entry payload' }, { status: 400 });
    }

    const currentEntries = getDeletedEntries();
    const entryKey = getRowKey(entry.row);

    if (action === 'delete') {
      // Check if already exists to avoid duplicates
      const exists = currentEntries.some(e => getRowKey(e.row) === entryKey);
      if (!exists) {
        currentEntries.push({
          row: entry.row,
          sourceKey: entry.sourceKey,
          deletedAt: entry.deletedAt || Date.now()
        });
        saveDeletedEntries(currentEntries);
      }
    } else if (action === 'restore') {
      const filtered = currentEntries.filter(e => getRowKey(e.row) !== entryKey);
      saveDeletedEntries(filtered);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, deletedEntries: getDeletedEntries() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
