import { google } from 'googleapis';
import { getRowKey } from './utils';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1pogGjd0g5BlSENdMxa-1kL9lBFEwYf0sJn32ItfDckM';

export type DeletedEntry = {
  row: Record<string, string>;
  sourceKey: 'stage1' | 'approvedBriefs' | 'stage3Queue' | 'stage3Output' | 'rejectedSignals' | 'errors' | 'w2Errors';
  deletedAt: number;
};

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

// Ensure 'Recently Deleted' sheet tab exists
async function ensureSheetExists(sheets: any) {
  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const sheetNames = metadata.data.sheets.map((s: any) => s.properties.title);
    if (!sheetNames.includes('Recently Deleted')) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Recently Deleted',
                },
              },
            },
          ],
        },
      });
      // Append headers
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Recently Deleted!A1:D1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['row_key', 'source_key', 'deleted_at', 'row_json']],
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring Recently Deleted sheet exists:', error);
  }
}

export async function getDeletedEntries(): Promise<DeletedEntry[]> {
  try {
    const auth = await getAuth();
    if (!auth) return [];
    const sheets = google.sheets({ version: 'v4', auth });
    
    await ensureSheetExists(sheets);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Recently Deleted!A:D',
    });
    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];

    // Columns: row_key, source_key, deleted_at, row_json
    // Exclude header row
    return rows.slice(1).map(row => {
      let parsedRow = {};
      try {
        parsedRow = JSON.parse(row[3] || '{}');
      } catch (e) {
        console.error('Error parsing row json:', e);
      }
      return {
        row: parsedRow,
        sourceKey: row[1] as DeletedEntry['sourceKey'],
        deletedAt: Number(row[2] || 0),
      };
    });
  } catch (error) {
    console.error('Error reading deleted entries from sheets:', error);
    return [];
  }
}

export async function addDeletedEntry(entry: DeletedEntry): Promise<void> {
  try {
    const auth = await getAuth();
    if (!auth) return;
    const sheets = google.sheets({ version: 'v4', auth });
    
    await ensureSheetExists(sheets);

    const rowKey = getRowKey(entry.row);
    
    // Check if it already exists in the sheet to prevent duplicates
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Recently Deleted!A:A',
    });
    const existingKeys = (response.data.values || []).map(r => r[0]);
    if (existingKeys.includes(rowKey)) {
      return; // Already deleted
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Recently Deleted!A:D',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [rowKey, entry.sourceKey, String(entry.deletedAt), JSON.stringify(entry.row)]
        ],
      },
    });
  } catch (error) {
    console.error('Error adding deleted entry to sheets:', error);
  }
}

export async function removeDeletedEntry(rowKey: string): Promise<void> {
  try {
    const auth = await getAuth();
    if (!auth) return;
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Fetch all values to find the row index
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Recently Deleted!A:A',
    });
    const rows = response.data.values || [];
    const indexToDelete = rows.findIndex(r => r[0] === rowKey);
    if (indexToDelete !== -1) {
      const metadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sheet = metadata.data.sheets?.find((s: any) => s.properties?.title === 'Recently Deleted');
      const sheetId = sheet?.properties?.sheetId;
      
      if (sheetId !== undefined) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId,
                    dimension: 'ROWS',
                    startIndex: indexToDelete,
                    endIndex: indexToDelete + 1,
                  },
                },
              },
            ],
          },
        });
      }
    }
  } catch (error) {
    console.error('Error removing deleted entry from sheets:', error);
  }
}

