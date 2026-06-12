const SPREADSHEET_ID = '1vmLWIGBC2ywUQrm2x8WCEDCaep2Jd6v0rM-ysFXBiEw';
const SHEET_GIDS = {
  'Stage 1 Output': '514359377',
  'w1 errors': '1543605888',
  'W2 Errors': '19760547',
  'Approved Briefs': '0',
  'Stage 3 Queue': '1700518240',
  'Rejected Signals': '2062199386',
};

async function main() {
  for (const [name, gid] of Object.entries(SHEET_GIDS)) {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      const firstLine = text.split('\n')[0];
      console.log(`Tab: ${name}`);
      console.log(`Headers Line:`, firstLine);
      console.log('----------------------------');
    } catch (e) {
      console.log(`Error ${name}:`, e.message);
    }
  }
}
main();
