const fs = require('fs');
const readline = require('readline');

if (process.argv.length < 4) {
  console.error('Usage: node generate_k6_report.js <input.json> <output.html>');
  process.exit(1);
}

const input = process.argv[2];
const output = process.argv[3];

const rl = readline.createInterface({
  input: fs.createReadStream(input),
  crlfDelay: Infinity,
});

const metrics = {
  http_reqs: 0,
  http_req_failed_values: [],
  http_req_duration_values: [],
  transfer_duration_values: [],
  checks: {},
};

rl.on('line', (line) => {
  line = line.trim();
  if (!line) return;
  let obj;
  try {
    obj = JSON.parse(line);
  } catch (e) {
    return;
  }

  if (obj.type === 'Metric' && obj.data && obj.data.name) {
    // ignore metric defs
    return;
  }

  if (obj.metric === 'http_reqs' && obj.type === 'Point' && obj.data && typeof obj.data.value === 'number') {
    metrics.http_reqs += obj.data.value;
  }

  if (obj.metric === 'http_req_failed' && obj.type === 'Point' && obj.data && typeof obj.data.value === 'number') {
    metrics.http_req_failed_values.push(obj.data.value);
  }

  if (obj.metric === 'http_req_duration' && obj.type === 'Point' && obj.data && typeof obj.data.value === 'number') {
    metrics.http_req_duration_values.push(obj.data.value);
  }

  if (obj.metric === 'transfer_duration' && obj.type === 'Point' && obj.data && typeof obj.data.value === 'number') {
    metrics.transfer_duration_values.push(obj.data.value);
  }

  if (obj.metric === 'checks' && obj.type === 'Point' && obj.data && obj.data.tags && obj.data.tags.check) {
    const name = obj.data.tags.check;
    const val = obj.data.value || 0;
    if (!metrics.checks[name]) metrics.checks[name] = { passed: 0, total: 0 };
    metrics.checks[name].total += 1;
    if (val === 1) metrics.checks[name].passed += 1;
  }
});

rl.on('close', () => {
  function percentile(arr, p) {
    if (!arr.length) return 0;
    const a = arr.slice().sort((x, y) => x - y);
    const idx = Math.ceil((p / 100) * a.length) - 1;
    return a[Math.max(0, Math.min(idx, a.length - 1))];
  }

  function stats(arr) {
    if (!arr.length) return { avg: 0, min: 0, max: 0, med: 0 };
    const sum = arr.reduce((s, v) => s + v, 0);
    const avg = sum / arr.length;
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const med = percentile(arr, 50);
    return { avg, min, max, med };
  }

  const httpFailedRate = metrics.http_req_failed_values.length
    ? (metrics.http_req_failed_values.reduce((s, v) => s + v, 0) / metrics.http_req_failed_values.length) * 100
    : 0;

  const httpDurStats = stats(metrics.http_req_duration_values);
  const transferStats = stats(metrics.transfer_duration_values);

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Relatório k6 — automático</title>
  <style>body{font-family:Arial,Helvetica,sans-serif;margin:20px;color:#222}h1,h2{color:#006}table{border-collapse:collapse;width:100%;max-width:1100px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}.small{font-size:0.9em;color:#666}</style>
</head>
<body>
  <h1>Relatório k6 — automático</h1>
  <p class="small">Arquivo de entrada: ${input}</p>
  <h2>Resumo</h2>
  <table>
    <tr><th>Métrica</th><th>Valor</th></tr>
    <tr><td>Total de requisições (http_reqs)</td><td>${metrics.http_reqs}</td></tr>
    <tr><td>Taxa de falha (http_req_failed)</td><td>${httpFailedRate.toFixed(2)} %</td></tr>
    <tr><td>p(85) http_req_duration (ms)</td><td>${percentile(metrics.http_req_duration_values,85).toFixed(2)}</td></tr>
  </table>

  <h2>Duração das transferências (transfer_duration)</h2>
  <table>
    <tr><th>Métrica</th><th>Valor (ms)</th></tr>
    <tr><td>Média</td><td>${transferStats.avg.toFixed(4)}</td></tr>
    <tr><td>Mínimo</td><td>${transferStats.min.toFixed(4)}</td></tr>
    <tr><td>Mediana</td><td>${transferStats.med.toFixed(4)}</td></tr>
    <tr><td>Máximo</td><td>${transferStats.max.toFixed(4)}</td></tr>
    <tr><td>p(90)</td><td>${percentile(metrics.transfer_duration_values,90).toFixed(4)}</td></tr>
    <tr><td>p(95)</td><td>${percentile(metrics.transfer_duration_values,95).toFixed(4)}</td></tr>
  </table>

  <h2>Checks</h2>
  <table>
    <tr><th>Check</th><th>Passed</th><th>Total</th><th>Rate</th></tr>
    ${Object.keys(metrics.checks).map(name => {
      const c = metrics.checks[name];
      return `<tr><td>${name}</td><td>${c.passed}</td><td>${c.total}</td><td>${((c.passed/c.total)*100).toFixed(2)}%</td></tr>`;
    }).join('\n')}
  </table>

  <p class="small">Gerado automaticamente.</p>
</body>
</html>`;

  fs.writeFileSync(output, html, 'utf8');
  console.log('Relatório gerado em', output);
});
