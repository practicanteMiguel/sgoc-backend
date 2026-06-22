import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');
import * as bcrypt from 'bcrypt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';
import { Role } from '../src/roles/entities/role.entity';
import { UserRole } from '../src/roles/entities/user-role.entity';
import { Session } from '../src/users/entities/session.entity';
import { MailService } from '../src/mail/mail.service';
import { Field } from '../src/plants/fields/entities/field.entity';
import { Employee } from '../src/plants/employees/entities/employee.entity';

const ADMIN_EMAIL = 'qa-plants-admin@test.com';
const COORD_EMAIL = 'qa-plants-coord@test.com';
const PLAIN_EMAIL  = 'qa-plants-plain@test.com';
const TEST_PASSWORD = 'TestPass123!';

describe('Plants (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let roleRepo: Repository<Role>;
  let userRoleRepo: Repository<UserRole>;
  let sessionRepo: Repository<Session>;
  let fieldRepo: Repository<Field>;
  let employeeRepo: Repository<Employee>;

  let adminUser: User;
  let coordUser: User;
  let plainUser: User;

  let adminToken: string;
  let coordToken: string;
  let plainToken: string;

  let testField: Field;
  let testEmployee: Employee;
  let testCrewId: string;

  const createdEmployeeIds: string[] = [];

  async function cleanupUsers(ids: string[]) {
    if (ids.length === 0) return;
    const ph = ids.map((_, i) => `$${i + 1}`).join(', ');
    // Nulificar created_by en todas las tablas que referencian users
    await userRoleRepo.query(`UPDATE user_roles SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await userRepo.query(`UPDATE users SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await roleRepo.query(`UPDATE roles SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await fieldRepo.query(`UPDATE employees SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await fieldRepo.query(`UPDATE fields SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await fieldRepo.query(`UPDATE crews SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await fieldRepo.query(`UPDATE weekly_logs SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await sessionRepo.query(`DELETE FROM sessions WHERE user_id IN (${ph})`, ids);
    await userRoleRepo.query(`DELETE FROM user_roles WHERE user_id IN (${ph})`, ids);
    await userRepo.query(`DELETE FROM users WHERE id IN (${ph})`, ids);
  }

  async function cleanupField(fieldId: string) {
    // via_reports NO tiene field_id directo, se enlaza via monthly_log_id
    await fieldRepo.query(`DELETE FROM via_report_items WHERE report_id IN (SELECT id FROM via_reports WHERE monthly_log_id IN (SELECT id FROM via_monthly_logs WHERE field_id = $1))`, [fieldId]);
    await fieldRepo.query(`DELETE FROM via_reports WHERE monthly_log_id IN (SELECT id FROM via_monthly_logs WHERE field_id = $1)`, [fieldId]);
    await fieldRepo.query(`DELETE FROM via_captures WHERE capture_group_id IN (SELECT id FROM via_capture_groups WHERE monthly_log_id IN (SELECT id FROM via_monthly_logs WHERE field_id = $1))`, [fieldId]);
    await fieldRepo.query(`DELETE FROM via_capture_groups WHERE monthly_log_id IN (SELECT id FROM via_monthly_logs WHERE field_id = $1)`, [fieldId]);
    await fieldRepo.query(`DELETE FROM via_monthly_logs WHERE field_id = $1`, [fieldId]);
    await fieldRepo.query(`DELETE FROM log_activities WHERE weekly_log_id IN (SELECT id FROM weekly_logs WHERE crew_id IN (SELECT id FROM crews WHERE field_id = $1))`, [fieldId]);
    await fieldRepo.query(`DELETE FROM weekly_logs WHERE crew_id IN (SELECT id FROM crews WHERE field_id = $1)`, [fieldId]);
    await fieldRepo.query(`DELETE FROM crews WHERE field_id = $1`, [fieldId]);
    await fieldRepo.query(`UPDATE employees SET field_id = NULL WHERE field_id = $1`, [fieldId]);
    await fieldRepo.query(`UPDATE users SET field_id = NULL WHERE field_id = $1`, [fieldId]);
    await fieldRepo.query(`DELETE FROM fields WHERE id = $1`, [fieldId]);
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();

    userRepo     = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    roleRepo     = moduleFixture.get<Repository<Role>>(getRepositoryToken(Role));
    userRoleRepo = moduleFixture.get<Repository<UserRole>>(getRepositoryToken(UserRole));
    sessionRepo  = moduleFixture.get<Repository<Session>>(getRepositoryToken(Session));
    fieldRepo    = moduleFixture.get<Repository<Field>>(getRepositoryToken(Field));
    employeeRepo = moduleFixture.get<Repository<Employee>>(getRepositoryToken(Employee));

    const mailService = app.get(MailService);
    jest.spyOn(mailService, 'sendVerificationEmail').mockResolvedValue(undefined);
    jest.spyOn(mailService, 'sendPasswordResetByAdmin').mockResolvedValue(undefined);

    // Limpiar stale data de corridas anteriores
    const staleUsers = await userRepo.find({
      where: [{ email: ADMIN_EMAIL }, { email: COORD_EMAIL }, { email: PLAIN_EMAIL }],
    });
    await cleanupUsers(staleUsers.map(u => u.id));
    await fieldRepo.query(`DELETE FROM fields WHERE name LIKE 'QA-Plants-%'`);
    await employeeRepo.query(`DELETE FROM employees WHERE identification_number LIKE 'QAPL-%'`);

    // Asegurar roles del sistema
    for (const r of [
      { slug: 'admin',       name: 'Administrador', is_system: true },
      { slug: 'coordinator', name: 'Coordinador',   is_system: true },
    ]) {
      if (!(await roleRepo.findOne({ where: { slug: r.slug } }))) {
        await roleRepo.save(roleRepo.create({ ...r, is_active: true }));
      }
    }

    const adminRole = await roleRepo.findOneOrFail({ where: { slug: 'admin' } });
    const coordRole = await roleRepo.findOneOrFail({ where: { slug: 'coordinator' } });
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);

    adminUser = await userRepo.save(userRepo.create({
      email: ADMIN_EMAIL, password_hash: hash,
      first_name: 'QA', last_name: 'PlantsAdmin', position: 'tester',
      is_active: true, is_email_verified: true, is_first_login: false,
    }));
    await userRoleRepo.save({ user: adminUser, role: adminRole });

    coordUser = await userRepo.save(userRepo.create({
      email: COORD_EMAIL, password_hash: hash,
      first_name: 'QA', last_name: 'PlantsCoord', position: 'tester',
      is_active: true, is_email_verified: true, is_first_login: false,
    }));
    await userRoleRepo.save({ user: coordUser, role: coordRole });

    plainUser = await userRepo.save(userRepo.create({
      email: PLAIN_EMAIL, password_hash: hash,
      first_name: 'QA', last_name: 'PlantsPlain', position: 'tester',
      is_active: true, is_email_verified: true, is_first_login: false,
    }));

    // Crear campo de prueba base
    testField = await fieldRepo.save(
      fieldRepo.create({ name: `QA-Plants-Field-${Date.now()}`, location: 'QA Location Test' }),
    );

    // Asignar campo al adminUser (necesario para crear cuadrillas)
    await userRepo.update(adminUser.id, { field_id: testField.id } as any);
    adminUser.field_id = testField.id as any;

    // Crear empleado de prueba base
    testEmployee = await employeeRepo.save(employeeRepo.create({
      identification_number: `QAPL-${Date.now()}`,
      first_name: 'QA', last_name: 'Empleado', position: 'Operario QA',
      salario_base: 1500000,
      schedules: ['6x6'] as any,
    }));

    // Login
    adminToken = (await request(app.getHttpServer())
      .post('/api/v1/auth/login').send({ email: ADMIN_EMAIL, password: TEST_PASSWORD }))
      .body.access_token;
    coordToken = (await request(app.getHttpServer())
      .post('/api/v1/auth/login').send({ email: COORD_EMAIL, password: TEST_PASSWORD }))
      .body.access_token;
    plainToken = (await request(app.getHttpServer())
      .post('/api/v1/auth/login').send({ email: PLAIN_EMAIL, password: TEST_PASSWORD }))
      .body.access_token;

    // Crear cuadrilla base para tests de logbook
    const crewRes = await request(app.getHttpServer())
      .post('/api/v1/crews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'QA-Plants-Crew-Base' });
    if (crewRes.status === 201) testCrewId = crewRes.body.id;
  });

  afterAll(async () => {
    // Limpiar logbooks del crew de prueba
    if (testCrewId) {
      await fieldRepo.query(`DELETE FROM log_activities WHERE weekly_log_id IN (SELECT id FROM weekly_logs WHERE crew_id = $1)`, [testCrewId]);
      await fieldRepo.query(`DELETE FROM weekly_logs WHERE crew_id = $1`, [testCrewId]);
      await fieldRepo.query(`DELETE FROM crews WHERE id = $1`, [testCrewId]);
    }

    // Limpiar empleados creados en tests
    for (const id of createdEmployeeIds) {
      await employeeRepo.query(`UPDATE employees SET field_id = NULL WHERE id = $1`, [id]);
      await employeeRepo.query(`DELETE FROM employees WHERE id = $1`, [id]);
    }
    if (testEmployee) {
      await employeeRepo.query(`DELETE FROM employees WHERE id = $1`, [testEmployee.id]);
    }

    // Limpiar campo (y sus dependencias)
    if (testField) await cleanupField(testField.id);
    // Campos creados con el API (pueden tener nombre distinto)
    await fieldRepo.query(`DELETE FROM fields WHERE name LIKE 'QA-Plants-%'`);

    const allUserIds = [adminUser?.id, coordUser?.id, plainUser?.id].filter(Boolean) as string[];
    await cleanupUsers(allUserIds);
    await app.close();
  });

  // ─── FIELDS: GET ──────────────────────────────────────────────────────────
  describe('GET /api/v1/fields', () => {
    it('usuario con rol puede listar plantas', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/fields')
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/fields')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer()).get('/api/v1/fields').expect(401);
    });
  });

  describe('GET /api/v1/fields/:id', () => {
    it('usuario con rol puede ver una planta', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/fields/${testField.id}`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);
      expect(res.body.id).toBe(testField.id);
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/fields/${testField.id}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });

    it('retorna 404 para UUID inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/fields/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/fields/${testField.id}`)
        .expect(401);
    });
  });

  describe('POST /api/v1/fields', () => {
    it('admin puede crear una planta', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/fields')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `QA-Plants-Created-${Date.now()}`, location: 'QA Loc Admin' })
        .expect(201);
      expect(res.body).toHaveProperty('id');
    });

    it('coordinator puede crear una planta', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/fields')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ name: `QA-Plants-Created-Coord-${Date.now()}`, location: 'QA Loc Coord' })
        .expect(201);
      expect(res.body).toHaveProperty('id');
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/fields')
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ name: 'Planta Hacker', location: 'Loc' })
        .expect(403);
    });

    it('retorna 400 con nombre faltante', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/fields')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ location: 'Loc sin nombre' })
        .expect(400);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/fields')
        .send({ name: 'Sin token', location: 'Loc' })
        .expect(401);
    });
  });

  describe('PATCH /api/v1/fields/:id', () => {
    it('admin puede actualizar una planta', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/fields/${testField.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ location: 'QA Location Updated' })
        .expect(200);
      expect(res.body.location).toBe('QA Location Updated');
    });

    it('coordinator puede actualizar una planta', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/fields/${testField.id}`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ location: 'QA Location Coord' })
        .expect(200);
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/fields/${testField.id}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ location: 'Hacked' })
        .expect(403);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/fields/${testField.id}`)
        .send({ location: 'X' })
        .expect(401);
    });
  });

  describe('GET /api/v1/fields/:id/lugares', () => {
    it('cualquier usuario autenticado puede listar subespacios', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/fields/${testField.id}/lugares`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/fields/${testField.id}/lugares`)
        .expect(401);
    });
  });

  describe('DELETE /api/v1/fields/:id', () => {
    it('coordinator puede eliminar una planta (ahora permitido)', async () => {
      // Crear campo temporal para no afectar testField que usan otros tests
      const tmpRes = await request(app.getHttpServer())
        .post('/api/v1/fields')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ name: `QA-Plants-Temp-Del-${Date.now()}`, location: 'Temp' })
        .expect(201);
      await request(app.getHttpServer())
        .delete(`/api/v1/fields/${tmpRes.body.id}`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/fields/${testField.id}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/fields/${testField.id}`)
        .expect(401);
    });
  });

  // ─── EMPLOYEES: GET ───────────────────────────────────────────────────────
  describe('GET /api/v1/employees', () => {
    it('usuario con rol puede listar empleados', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('data');
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });

    it('filtra por field_id correctamente', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/employees?field_id=${testField.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('data');
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer()).get('/api/v1/employees').expect(401);
    });
  });

  describe('GET /api/v1/employees/:id', () => {
    it('usuario con rol puede ver un empleado', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/employees/${testEmployee.id}`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);
      expect(res.body.id).toBe(testEmployee.id);
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/employees/${testEmployee.id}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });

    it('retorna 404 para UUID inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/employees/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/employees/${testEmployee.id}`)
        .expect(401);
    });
  });

  describe('POST /api/v1/employees', () => {
    it('admin puede crear un empleado con asignacion de planta', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          identification_number: `QAPL-EMP-${Date.now()}`,
          first_name: 'Nuevo', last_name: 'Empleado QA',
          position: 'Operario', salario_base: 1500000,
          schedules: ['6x6'], field_id: testField.id,
        })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      createdEmployeeIds.push(res.body.id);
    });

    it('coordinator puede crear un empleado', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          identification_number: `QAPL-COORD-${Date.now()}`,
          first_name: 'Coord', last_name: 'Empleado', position: 'Operario',
          salario_base: 1200000, schedules: ['5x2'],
        })
        .expect(201);
      createdEmployeeIds.push(res.body.id);
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${plainToken}`)
        .send({
          identification_number: `QAPL-HACK-${Date.now()}`,
          first_name: 'H', last_name: 'H', position: 'H',
          salario_base: 1, schedules: ['6x6'],
        })
        .expect(403);
    });

    it('retorna 400 sin campos obligatorios', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ first_name: 'Sin identification ni schedules' })
        .expect(400);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer()).post('/api/v1/employees').send({}).expect(401);
    });
  });

  describe('PATCH /api/v1/employees/:id', () => {
    it('admin puede actualizar un empleado', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/employees/${testEmployee.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ position: 'Operario Senior QA' })
        .expect(200);
      expect(res.body.position).toBe('Operario Senior QA');
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/employees/${testEmployee.id}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ position: 'Hacked' })
        .expect(403);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/employees/${testEmployee.id}`)
        .send({ position: 'X' })
        .expect(401);
    });
  });

  describe('DELETE /api/v1/employees/:id', () => {
    it('[SEGURIDAD] coordinator NO puede eliminar empleado (solo admin/module_manager)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/employees/${testEmployee.id}`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(403);
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/employees/${testEmployee.id}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/employees/${testEmployee.id}`)
        .expect(401);
    });
  });

  // ─── CREWS ────────────────────────────────────────────────────────────────
  describe('GET /api/v1/crews', () => {
    it('cualquier usuario autenticado puede listar cuadrillas', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/crews')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('data');
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer()).get('/api/v1/crews').expect(401);
    });
  });

  describe('GET /api/v1/crews/:id', () => {
    it('cualquier usuario autenticado puede ver una cuadrilla', async () => {
      if (!testCrewId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/crews/${testCrewId}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(res.body.id).toBe(testCrewId);
    });

    it('retorna 401 sin token', async () => {
      if (!testCrewId) return;
      await request(app.getHttpServer())
        .get(`/api/v1/crews/${testCrewId}`)
        .expect(401);
    });
  });

  describe('POST /api/v1/crews', () => {
    it('admin (con campo asignado) puede crear una cuadrilla', async () => {
      // admin.field_id fue asignado en beforeAll
      const res = await request(app.getHttpServer())
        .post('/api/v1/crews')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `QA-Plants-Crew-Extra-${Date.now()}` })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      // Limpiar inmediatamente para no acumular
      await fieldRepo.query(`DELETE FROM crews WHERE id = $1`, [res.body.id]);
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/crews')
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ name: 'Cuadrilla Hacker' })
        .expect(403);
    });

    it('retorna 400 si el nombre es demasiado corto (minLength 2)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/crews')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'X' })
        .expect(400);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/crews')
        .send({ name: 'Sin token' })
        .expect(401);
    });
  });

  describe('PATCH /api/v1/crews/:id', () => {
    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      if (!testCrewId) return;
      await request(app.getHttpServer())
        .patch(`/api/v1/crews/${testCrewId}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ name: 'Hacked Crew' })
        .expect(403);
    });

    it('admin puede renombrar una cuadrilla', async () => {
      if (!testCrewId) return;
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/crews/${testCrewId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'QA-Plants-Crew-Renamed' })
        .expect(200);
      expect(res.body.name).toBe('QA-Plants-Crew-Renamed');
    });

    it('retorna 401 sin token', async () => {
      if (!testCrewId) return;
      await request(app.getHttpServer())
        .patch(`/api/v1/crews/${testCrewId}`)
        .send({ name: 'X' })
        .expect(401);
    });
  });

  // ─── LOGBOOK ──────────────────────────────────────────────────────────────
  describe('GET /api/v1/logbook', () => {
    it('cualquier usuario autenticado puede listar bitacoras', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/logbook')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('data');
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer()).get('/api/v1/logbook').expect(401);
    });
  });

  describe('POST /api/v1/logbook', () => {
    it('admin puede crear una bitacora semanal', async () => {
      if (!testCrewId) return;
      const res = await request(app.getHttpServer())
        .post('/api/v1/logbook')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ crew_id: testCrewId, week_number: 50, year: 2026 })
        .expect(201);
      expect(res.body).toHaveProperty('id');
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      if (!testCrewId) return;
      await request(app.getHttpServer())
        .post('/api/v1/logbook')
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ crew_id: testCrewId, week_number: 51, year: 2026 })
        .expect(403);
    });

    it('retorna 400 sin crew_id', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/logbook')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ week_number: 1, year: 2026 })
        .expect(400);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/logbook')
        .send({ crew_id: testCrewId, week_number: 1, year: 2026 })
        .expect(401);
    });
  });

  // ─── TECHNICAL REPORTS ───────────────────────────────────────────────────
  describe('GET /api/v1/technical-reports', () => {
    it('cualquier usuario autenticado puede listar reportes tecnicos', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/technical-reports')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('data');
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer()).get('/api/v1/technical-reports').expect(401);
    });
  });

  describe('POST /api/v1/technical-reports', () => {
    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/technical-reports')
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ title: 'Reporte Hacker' })
        .expect(403);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/technical-reports')
        .send({ title: 'X' })
        .expect(401);
    });
  });

  // ─── VIA MONTHLY LOG ─────────────────────────────────────────────────────
  describe('GET /api/v1/via-logs', () => {
    it('cualquier usuario autenticado puede listar registros mensuales de vias', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/via-logs')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('data');
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer()).get('/api/v1/via-logs').expect(401);
    });
  });

  describe('POST /api/v1/via-logs (crear registro mensual)', () => {
    let createdViaLogId: string;

    it('admin puede crear un registro mensual de vias', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/via-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ field_id: testField.id, month: 11, year: 2026 })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      createdViaLogId = res.body.id;
    });

    it('coordinator puede crear un registro mensual de vias', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/via-logs')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ field_id: testField.id, month: 12, year: 2026 })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      // Limpiar inmediatamente
      await fieldRepo.query(`DELETE FROM via_monthly_logs WHERE id = $1`, [res.body.id]);
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/via-logs')
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ field_id: testField.id, month: 1, year: 2027 })
        .expect(403);
    });

    it('retorna 400 sin field_id', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/via-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: 1, year: 2026 })
        .expect(400);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/via-logs')
        .send({ field_id: testField.id, month: 2, year: 2027 })
        .expect(401);
    });

    it('admin puede ver el token de boveda de un registro', async () => {
      if (!createdViaLogId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/via-logs/${createdViaLogId}/token`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('vault_token');
    });

    it('[SEGURIDAD] usuario sin rol no puede obtener el token de boveda', async () => {
      if (!createdViaLogId) return;
      await request(app.getHttpServer())
        .get(`/api/v1/via-logs/${createdViaLogId}/token`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });

    it('admin puede eliminar un registro mensual de vias', async () => {
      if (!createdViaLogId) return;
      await request(app.getHttpServer())
        .delete(`/api/v1/via-logs/${createdViaLogId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // ─── VIA REPORTS ─────────────────────────────────────────────────────────
  describe('GET /api/v1/via-reports', () => {
    it('cualquier usuario autenticado puede listar informes de vias', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/via-reports')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('data');
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer()).get('/api/v1/via-reports').expect(401);
    });
  });

  describe('POST /api/v1/via-reports', () => {
    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/via-reports')
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ title: 'Informe Hacker', field_id: testField.id })
        .expect(403);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/via-reports')
        .send({ title: 'X' })
        .expect(401);
    });
  });

  // ─── VAULT (endpoints publicos sin autenticacion) ─────────────────────────
  describe('GET /api/v1/vault/:token (publico)', () => {
    it('accede sin autenticacion — token invalido devuelve 400 o 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/vault/token-invalido-qa-test');
      expect([400, 404]).toContain(res.status);
    });
  });

  describe('GET /api/v1/via-vault/:token (publico)', () => {
    it('accede sin autenticacion — token invalido devuelve 400 o 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/via-vault/token-invalido-qa-test');
      expect([400, 404]).toContain(res.status);
    });
  });
});
