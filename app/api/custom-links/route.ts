import { NextResponse } from 'next/server';
import { getCustomLinks, saveCustomLink } from '@/lib/customLinksStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const links = await getCustomLinks();
    return NextResponse.json({ success: true, customLinks: links });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { rowKey, link } = await request.json() as { rowKey: string; link: string };

    if (!rowKey || link === undefined) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    await saveCustomLink(rowKey, link);
    const updatedLinks = await getCustomLinks();
    return NextResponse.json({ success: true, customLinks: updatedLinks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
