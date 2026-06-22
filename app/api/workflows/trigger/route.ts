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
