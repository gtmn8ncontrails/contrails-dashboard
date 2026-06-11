import Dashboard from '@/components/Dashboard';
import { getSheetData } from '@/lib/googleSheets';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function Home() {
  // Fetch data concurrently for all main tabs
  const [
    stage1Data,
    errorsData,
    w2ErrorsData,
    approvedBriefsData,
    stage3QueueData,
    rejectedSignalsData
  ] = await Promise.all([
    getSheetData('Stage 1 Output!A:Z'),
    getSheetData('w1 errors!A:Z'),
    getSheetData('W2 Errors!A:Z'),
    getSheetData('Approved Briefs!A:Z'),
    getSheetData('Stage 3 Queue!A:Z'),
    getSheetData('Rejected Signals!A:Z')
  ]);

  return (
    <Dashboard 
      initialData={{
        stage1: stage1Data,
        errors: errorsData,
        w2Errors: w2ErrorsData,
        approvedBriefs: approvedBriefsData,
        stage3Queue: stage3QueueData,
        rejectedSignals: rejectedSignalsData
      }}
    />
  );
}
