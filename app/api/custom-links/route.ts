import { NextResponse } from 'next/server';
import { getCustomLinks, saveCustomLinks } from '@/lib/customLinksStore';

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
    const { rowKey, links } = await request.json() as { rowKey: string; links: string[] };

    if (!rowKey || !Array.isArray(links)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    await saveCustomLinks(rowKey, links);
    const updatedLinks = await getCustomLinks();
    return NextResponse.json({ success: true, customLinks: updatedLinks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
