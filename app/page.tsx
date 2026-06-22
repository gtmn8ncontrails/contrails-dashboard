import Dashboard from '@/components/Dashboard';
import { getSheetData } from '@/lib/googleSheets';
import { getDeletedEntries } from '@/lib/deletedStore';
import { getRowKey } from '@/lib/utils';
import { getCustomLinks } from '@/lib/customLinksStore';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch data concurrently for all main tabs
  const [
    stage1Data,
    errorsData,
    w2ErrorsData,
    approvedBriefsData,
    stage3QueueData,
    rejectedSignalsData,
    stage3OutputData
  ] = await Promise.all([
    getSheetData('Stage 1 Output!A:AZ'),
    getSheetData('w1 errors!A:AZ'),
    getSheetData('W2 Errors!A:AZ'),
    getSheetData('Approved Briefs!A:AZ'),
    getSheetData('Stage 3 Queue!A:AZ'),
    getSheetData('Rejected Signals!A:AZ'),
    getSheetData('Stage 3 Output !A:AZ')
  ]);

  const [deleted, customLinks] = await Promise.all([
    getDeletedEntries(),
    getCustomLinks()
  ]);
  const deletedKeys = new Set(deleted.map(d => getRowKey(d.row)));

  const filterDeleted = (data: Record<string, string>[]) => {
    return (data || []).filter(row => !deletedKeys.has(getRowKey(row)));
  };

  return (
    <Dashboard 
      initialData={{
        stage1: filterDeleted(stage1Data),
        errors: filterDeleted(errorsData),
        w2Errors: filterDeleted(w2ErrorsData),
        approvedBriefs: filterDeleted(approvedBriefsData),
        stage3Queue: filterDeleted(stage3QueueData),
        rejectedSignals: filterDeleted(rejectedSignalsData),
        stage3Output: filterDeleted(stage3OutputData)
      }}
      initialDeleted={deleted}
      initialCustomLinks={customLinks}
    />
  );
}

