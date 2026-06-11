import Dashboard from '@/components/Dashboard';
import { getSheetData } from '@/lib/googleSheets';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function Home() {
  // Fetch data concurrently for all main tabs
  const [
    stage1Data,
    errorsData,
    w2ErrorsData,
    gtmSignalsData,
    approvedBriefsData,
    stage3QueueData,
    failedQaData,
    rejectedSignalsData
  ] = await Promise.all([
    getSheetData('Stage 1 Output!A1:Z10000'),
    getSheetData('w1 errors!A1:Z10000'),
    getSheetData('W2 Errors!A1:Z10000'),
    getSheetData('GTM Signals!A1:Z10000'),
    getSheetData('Approved Briefs!A1:Z10000'),
    getSheetData('Stage 3 Queue!A1:Z10000'),
    getSheetData('Failed QA!A1:Z10000'),
    getSheetData('Rejected Signals!A1:Z10000')
  ]);

  return (
    <Dashboard 
      initialData={{
        stage1: stage1Data,
        errors: errorsData,
        w2Errors: w2ErrorsData,
        gtmSignals: gtmSignalsData,
        approvedBriefs: approvedBriefsData,
        stage3Queue: stage3QueueData,
        failedQa: failedQaData,
        rejectedSignals: rejectedSignalsData
      }}
    />
  );
}
