import { DataSource } from 'typeorm';
import { Employee, ScheduleType } from '@/plants/employees/entities/employee.entity';
import { Field } from '@/plants/fields/entities/field.entity';


const FIELD_ID = 'e3fa8561-922c-44fa-9df1-8e9f0c4a7f33';

const employeesData: Omit<
  Employee,
  'id' | 'field' | 'created_by' | 'created_at' | 'updated_at' | 'deleted_at'
>[] = [
  // ── 6x6 ──────────────────────────────────────────────────────────────────
  {
    identification_number: '7709620',
    first_name: 'FABIAN ANDRES',
    last_name: 'VARGAS RAMIREZ',
    position: 'OPERADOR MAYOR C',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 5519910,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '1075256835',
    first_name: 'SERGIO EDUARDO',
    last_name: 'RAMIREZ LLANOS',
    position: 'OPERADOR MAYOR C',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 5519910,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '7704328',
    first_name: 'RAFAEL',
    last_name: 'MURCIA',
    position: 'OPERADOR MAYOR C',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 5519910,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '7704488',
    first_name: 'JAIRO',
    last_name: 'QUINTERO BARRETO',
    position: 'OPERADOR MAYOR C',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 5519910,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '1075297364',
    first_name: 'ANDRES FELIPE',
    last_name: 'PALENCIA CHARRY',
    position: 'OPERADOR MAYOR E',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4933050,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '1075213449',
    first_name: 'DANIEL ALBERTO',
    last_name: 'RIVERA',
    position: 'OPERADOR MAYOR E',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4933050,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '7715925',
    first_name: 'DIEGO MAURICIO',
    last_name: 'GARRIDO MOSQUERA',
    position: 'OPERADOR MAYOR E',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4933050,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '1075224282',
    first_name: 'VÍCTOR ALFONSO',
    last_name: 'CÁRDENAS MEDINA',
    position: 'OPERADOR MAYOR E',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4933050,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '1075271673',
    first_name: 'ANDRES FELIPE',
    last_name: 'RIVERA RODRIGUEZ',
    position: 'OPERADOR MAYOR E',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4933050,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '7720521',
    first_name: 'DIEGO ANDRÉS',
    last_name: 'MOSQUERA CHARRY',
    position: 'OPERADOR MAYOR E',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4933050,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '7733010',
    first_name: 'CAMILO ANDRES',
    last_name: 'AVILA VARGAS',
    position: 'OPERADOR MAYOR E',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4933050,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '1075538435',
    first_name: 'NICOLAS',
    last_name: 'MEDINA RAMIREZ',
    position: 'OPERADOR MAYOR E',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4933050,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  // ── 5x2 ──────────────────────────────────────────────────────────────────
  {
    identification_number: '1096184059',
    first_name: 'SERGIO',
    last_name: 'LOPEZ ARTEAGA',
    position: 'SUPERVISOR PLANTA DE GAS',
    aux_trans: false,
    aux_hab: false,
    aux_ali: false,
    salario_base: 8600000,
    schedules: [ScheduleType.FIVE_BY_TWO],
  },
];

export async function seedEmployeesPlanDeGas(dataSource: DataSource): Promise<void> {
  const employeeRepo = dataSource.getRepository(Employee);
  const fieldRepo = dataSource.getRepository(Field);

  const field = await fieldRepo.findOneBy({ id: FIELD_ID });
  if (!field) {
    throw new Error(`Field with id ${FIELD_ID} not found. Run field seed first.`);
  }

  let created = 0;
  let skipped = 0;

  for (const data of employeesData) {
    const exists = await employeeRepo.findOneBy({
      identification_number: data.identification_number,
    });

    if (exists) {
      skipped++;
      continue;
    }

    const employee = employeeRepo.create({ ...data, field });
    await employeeRepo.save(employee);
    created++;
  }

  console.log(
    `✅ Planta de Gas seed complete — created: ${created}, skipped (already exist): ${skipped}`,
  );
}