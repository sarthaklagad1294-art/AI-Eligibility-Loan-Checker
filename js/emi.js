import { clamp, formatCurrency } from './utils.js';

export function calculateEMI(principal, annualRate, months) {
  const P = Number(principal) || 0;
  const n = Number(months) || 0;
  const r = (Number(annualRate) || 0) / 12 / 100;
  if (P <= 0 || n <= 0) return 0;
  if (r === 0) return P / n;
  const factor = (1 + r) ** n;
  return P * r * factor / (factor - 1);
}

export function principalFromEMI(emi, annualRate, months) {
  const payment = Number(emi) || 0;
  const n = Number(months) || 0;
  const r = (Number(annualRate) || 0) / 12 / 100;
  if (payment <= 0 || n <= 0) return 0;
  if (r === 0) return payment * n;
  const factor = (1 + r) ** n;
  return payment * (factor - 1) / (r * factor);
}

export function calculateSummary(principal, rate, months) {
  const monthly = calculateEMI(principal, rate, months);
  const total = monthly * Number(months);
  return { principal: Number(principal), rate: Number(rate), months: Number(months), monthly, total, interest: Math.max(0, total - Number(principal)) };
}

function buildSchedule(summary) {
  let balance = summary.principal;
  const r = summary.rate / 12 / 100;
  const rows = [];
  for (let month = 1; month <= summary.months; month += 1) {
    const interest = balance * r;
    const principal = Math.min(balance, Math.max(0, summary.monthly - interest));
    const closing = Math.max(0, balance - principal);
    rows.push({ month, opening: balance, principal, interest, closing });
    balance = closing;
  }
  return rows;
}

function renderSchedule(rows) {
  const body = document.querySelector('#amortization-body');
  if (!body) return;
  body.innerHTML = rows.map((row) => `<tr><td>${row.month}</td><td>${formatCurrency(row.opening)}</td><td>${formatCurrency(row.principal)}</td><td>${formatCurrency(row.interest)}</td><td>${formatCurrency(row.closing)}</td></tr>`).join('');
}

export function initEMI() {
  const principalRange = document.querySelector('#emi-principal');
  const principalNumber = document.querySelector('#emi-principal-number');
  const rateRange = document.querySelector('#emi-rate');
  const rateNumber = document.querySelector('#emi-rate-number');
  const tenureRange = document.querySelector('#emi-tenure');
  const tenureNumber = document.querySelector('#emi-tenure-number');
  const chartCanvas = document.querySelector('#emi-chart');
  if (!principalRange || !chartCanvas) return;
  let chart;
  const update = () => {
    const principal = clamp(principalNumber.value, 50000, 10000000);
    const rate = clamp(rateNumber.value || rateRange.value, 1, 30);
    const months = clamp(tenureNumber.value || tenureRange.value, 6, 360);
    principalRange.value = principal;
    principalNumber.value = Math.round(principal);
    rateRange.value = rate;
    rateNumber.value = rate;
    tenureRange.value = months;
    tenureNumber.value = months;
    const summary = calculateSummary(principal, rate, months);
    document.querySelector('#emi-principal-output').textContent = formatCurrency(principal);
    document.querySelector('#emi-rate-output').textContent = `${Number(rate).toFixed(1).replace('.0', '')}%`;
    document.querySelector('#emi-tenure-output').textContent = `${months} months`;
    document.querySelector('#emi-monthly').textContent = formatCurrency(summary.monthly);
    document.querySelector('#emi-months').textContent = months;
    document.querySelector('#emi-interest').textContent = formatCurrency(summary.interest);
    document.querySelector('#emi-total').textContent = formatCurrency(summary.total);
    document.querySelector('#legend-principal').textContent = formatCurrency(summary.principal);
    document.querySelector('#legend-interest').textContent = formatCurrency(summary.interest);
    renderSchedule(buildSchedule(summary));
    if (window.Chart) {
      if (!chart) chart = new window.Chart(chartCanvas, { type: 'doughnut', data: { labels: ['Principal', 'Interest'], datasets: [{ data: [summary.principal, summary.interest], backgroundColor: ['#38bdf8', '#a78bfa'], borderWidth: 0, hoverOffset: 5 }] }, options: { responsive: false, cutout: '76%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (item) => ` ${formatCurrency(item.raw)}` } } } } });
      else { chart.data.datasets[0].data = [summary.principal, summary.interest]; chart.update(); }
    }
  };
  principalRange.addEventListener('input', () => { principalNumber.value = principalRange.value; update(); });
  principalNumber.addEventListener('input', update);
  rateRange.addEventListener('input', () => { rateNumber.value = rateRange.value; update(); });
  rateNumber.addEventListener('input', update);
  tenureRange.addEventListener('input', () => { tenureNumber.value = tenureRange.value; update(); });
  tenureNumber.addEventListener('input', update);
  update();
}
