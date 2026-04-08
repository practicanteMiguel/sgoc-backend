import { DataSource } from 'typeorm';
import { Employee,ScheduleType } from '@/plants/employees/entities/employee.entity';
import { Field } from '@/plants/fields/entities/field.entity';

const FIELD_ID = '25766b54-f8fe-4f1e-b050-da1f0ba49bf9';

const employeesData: Partial<
  Employee>[] = [
  // ── 6x6 ──────────────────────────────────────────────────────────────────
  {
    identification_number: '83238152',
    first_name: 'EDWAR ANDRÉS',
    last_name: 'TOVAR PAREDES',
    position: 'MANTENEDOR MAYOR C',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 5519910,
    schedules: [ScheduleType.FIVE_BY_TWO],
  },
  {
    identification_number: '83237660',
    first_name: 'JHOAN TAMAYO',
    last_name: 'PERDOMO',
    position: 'AYUDANTE TECNICO DE SOLDADURA - AYUDANTE TECNICO C',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 3698190,
    schedules: [ScheduleType.FIVE_BY_TWO],
  },
  {
    identification_number: '4951928',
    first_name: 'JOSE ORLANDO',
    last_name: 'CERQUERA LOSADA',
    position: 'CAPATAZ CUADRILLA DE PRODUCCION',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4347090,
    schedules: [ScheduleType.FIVE_BY_TWO],
  },
  {
    identification_number: '1082214575',
    first_name: 'LINO ARTURO',
    last_name: 'JOVEL',
    position: 'AUXILIAR TRANSVERSAL B',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 3698190,
    schedules: [ScheduleType.FIVE_BY_TWO],
  },
  {
    identification_number: '83238091',
    first_name: 'ARBEY TRUJILLO',
    last_name: 'CASTRO',
    position: 'AUXILIAR TRANSVERSAL B',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 3698190,
    schedules: [ScheduleType.FIVE_BY_TWO],
  },
  {
    identification_number: '1075261714',
    first_name: 'HERNAN MENZA',
    last_name: 'ARAUJO',
    position: 'AUXILIAR TRANSVERSAL B',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 3698190,
    schedules: [ScheduleType.FIVE_BY_TWO],
  },
  {
    identification_number: '1082215696',
    first_name: 'JOSE GABRIEL',
    last_name: 'YARURO VARGAS',
    position: 'OBRERO B',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 3149280,
    schedules: [ScheduleType.FIVE_BY_TWO],
  },
  {
    identification_number: '1082214425',
    first_name: 'MAYURLEY RIVERA',
    last_name: 'PERDOMO',
    position: 'OBRERO B',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 3149280,
    schedules: [ScheduleType.FIVE_BY_TWO],
  },
  {
    identification_number: '4951989',
    first_name: 'CARLOS ALBERTO',
    last_name: 'ROJAS',
    position: 'OPERADOR MENOR D (PEÑALISA)',
    aux_trans: false,
    aux_hab: true,
    aux_ali: true,
    salario_base: 4077630,
    schedules: [ScheduleType.FIVE_BY_TWO],
  },
  {
    identification_number: '1082214572',
    first_name: 'OSCAR FABIAN',
    last_name: 'CORDOBA MANCHOLA',
    position: 'SUPERVISOR DE PRODUCCION',
    aux_trans: false,
    aux_hab: false,
    aux_ali: false,
    salario_base: 8177580,
    schedules: [ScheduleType.FIVE_BY_TWO],
  },
  {
    identification_number: '83237577',
    first_name: 'FAIVER ALARCON',
    last_name: 'CALDERON',
    position: 'RECORREDOR B',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4347090,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '83237518',
    first_name: 'RICARDO RIVAS',
    last_name: 'DUSSAN',
    position: 'RECORREDOR B',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4347090,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '1082214959',
    first_name: 'JORGE LEONARDO',
    last_name: 'MEDINA',
    position: 'RECORREDOR B',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4347090,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '1082214509',
    first_name: 'EDISSON JAVIER',
    last_name: 'CICERO',
    position: 'RECORREDOR B',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4347090,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '83238061',
    first_name: 'JUAN PABLO',
    last_name: 'ZULETA',
    position: 'OPERADOR MAYOR C',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 5519910,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '83237547',
    first_name: 'OSCAR JAVIER',
    last_name: 'CUEVAS POLO',
    position: 'OPERADOR MAYOR C',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 5519910,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '83237550',
    first_name: 'EDIMER IBAÑEZ',
    last_name: 'BAUTISTA',
    position: 'OPERADOR MAYOR C',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 5519910,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '83237770',
    first_name: 'WILLINTON VARGAS',
    last_name: 'ANDRADE',
    position: 'OPERADOR MAYOR C',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 5519910,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '1082214905',
    first_name: 'ROMULO',
    last_name: 'PERDOMO',
    position: 'OPERADOR MENOR D',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4077630,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '1082214656',
    first_name: 'ANDRES MONJE',
    last_name: 'YUSTRES',
    position: 'OPERADOR MENOR D',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4077630,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '1082214613',
    first_name: 'RAFAEL ANDRES',
    last_name: 'QUINTERO RIVERA',
    position: 'OPERADOR MENOR D',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4472820,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
  {
    identification_number: '83237429',
    first_name: 'FRANQUI MOSQUERA',
    last_name: 'MURCIA',
    position: 'OPERADOR MENOR D',
    aux_trans: false,
    aux_hab: true,
    aux_ali: false,
    salario_base: 4077630,
    schedules: [ScheduleType.SIX_BY_SIX],
  },
];

export async function seedEmployeesYaguara(dataSource: DataSource): Promise<void> {
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
    `✅ Yaguara seed complete — created: ${created}, skipped (already exist): ${skipped}`,
  );
}