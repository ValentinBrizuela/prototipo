import fs from 'fs';
import path from 'path';

const outputDir = path.join(process.cwd(), 'public', 'data');
const outputPath = path.join(outputDir, 'datos.json');
const inputFiles = [
  path.join(process.cwd(), 'datos', 'contenedores', 'contenedores_negros.csv'),
  path.join(process.cwd(), 'datos', 'contenedores', 'contenedores_verdes.csv'),
];

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const parseCoordinate = (value) => {
  if (value === undefined || value === null) {
    return NaN;
  }

  if (typeof value === 'number') {
    return value;
  }

  const normalized = String(value).trim().replace(',', '.');
  return Number(normalized);
};

const getTypePrefixFromPath = (filePath) => {
  const baseName = path.basename(filePath, path.extname(filePath));
  return baseName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
};

const normalizeFeature = (feature, index, typePrefix) => {
  const coordinates = feature?.geometry?.coordinates;
  const lon = Number(Array.isArray(coordinates) ? coordinates[0] : NaN);
  const lat = Number(Array.isArray(coordinates) ? coordinates[1] : NaN);

  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return null;
  }

  const sourceProperties = feature?.properties ?? {};
  const inferredId = sourceProperties.Id ?? feature?.id ?? `${typePrefix}|${index + 1}`;

  return {
    type: 'Feature',
    id: inferredId,
    geometry: {
      type: 'Point',
      coordinates: [lon, lat],
    },
    properties: {
      ...sourceProperties,
      Id: inferredId,
      DireccionNormalizada:
        sourceProperties.DireccionNormalizada ??
        sourceProperties.direccion ??
        sourceProperties.Direccion ??
        '',
    },
  };
};

const loadGeoJsonFeatures = (rawContent, filePath) => {
  const parsed = JSON.parse(rawContent);
  const typePrefix = getTypePrefixFromPath(filePath);

  if (!parsed?.features || !Array.isArray(parsed.features)) {
    throw new Error(`El archivo no contiene un FeatureCollection valido: ${filePath}`);
  }

  return parsed.features
    .map((feature, index) => normalizeFeature(feature, index, typePrefix))
    .filter(Boolean);
};

const loadCsvFeatures = (rawContent, filePath) => {
  const lines = rawContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  const headerIndex = Object.fromEntries(headers.map((header, idx) => [header.toLowerCase(), idx]));
  const typePrefix = getTypePrefixFromPath(filePath);
  const features = [];

  for (let row = 1; row < lines.length; row += 1) {
    const values = parseCsvLine(lines[row]);
    const longitude = parseCoordinate(values[headerIndex.longitude]);
    const latitude = parseCoordinate(values[headerIndex.latitude]);

    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      continue;
    }

    const featureId = `${typePrefix}|${features.length + 1}`;

    features.push({
      type: 'Feature',
      id: featureId,
      geometry: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      properties: {
        Id: featureId,
        DireccionNormalizada: values[headerIndex.direccion] ?? '',
        Barrio: values[headerIndex.barrio] ?? '',
        Comuna: values[headerIndex.comuna] ?? '',
        MasInfo: values[headerIndex.mas_info] ?? '',
        Materiales: values[headerIndex.materiales] ?? '',
        CodEquipa: 'RECICLABLES',
      },
    });
  }

  return features;
};

const loadFeaturesFromFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8').trim();

  if (!content) {
    return [];
  }

  const firstChar = content[0];
  if (firstChar === '{' || firstChar === '[') {
    return loadGeoJsonFeatures(content, filePath);
  }

  return loadCsvFeatures(content, filePath);
};

const allFeatures = inputFiles.flatMap((filePath) => loadFeaturesFromFile(filePath));

const fullData = {
  type: 'FeatureCollection',
  features: allFeatures,
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(fullData, null, 2), 'utf-8');

console.log(`✓ Procesado: ${fullData.features.length} contenedores guardados en ${outputPath}`);
console.log(`Tipos encontrados:`, [...new Set(fullData.features.map(f => f.properties.Id.split('|')[0]))]);
