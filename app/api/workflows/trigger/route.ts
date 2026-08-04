import { NextResponse } from 'next/server';
import { triggerWorkflow } from '@/lib/n8n';

export async function POST(request: Request) {
  try {
    const { stage, url } = await request.json();

    let workflowId = '';
    let payload: Record<string, any> | undefined = undefined;

    if (stage === 1) {
      workflowId = process.env.STAGE_1_WORKFLOW_ID || '';
    } else if (stage === 2) {
      workflowId = process.env.STAGE_2_WORKFLOW_ID || '';
    } else if (stage === 3) {
      workflowId = process.env.STAGE_3_WORKFLOW_ID || '';
    } else if (stage === 'analyze') {
      workflowId = process.env.STAGE_1_ANALYZE_WEBHOOK_URL || '';
      payload = { url };
    } else if (stage === 'competitor') {
      workflowId = process.env.STAGE_1_COMPETITOR_WEBHOOK_URL || '';
    } else if (stage === 'cisa') {
      workflowId = process.env.STAGE_1_CISA_WEBHOOK_URL || '';
    } else if (stage === 'research') {
      workflowId = process.env.STAGE_1_RESEARCH_WEBHOOK_URL || '';
    } else if (stage === 'events') {
      workflowId = process.env.STAGE_1_EVENTS_WEBHOOK_URL || '';
    } else if (stage === 'news') {
      workflowId = process.env.STAGE_1_NEWS_WEBHOOK_URL || '';
    } else if (stage === 'all') {
      workflowId = process.env.STAGE_1_ALL_SOURCES_WEBHOOK_URL || '';
    }

    if (!workflowId) {
      return NextResponse.json({ error: `No workflow ID configured for Stage ${stage} in .env.local` }, { status: 400 });
    }

    const result = await triggerWorkflow(workflowId, payload);

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
