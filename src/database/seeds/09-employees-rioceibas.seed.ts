import { DataSource } from 'typeorm';
import { Employee, ScheduleType } from '@/plants/employees/entities/employee.entity';
import { Field } from '@/plants/fields/entities/field.entity';

const FIELD_ID = '04c8e844-2e2d-4c38-8a2a-8d836a3d9e24';

const employeesData: Partial<
  Employee>[] = [
  // ── 6x6 ──────────────────────────────────────────────────────────────────
  {
    identification_number: '93202622',
    first_name: 'CARLOS AUGUSTO',
    last_name: 'BARBOSA',
    position: 'OPERADOR MENOR D',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4077630,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '7691760',
    first_name: 'DAVIER IVAN',
    last_name: 'CONDE AVILES',
    position: 'OPERADOR MAYOR C',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 5519910,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '1075245144',
    first_name: 'DIEGO ARMANDO',
    last_name: 'PERDOMO PERDOMO',
    position: 'RECORREDOR B',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4347090,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '7702401',
    first_name: 'EDGAR',
    last_name: 'QUINTERO BARRETO',
    position: 'OPERADOR MENOR D',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4077630,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '93130983',
    first_name: 'HALVER',
    last_name: 'VILLANUEVA DONOSO',
    position: 'RECORREDOR B',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4347090,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '7709541',
    first_name: 'HECTOR',
    last_name: 'PERDOMO ALMANZA',
    position: 'RECORREDOR B',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4347090,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '1082214723',
    first_name: 'JAVIER ORLANDO',
    last_name: 'CERQUERA MEJIA',
    position: 'OPERADOR MAYOR C',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 5519910,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '7700713',
    first_name: 'JHON JAIRO',
    last_name: 'PASCUAS ROJAS',
    position: 'OPERADOR MAYOR C',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 5519910,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '7720734',
    first_name: 'LUIS FERNANDO',
    last_name: 'LOSADA VILLANEDA',
    position: 'OPERADOR MAYOR C',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 5519910,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '1075277663',
    first_name: 'PACIFICO',
    last_name: 'BAILON BARRETO',
    position: 'OPERADOR MENOR D',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4077630,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
   
    identification_number: '1075245670',
    first_name: 'RODRIGO',
    last_name: 'VALDEZ LOPEZ',
    position: 'RECORREDOR B',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4347090,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '7697453',
    first_name: 'VICTOR HUGO',
    last_name: 'RIVEROS',
    position: 'OPERADOR MENOR D',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4472820,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  // ── 5x2 ──────────────────────────────────────────────────────────────────
  {
    identification_number: '12206476',
    first_name: 'MAXIMINO',
    last_name: 'SERRANO RIVERA',
    position: 'CAPATAZ CUADRILLA DE PRODUCCION',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4347090,
    schedules: [ScheduleType.FIVE_BY_TWO],
  },
  {
    identification_number: '12129609',
    first_name: 'LUIS ANGEL',
    last_name: 'GARCIA',
    position: 'AUXILIAR TRANSVERSAL B',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 3698190,
    schedules: [ScheduleType.FIVE_BY_TWO],
  },
  {
    identification_number: '12135298',
    first_name: 'REINEL',
    last_name: 'PASCUAS',
    position: 'AUXILIAR TRANSVERSAL B',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 3698190,
    schedules: [ScheduleType.FIVE_BY_TWO],
  },
  {
    identification_number: '1082804623',
    first_name: 'SERGIO ANDRES',
    last_name: 'BARRETO',
    position: 'AUXILIAR TRANSVERSAL B',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 3698190,
    schedules: [ScheduleType.FIVE_BY_TWO],
  },
  {
    identification_number: '1075246046',
    first_name: 'MAROLY',
    last_name: 'ROJAS PASTRANA',
    position: 'OBRERO B',
    aux_trans: true,
    aux_hab: true,
    aux_ali: false,
    salario_base: 3149280,
    schedules: [ScheduleType.FIVE_BY_TWO],
  },
  {
    identification_number: '1075224837',
    first_name: 'JULIANA',
    last_name: 'SUAREZ SUAZA',
    position: 'OBRERO B',
    aux_trans: true,
    aux_hab: true,
    aux_ali: false,
    salario_base: 3149280,
    schedules: [ScheduleType.FIVE_BY_TWO],
  },
  {
    identification_number: '7689339',
    first_name: 'ARMANDO ARTURO',
    last_name: 'NOCUA BERNAL',
    position: 'SUPERVISOR DE PRODUCCION',
    aux_trans: false,
    aux_hab: false,
    aux_ali: false,
    salario_base: 8177580,
    schedules: [ScheduleType.FIVE_BY_TWO],
  },
];

export async function seedEmployeesRioCeibas(dataSource: DataSource): Promise<void> {
  const employeeRepo = dataSource.getRepository(Employee);
  const fieldRepo = dataSource.getRepository(Field);

  const field = await fieldRepo.findOneBy({ id: FIELD_ID });
  if (!field) {
    throw new Error(`Field with id ${FIELD_ID} not found. Run field seed first.`);
  }

  let created = 0;
  let skipped = 0;

  for (const data of employeesData) {
    if (data.identification_number === 'PENDIENTE') {
      console.warn(
        `⚠️  Skipping ${data.first_name} ${data.last_name} — identification_number faltante en el Excel`,
      );
      continue;
    }

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
    `✅ Rio Ceibas seed complete — created: ${created}, skipped (already exist): ${skipped}`,
  );
}