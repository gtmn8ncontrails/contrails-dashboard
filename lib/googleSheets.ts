import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1vmLWIGBC2ywUQrm2x8WCEDCaep2Jd6v0rM-ysFXBiEw';

async function getAuth() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    console.warn('Google Service Account credentials missing.');
    return null;
  }

  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

export async function getSheetData(range: string) {
  try {
    const auth = await getAuth();
    if (!auth) {
      console.log('No service account auth configured, attempting public CSV fetch...');
      return await fetchPublicSheetData(range);
    }

    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    // Assume first row is headers
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index] || '';
      });
      return rowData;
    });

    return data;
  } catch (error) {
    console.error('Error fetching sheet data via service account:', error);
    console.log('Attempting public CSV fetch fallback...');
    return await fetchPublicSheetData(range);
  }
}

async function fetchPublicSheetData(range: string) {
  try {
    const sheetName = range.split('!')[0];
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const csvText = await res.text();
    const rows = parseCSV(csvText);
    
    if (!rows || rows.length === 0) {
      return [];
    }

    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index] || '';
      });
      return rowData;
    });

    return data;
  } catch (error) {
    console.error('Failed to fetch public sheet data:', error);
    return getMockData(range);
  }
}

function parseCSV(csvText: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [""];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    const next = csvText[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push("");
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  return lines;
}

function getMockData(range: string) {
  if (range.includes('Stage 1')) {
     return [
      { url: 'https://hivemode', source_type: 'competitor_signal', title: 'Hive - Product Update', relevance_score: '9', affected_person: 'trust_safety_lead', region: 'Global', urgency: 'medium', summary: 'Hive has expanded its moderation suite...' },
      { url: 'https://eur-lex.eu', source_type: 'government_regul', title: 'Council Decision (EU)', relevance_score: '10', affected_person: 'legal_compliance', region: 'EU', urgency: 'high', summary: 'The EU has formally ratified the Council of Europe Framework Convention...' }
    ];
  }
  return [];
}
