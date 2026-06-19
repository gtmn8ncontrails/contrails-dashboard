const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const parts = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (parts) {
      let val = parts[2] || '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      process.env[parts[1]] = val;
    }
  });
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1pogGjd0g5BlSENdMxa-1kL9lBFEwYf0sJn32ItfDckM';

async function run() {
  try {
    console.log("Using email:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // Check sheet metadata
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    
    const sheetNames = metadata.data.sheets.map(s => s.properties.title);
    console.log("Existing sheets:", sheetNames);

    const hasRecentlyDeleted = sheetNames.includes('Recently Deleted');
    if (!hasRecentlyDeleted) {
      console.log("Creating 'Recently Deleted' sheet...");
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
      console.log("Created sheet 'Recently Deleted'.");
    }

    // Try to append a test row
    console.log("Appending a test row...");
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Recently Deleted!A:C',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          ['test_key', 'test_source', String(Date.now())]
        ]
      }
    });
    console.log("Success appending test row!");

  } catch (error) {
    console.error("Test failed:", error);
  }
}

run();
