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

  return (
    <Dashboard 
      initialData={{
        stage1: stage1Data,
        errors: errorsData,
        w2Errors: w2ErrorsData,
        approvedBriefs: approvedBriefsData,
        stage3Queue: stage3QueueData,
        rejectedSignals: rejectedSignalsData,
        stage3Output: stage3OutputData
      }}
    />
  );
}
