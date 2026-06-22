import { google } from 'googleapis';
import { getRowKey } from './utils';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1pogGjd0g5BlSENdMxa-1kL9lBFEwYf0sJn32ItfDckM';

async function getAuth() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    console.warn('Google Service Account credentials missing.');
    return null;
  }
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function ensureSheetExists(sheets: any) {
  try {
    const metadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetNames = metadata.data.sheets.map((s: any) => s.properties.title);
    if (!sheetNames.includes('Custom Links')) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: 'Custom Links' },
              },
            },
          ],
        },
      });
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Custom Links!A1:B1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['row_key', 'custom_link']],
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring Custom Links sheet exists:', error);
  }
}

export async function getCustomLinks(): Promise<Record<string, string[]>> {
  try {
    const auth = await getAuth();
    if (!auth) return {};
    const sheets = google.sheets({ version: 'v4', auth });
    await ensureSheetExists(sheets);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Custom Links!A:B',
    });
    const rows = response.data.values;
    if (!rows || rows.length <= 1) return {};
    const map: Record<string, string[]> = {};
    rows.slice(1).forEach(row => {
      if (row[0] && row[1]) {
        let links: string[] = [];
        try {
          const parsed = JSON.parse(row[1]);
          if (Array.isArray(parsed)) {
            links = parsed;
          } else {
            links = [row[1]];
          }
        } catch {
          links = [row[1]];
        }
        map[row[0]] = links;
      }
    });
    return map;
  } catch (error) {
    console.error('Error getting custom links:', error);
    return {};
  }
}

export async function saveCustomLinks(rowKey: string, links: string[]): Promise<void> {
  try {
    const auth = await getAuth();
    if (!auth) return;
    const sheets = google.sheets({ version: 'v4', auth });
    await ensureSheetExists(sheets);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Custom Links!A:A',
    });
    const rows = response.data.values || [];
    const index = rows.findIndex(r => r[0] === rowKey);

    const serializedLinks = JSON.stringify(links);

    if (index !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Custom Links!B${index + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[serializedLinks]],
        },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Custom Links!A:B',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[rowKey, serializedLinks]],
        },
      });
    }
  } catch (error) {
    console.error('Error saving custom links:', error);
  }
}
