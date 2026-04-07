import 'reflect-metadata';
import * as XLSX from 'xlsx';
import { In } from 'typeorm';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Employee } from '@/plants/employees/entities/employee.entity';

dotenv.config();
// 🔹 CONFIGURA TU DATASOURCE (ajusta si es necesario)
const AppDataSource = new DataSource({
  type: 'postgres', // o mysql
  url: process.env.DATABASE_URL, // o usa host, username, password, database
  entities: [__dirname + '/../../**/*.entity.{ts,js}'],
  synchronize: false,
});
async function run() {
  try {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Employee);

    // 📄 Leer Excel
      const workbook = XLSX.readFile('CTO CW 286091 24.03.2026.xlsx');
     
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);
 

    // 🧠 Mapear cedula -> salario
    const salaryMap = new Map<string, number>();

    for (const row of rows) {
  const cedula = String(row.__EMPTY_1).trim();
  const salario = Number(row.__EMPTY_9);

  if (!cedula || cedula === 'undefined' || isNaN(salario)) continue;

  salaryMap.set(cedula, salario);
}

    const ids = Array.from(salaryMap.keys());

    // 🔥 traer todos de una (rápido)
    const employees = await repo.find({
      where: {
        identification_number: In(ids),
      },
    });

    let updated = 0;
    const foundIds = new Set<string>();

    for (const emp of employees) {
      const newSalary = salaryMap.get(emp.identification_number);

      if (!newSalary) continue;

      if (emp.salario_base !== newSalary) {
        emp.salario_base = newSalary;
        await repo.save(emp);
        updated++;
      }

      foundIds.add(emp.identification_number);
    }

    // 🚨 detectar faltantes
    const notFound = ids.filter(id => !foundIds.has(id));

    console.log('==============================');
    console.log('📊 RESULTADO');
    console.log('==============================');
    console.log('Total Excel:', ids.length);
    console.log('Actualizados:', updated);
    console.log('No encontrados:', notFound.length);

    if (notFound.length > 0) {
      console.log('🚨 Cedulas no encontradas:');
      console.log(notFound);
    }

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

run();