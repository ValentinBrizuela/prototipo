import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 4000;
const PRIMARY_DATA_PATH = path.join(process.cwd(), 'public', 'data', 'datos.json');
const FALLBACK_DATA_PATH = path.join(process.cwd(), 'src', 'data', 'datos.json');
const DATA_PATH = fs.existsSync(PRIMARY_DATA_PATH) ? PRIMARY_DATA_PATH : FALLBACK_DATA_PATH;

const rawData = fs.readFileSync(DATA_PATH, 'utf-8').replace(/^\uFEFF/, '');
const geojson = JSON.parse(rawData);
const containerIds = geojson.features.map((feature) => feature.properties.Id);

const levelsById = new Map(
  containerIds.map((id) => [id, Math.floor(Math.random() * 76) + 15])
);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getNextLevel = (current) => {
  const baseDelta = Math.floor(Math.random() * 19) - 9;
  const saturationBias = current >= 90 ? -8 : current >= 80 ? -4 : current <= 20 ? 5 : 0;
  const next = current + baseDelta + saturationBias;

  if (next >= 100) {
    return Math.random() < 0.08 ? 100 : 99;
  }

  if (next >= 96) {
    return Math.random() < 0.15 ? 100 : 95;
  }

  return clamp(next, 0, 95);
};

const updateSensorValues = () => {
  for (const id of containerIds) {
    const current = levelsById.get(id) ?? 50;
    levelsById.set(id, getNextLevel(current));
  }
};

const buildPayload = () => ({
  updatedAt: new Date().toISOString(),
  readings: containerIds.map((id) => ({
    id,
    fillLevel: levelsById.get(id),
  })),
});

const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const server = http.createServer((req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.url === '/sensors') {
    updateSensorValues();
    const payload = buildPayload();

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Sensor simulator listening on http://localhost:${PORT}`);
  console.log('GET /sensors -> fill levels for all containers');
});
