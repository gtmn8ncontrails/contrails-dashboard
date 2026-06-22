const N8N_URL = process.env.N8N_BASE_URL;
const API_KEY = process.env.N8N_API_KEY;
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

export async function triggerWorkflow(targetUrlOrId: string, payload?: Record<string, any>) {
  try {
    // If the user provided a full Webhook URL (Recommended by n8n)
    if (targetUrlOrId.startsWith('http')) {
      const response = await fetch(targetUrlOrId, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${N8N_WEBHOOK_SECRET}`,
        },
        body: JSON.stringify({ triggeredAt: new Date().toISOString(), ...payload }),
      });
      if (!response.ok) throw new Error(`n8n Webhook Error: ${response.status}`);
      return { success: true, data: await response.text() };
    }

    // Fallback if they provided just an ID (Legacy REST API - often throws 405)
    return { 
      success: false, 
      error: 'n8n security blocks API executions. Please replace the Workflow ID in .env.local with a Webhook URL (see instructions).' 
    };
  } catch (error) {
    console.error('Error triggering workflow:', error);
    return { success: false, error: String(error) };
  }
}