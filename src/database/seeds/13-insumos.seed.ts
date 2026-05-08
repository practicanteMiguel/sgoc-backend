import { DataSource } from 'typeorm';
import * as XLSX from 'xlsx';
import * as path from 'path';
import { Insumo, CategoriaInsumo } from '../../consumables/entities/insumo.entity';

interface RawRow {
  descripcion: string;
  unidad: string;
  valor_unitario: number | null;
  proveedor_ordinario: string | null;
  proveedor_extraordinario: string | null;
}

function extraerFilas(ws: XLSX.WorkSheet): RawRow[] {
  const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  return data
    .filter(row => typeof row[0] === 'number' && row[0] > 0 && String(row[2]).trim())
    .map(row => ({
      descripcion:              String(row[2]).trim(),
      unidad:                   String(row[3]).trim() || 'UND',
      valor_unitario:           typeof row[8] === 'number' ? row[8] : null,
      proveedor_ordinario:      row[4] ? String(row[4]).trim() : null,
      proveedor_extraordinario: row[5] ? String(row[5]).trim() : null,
    }));
}

export async function seedInsumos(dataSource: DataSource) {
  const repo = dataSource.getRepository(Insumo);
  const xlsxPath = path.resolve(process.cwd(), '4. RQ CONSUMIBLES ABRIL DEF 2026.xlsx');
  const wb = XLSX.readFile(xlsxPath);

  const hojas: { nombre: string; categoria: CategoriaInsumo; prefijo: string }[] = [
    { nombre: 'PAPELERIA ',  categoria: CategoriaInsumo.PAPELERIA,  prefijo: 'PAP' },
    { nombre: 'CONSUMIBLES', categoria: CategoriaInsumo.CONSUMIBLE, prefijo: 'CON' },
    { nombre: 'EPP',         categoria: CategoriaInsumo.EPP,        prefijo: 'EPP' },
  ];

  let total = 0;

  for (const { nombre, categoria, prefijo } of hojas) {
    const ws = wb.Sheets[nombre];
    if (!ws) {
      console.log(`⚠️  Hoja no encontrada: ${nombre}`);
      continue;
    }

    const filas = extraerFilas(ws);
    let contador = 0;

    for (let i = 0; i < filas.length; i++) {
      const codigo = `${prefijo}-${String(i + 1).padStart(3, '0')}`;
      const existe = await repo.findOne({ where: { codigo } });
      if (existe) {
        console.log(`⏭️  Ya existe: ${codigo}`);
        continue;
      }

      const insumo = repo.create({
        codigo,
        categoria,
        ...filas[i],
      });
      await repo.save(insumo);
      contador++;
    }

    console.log(`✅ ${categoria}: ${contador} insumos cargados`);
    total += contador;
  }

  console.log(`\n📦 Total insumos cargados: ${total}`);
}
