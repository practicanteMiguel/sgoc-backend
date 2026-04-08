import 'reflect-metadata';
import * as XLSX from 'xlsx';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Employee, ScheduleType } from '@/plants/employees/entities/employee.entity';
import { Field } from '@/plants/fields/entities/field.entity';

dotenv.config();

const FILE = 'CTO CW 286091 24.03.2026.xlsx';

const TARGET_CEDULAS = new Set([
  '1075279897', '79519685',  '8789852',    '7727958',
  '93401872',   '52212102',  '1075289280', '33750706',
  '52966395',
]);

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../../**/*.entity.{ts,js}'],
  synchronize: false,
});

function excelDateToISO(serial: number): string | null {
  if (!serial || isNaN(serial)) return null;
  return new Date((serial - 25569) * 86400 * 1000).toISOString().split('T')[0];
}

function str(val: any): string | null {
  if (val === undefined || val === null || val === '') return null;
  return String(val).trim() || null;
}

function isExcelDate(val: any): boolean {
  return typeof val === 'number' && val > 1000;
}

// "JUAN CARLOS REYES TRUJILLO" -> first_name: "JUAN CARLOS", last_name: "REYES TRUJILLO"
function splitName(full: string): { first_name: string; last_name: string } {
  const words = full.trim().split(/\s+/);
  if (words.length <= 2) return { first_name: words[0] ?? '', last_name: words[1] ?? '' };
  const half = Math.floor(words.length / 2);
  return {
    first_name: words.slice(0, half).join(' '),
    last_name:  words.slice(half).join(' '),
  };
}

async function run() {
  try {
    await AppDataSource.initialize();

    const fieldRepo    = AppDataSource.getRepository(Field);
    const employeeRepo = AppDataSource.getRepository(Employee);

    // 1. Crear la field CONTRATO si no existe
    let field = await fieldRepo.findOneBy({ name: 'CONTRATO' });
    if (!field) {
      field = fieldRepo.create({ name: 'CONTRATO', location: 'ADMINISTRACION' });
      await fieldRepo.save(field);
      console.log('Field CONTRATO creada.');
    } else {
      console.log('Field CONTRATO ya existe, usando la existente.');
    }

    // 2. Leer Excel y filtrar solo las cedulas objetivo
    const workbook = XLSX.readFile(FILE);
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    const dataMap = new Map<string, any>();
    for (const row of rows) {
      const cedula = str(row.__EMPTY_1);
      if (!cedula || cedula.toUpperCase() === 'CEDULA') continue;
      if (TARGET_CEDULAS.has(cedula)) {
        dataMap.set(cedula, row);
      }
    }

    console.log(`Cedulas encontradas en Excel: ${dataMap.size} / ${TARGET_CEDULAS.size}`);

    const notInExcel = [...TARGET_CEDULAS].filter((c) => !dataMap.has(c));
    if (notInExcel.length > 0) {
      console.warn('No encontradas en Excel:', notInExcel);
    }

    // 3. Crear empleados
    let created = 0;
    let skipped = 0;

    for (const [cedula, row] of dataMap) {
      const exists = await employeeRepo.findOneBy({ identification_number: cedula });
      if (exists) {
        console.log(`  SKIP ${cedula} — ya existe en BD`);
        skipped++;
        continue;
      }

      const fullName = str(row.__EMPTY_4) ?? '';
      const { first_name, last_name } = splitName(fullName);

      const emp = employeeRepo.create({} as any);
      Object.assign(emp, {
        identification_number:           cedula,
        first_name,
        last_name,
        position:                        str(row.__EMPTY_6) ?? '',
        salario_base:                    Number(row.__EMPTY_9) || 0,
        schedules:                       [] as ScheduleType[],
        aux_trans:                       false,
        aux_hab:                         false,
        aux_ali:                         false,

        // identificacion
        lugar_expedicion:                str(row.__EMPTY_2),
        codigo_vacante:                  str(row.__EMPTY_3),
        fecha_expedicion_cedula:         isExcelDate(row.__EMPTY_24) ? excelDateToISO(row.__EMPTY_24) as any : null,

        // personal
        fecha_nacimiento:                isExcelDate(row.__EMPTY_5)  ? excelDateToISO(row.__EMPTY_5)  as any : null,
        lugar_nacimiento:                str(row.__EMPTY_23),
        estado_civil:                    str(row.__EMPTY_22),
        celular:                         str(row.__EMPTY_25),
        direccion:                       str(row.__EMPTY_26),
        correo_electronico:              str(row.__EMPTY_21),
        formacion:                       str(row.__EMPTY_20),

        // laboral
        fecha_inicio_contrato:           isExcelDate(row.__EMPTY_12) ? excelDateToISO(row.__EMPTY_12) as any : null,
        fecha_retiro_contrato:           isExcelDate(row.__EMPTY_13) ? excelDateToISO(row.__EMPTY_13) as any : null,
        numero_prorroga:                 str(row.__EMPTY_14),
        numero_otro_si:                  str(row.__EMPTY_15),
        convenio:                        str(row.__EMPTY_16),
        vigencia:                        str(row.__EMPTY_19),

        // financiero
        eps:                             str(row.__EMPTY_27),
        afp:                             str(row.__EMPTY_28),
        banco:                           str(row.__EMPTY_29),
        tipo_cuenta:                     str(row.__EMPTY_30),
        numero_cuenta:                   str(row.__EMPTY_31),
        afiliacion_sindicato:            str(row.__EMPTY_32),
        inclusion:                       str(row.__EMPTY_33),

        // certificado residencia
        lugar_exp_certificado_residencia:   str(row['CENTRO DE COSTO ']),
        fecha_exp_certificado_residencia:   isExcelDate(row.__EMPTY_17) ? excelDateToISO(row.__EMPTY_17) as any : null,
        vencimiento_certificado_residencia: isExcelDate(row.__EMPTY_18) ? excelDateToISO(row.__EMPTY_18) as any : null,

        field,
      });

      await employeeRepo.save(emp as any);
      console.log(`  CREATED ${cedula} — ${fullName}`);
      created++;
    }

    console.log('==============================');
    console.log('RESULTADO');
    console.log('==============================');
    console.log('Creados:  ', created);
    console.log('Skipped:  ', skipped);
    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
