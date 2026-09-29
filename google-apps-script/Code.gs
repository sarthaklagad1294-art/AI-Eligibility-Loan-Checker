const SHEET_NAME = 'Eligibility History';
const HEADERS = ['timestamp', 'name', 'email', 'age', 'employment', 'income', 'existingEmi', 'creditScore', 'loanType', 'loanLabel', 'loanAmount', 'tenure', 'band', 'eligibilityResult', 'score', 'maxEligible', 'estimatedCreditScore'];

function sheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function setup_() {
  const sheet = sheet_();
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}

function doGet() {
  const sheet = setup_();
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1).filter(row => row.some(Boolean)).map(row => Object.fromEntries(HEADERS.map((key, index) => [key, row[index] ?? '']))).reverse();
  return ContentService.createTextOutput(JSON.stringify({ rows })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const safe = {
      timestamp: payload.timestamp || new Date().toISOString(),
      name: String(payload.name || '').slice(0, 120),
      email: String(payload.email || '').slice(0, 160),
      age: Number(payload.age) || '',
      employment: String(payload.employment || '').slice(0, 40),
      income: Number(payload.income) || '',
      existingEmi: Number(payload.existingEmi) || 0,
      creditScore: Number(payload.creditScore) || '',
      loanType: String(payload.loanType || '').slice(0, 40),
      loanLabel: String(payload.loanLabel || payload.loanType || '').slice(0, 60),
      loanAmount: Number(payload.loanAmount) || '',
      tenure: Number(payload.tenure) || '',
      band: String(payload.band || payload.eligibilityResult || '').slice(0, 40),
      eligibilityResult: String(payload.eligibilityResult || payload.band || '').slice(0, 40),
      score: Number(payload.score) || '',
      maxEligible: Number(payload.maxEligible) || 0,
      estimatedCreditScore: Number(payload.estimatedCreditScore) || ''
    };
    if (!safe.name || !safe.email) throw new Error('Name and email are required.');
    const sheet = setup_();
    sheet.appendRow(HEADERS.map(key => safe[key]));
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
