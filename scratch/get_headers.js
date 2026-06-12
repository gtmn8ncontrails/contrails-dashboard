const SPREADSHEET_ID = '1vmLWIGBC2ywUQrm2x8WCEDCaep2Jd6v0rM-ysFXBiEw';

const SHEET_GIDS = {
  'Stage 1 Output': '514359377',
  'w1 errors': '1543605888',
  'W2 Errors': '19760547',
  'Approved Briefs': '0',
  'Stage 3 Queue': '1700518240',
  'Rejected Signals': '2062199386',
};

function parseCSV(csvText) {
  const lines = [];
  let row = [""];
  let inQuotes = false;
  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    const next = csvText[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') { row[row.length - 1] += '"'; i++; }
      else { inQuotes = !inQuotes; }
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
  if (row.length > 1 || row[0] !== "") lines.push(row);
  return lines;
}

async function main() {
  for (const [name, gid] of Object.entries(SHEET_GIDS)) {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      const rows = parseCSV(text);
      if (rows && rows.length > 0) {
        console.log(`Tab: ${name}`);
        console.log(`Headers:`, rows[0]);
        console.log(`First row:`, rows[1]);
        console.log('----------------------------');
      } else {
        console.log(`Tab: ${name} - empty`);
      }
    } catch (e) {
      console.log(`Error ${name}:`, e.message);
    }
  }
}

main();
