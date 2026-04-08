import * as XLSX from 'xlsx';

const FILE = 'CTO CW 286091 24.03.2026.xlsx';

const workbook = XLSX.readFile(FILE);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows: any[] = XLSX.utils.sheet_to_json(sheet);

if (rows.length === 0) {
  console.log('El archivo está vacío o no se pudo leer.');
  process.exit(1);
}

console.log('==============================');
console.log('Hoja:', workbook.SheetNames[0]);
console.log('Total filas:', rows.length);
console.log('==============================');
console.log('Claves de la primera fila:');
console.log(Object.keys(rows[0]));
console.log('==============================');
console.log('Primeras 3 filas (raw):');
console.log(JSON.stringify(rows.slice(0, 3), null, 2));
