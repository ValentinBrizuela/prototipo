import fs from 'fs';
import path from 'path';

// Lee el archivo GeoJSON
const inputPath = path.join(process.cwd(), 'datos', 'contenedores', 'datos.csv');
const outputDir = path.join(process.cwd(), 'public', 'data');
const outputPath = path.join(outputDir, 'datos.json');

const data = fs.readFileSync(inputPath, 'utf-8');
const geojson = JSON.parse(data);

// Conserva todos los contenedores del dataset
const fullData = {
  ...geojson,
  features: geojson.features
};

// Crea archivo de salida
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(fullData, null, 2), 'utf-8');

console.log(`✓ Procesado: ${fullData.features.length} contenedores guardados en ${outputPath}`);
console.log(`Tipos encontrados:`, [...new Set(fullData.features.map(f => f.properties.Id.split('|')[0]))]);
