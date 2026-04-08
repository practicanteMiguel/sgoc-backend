import 'reflect-metadata';
import * as XLSX from 'xlsx';
import * as dotenv from 'dotenv';
import { DataSource, In } from 'typeorm';
import { Employee } from '@/plants/employees/entities/employee.entity';

dotenv.config();

const FILE = 'CTO CW 286091 24.03.2026.xlsx';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../../**/*.entity.{ts,js}'],
  synchronize: false,
});

// Excel guarda fechas como numero serial desde 1899-12-30
function excelDateToISO(serial: number): string | null {
  if (!serial || isNaN(serial)) return null;
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

function str(val: any): string | null {
  if (val === undefined || val === null || val === '') return null;
  return String(val).trim() || null;
}

function isDate(val: any): boolean {
  return typeof val === 'number' && val > 1000;
}

async function run() {
  try {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Employee);

    const workbook = XLSX.readFile(FILE);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    // Saltar la fila de encabezados (donde __EMPTY_1 = 'CEDULA')
    const dataRows = rows.filter(
      (r) => r.__EMPTY_1 && String(r.__EMPTY_1).trim().toUpperCase() !== 'CEDULA',
    );

    // Construir mapa cedula -> datos del Excel
    const dataMap = new Map<string, any>();
    for (const row of dataRows) {
      const cedula = str(row.__EMPTY_1);
      if (!cedula) continue;
      dataMap.set(cedula, row);
    }

    const ids = Array.from(dataMap.keys());
    const employees = await repo.find({ where: { identification_number: In(ids) } });

    let updated = 0;
    const foundIds = new Set<string>();

    for (const emp of employees) {
      const row = dataMap.get(emp.identification_number);
      if (!row) continue;
      foundIds.add(emp.identification_number);

      // Solo actualiza un campo si viene con valor en el Excel
      const set = (current: any, val: any) =>
        val !== null && val !== undefined ? val : current;

      emp.lugar_expedicion                     = set(emp.lugar_expedicion,                     str(row.__EMPTY_2));
      emp.codigo_vacante                        = set(emp.codigo_vacante,                        str(row.__EMPTY_3));
      emp.fecha_nacimiento                      = set(emp.fecha_nacimiento,                      isDate(row.__EMPTY_5)  ? (excelDateToISO(row.__EMPTY_5) as any)  : emp.fecha_nacimiento);
      emp.fecha_inicio_contrato                 = set(emp.fecha_inicio_contrato,                 isDate(row.__EMPTY_12) ? (excelDateToISO(row.__EMPTY_12) as any) : emp.fecha_inicio_contrato);
      emp.fecha_retiro_contrato                 = set(emp.fecha_retiro_contrato,                 isDate(row.__EMPTY_13) ? (excelDateToISO(row.__EMPTY_13) as any) : emp.fecha_retiro_contrato);
      emp.numero_prorroga                       = set(emp.numero_prorroga,                       str(row.__EMPTY_14));
      emp.numero_otro_si                        = set(emp.numero_otro_si,                        str(row.__EMPTY_15));
      emp.convenio                              = set(emp.convenio,                              str(row.__EMPTY_16));
      emp.lugar_exp_certificado_residencia      = set(emp.lugar_exp_certificado_residencia,      str(row['CENTRO DE COSTO ']));
      emp.fecha_exp_certificado_residencia      = set(emp.fecha_exp_certificado_residencia,      isDate(row.__EMPTY_17) ? (excelDateToISO(row.__EMPTY_17) as any) : emp.fecha_exp_certificado_residencia);
      emp.vencimiento_certificado_residencia    = set(emp.vencimiento_certificado_residencia,    isDate(row.__EMPTY_18) ? (excelDateToISO(row.__EMPTY_18) as any) : emp.vencimiento_certificado_residencia);
      emp.vigencia                              = set(emp.vigencia,                              str(row.__EMPTY_19));
      emp.formacion                             = set(emp.formacion,                             str(row.__EMPTY_20));
      emp.correo_electronico                    = set(emp.correo_electronico,                    str(row.__EMPTY_21));
      emp.estado_civil                          = set(emp.estado_civil,                          str(row.__EMPTY_22));
      emp.lugar_nacimiento                      = set(emp.lugar_nacimiento,                      str(row.__EMPTY_23));
      emp.fecha_expedicion_cedula               = set(emp.fecha_expedicion_cedula,               isDate(row.__EMPTY_24) ? (excelDateToISO(row.__EMPTY_24) as any) : emp.fecha_expedicion_cedula);
      emp.celular                               = set(emp.celular,                               str(row.__EMPTY_25));
      emp.direccion                             = set(emp.direccion,                             str(row.__EMPTY_26));
      emp.eps                                   = set(emp.eps,                                   str(row.__EMPTY_27));
      emp.afp                                   = set(emp.afp,                                   str(row.__EMPTY_28));
      emp.banco                                 = set(emp.banco,                                 str(row.__EMPTY_29));
      emp.tipo_cuenta                           = set(emp.tipo_cuenta,                           str(row.__EMPTY_30));
      emp.numero_cuenta                         = set(emp.numero_cuenta,                         str(row.__EMPTY_31));

      emp.afiliacion_sindicato = set(emp.afiliacion_sindicato, str(row.__EMPTY_32));
      emp.inclusion            = set(emp.inclusion,            str(row.__EMPTY_33));

      await repo.save(emp);
      updated++;
    }

    const notFound = ids.filter((id) => !foundIds.has(id));

    console.log('==============================');
    console.log('RESULTADO');
    console.log('==============================');
    console.log('Total en Excel:    ', ids.length);
    console.log('Actualizados:      ', updated);
    console.log('No encontrados:    ', notFound.length);

    if (notFound.length > 0) {
      console.log('Cedulas no encontradas en BD:');
      console.log(notFound);
    }

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
