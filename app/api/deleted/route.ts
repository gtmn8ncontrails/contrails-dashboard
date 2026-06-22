import { NextResponse } from 'next/server';
import { getDeletedEntries, addDeletedEntry, removeDeletedEntry, DeletedEntry } from '@/lib/deletedStore';
import { getRowKey } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const entries = await getDeletedEntries();
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

    const entryKey = getRowKey(entry.row);

    if (action === 'delete') {
      await addDeletedEntry({
        row: entry.row,
        sourceKey: entry.sourceKey,
        deletedAt: entry.deletedAt || Date.now()
      });
    } else if (action === 'restore') {
      await removeDeletedEntry(entryKey);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const updatedEntries = await getDeletedEntries();
    return NextResponse.json({ success: true, deletedEntries: updatedEntries });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
