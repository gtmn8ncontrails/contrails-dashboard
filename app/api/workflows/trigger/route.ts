import { NextResponse } from 'next/server';
import { triggerWorkflow } from '@/lib/n8n';

export async function POST(request: Request) {
  try {
    const { stage } = await request.json();

    let workflowId = '';
    if (stage === 1) workflowId = process.env.STAGE_1_WORKFLOW_ID || '';
    if (stage === 2) workflowId = process.env.STAGE_2_WORKFLOW_ID || '';
    if (stage === 3) workflowId = process.env.STAGE_3_WORKFLOW_ID || '';

    if (!workflowId) {
      return NextResponse.json({ error: `No workflow ID configured for Stage ${stage} in .env.local` }, { status: 400 });
    }

    const result = await triggerWorkflow(workflowId);

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
