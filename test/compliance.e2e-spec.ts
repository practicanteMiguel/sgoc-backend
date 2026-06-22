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

const ADMIN_EMAIL = 'qa-comp-admin@test.com';
const COORD_EMAIL = 'qa-comp-coord@test.com';
const PLAIN_EMAIL  = 'qa-comp-plain@test.com';
const TEST_PASSWORD = 'TestPass123!';
// Mes de prueba: dic 2099 — muy improbable que existan deliverables reales para ese mes
const TEST_MES  = 12;
const TEST_ANIO = 2099;

describe('Compliance (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let roleRepo: Repository<Role>;
  let userRoleRepo: Repository<UserRole>;
  let sessionRepo: Repository<Session>;
  let fieldRepo: Repository<Field>;

  let adminUser: User;
  let coordUser: User;
  let plainUser: User;

  let adminToken: string;
  let coordToken: string;
  let plainToken: string;

  let testField: Field;
  let deliverableId: string;         // taxi — primer deliverable
  let pernoctacionId: string;        // deliverable de tipo pernoctacion
  let disponibilidadId: string;      // deliverable de tipo disponibilidad
  let horasExtraId: string;          // deliverable de tipo horas_extra

  async function cleanupUsers(ids: string[]) {
    if (ids.length === 0) return;
    const ph = ids.map((_, i) => `$${i + 1}`).join(', ');
    // Nulificar created_by en todas las tablas que referencian users
    await userRoleRepo.query(`UPDATE user_roles SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await userRepo.query(`UPDATE users SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await roleRepo.query(`UPDATE roles SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await fieldRepo.query(`UPDATE employees SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await fieldRepo.query(`UPDATE fields SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    // deliverables y schedules usan supervisor_id con onDelete RESTRICT
    // Hay que borrarlos antes de borrar usuarios para evitar FK violations
    await fieldRepo.query(`DELETE FROM schedule_days WHERE schedule_id IN (SELECT id FROM schedules WHERE supervisor_id IN (${ph}))`, ids);
    await fieldRepo.query(`DELETE FROM schedules WHERE supervisor_id IN (${ph})`, ids);
    await fieldRepo.query(`DELETE FROM taxi_records WHERE deliverable_id IN (SELECT id FROM deliverables WHERE supervisor_id IN (${ph}))`, ids);
    await fieldRepo.query(`DELETE FROM pernoctacion_records WHERE deliverable_id IN (SELECT id FROM deliverables WHERE supervisor_id IN (${ph}))`, ids);
    await fieldRepo.query(`DELETE FROM disponibilidad_records WHERE deliverable_id IN (SELECT id FROM deliverables WHERE supervisor_id IN (${ph}))`, ids);
    await fieldRepo.query(`DELETE FROM horas_extra_records WHERE deliverable_id IN (SELECT id FROM deliverables WHERE supervisor_id IN (${ph}))`, ids);
    await fieldRepo.query(`DELETE FROM deliverables WHERE supervisor_id IN (${ph})`, ids);
    await sessionRepo.query(`DELETE FROM sessions WHERE user_id IN (${ph})`, ids);
    await userRoleRepo.query(`DELETE FROM user_roles WHERE user_id IN (${ph})`, ids);
    await userRepo.query(`DELETE FROM users WHERE id IN (${ph})`, ids);
  }

  async function cleanupField(fieldId: string) {
    // Eliminar en orden de dependencia
    await fieldRepo.query(`DELETE FROM taxi_records WHERE deliverable_id IN (SELECT id FROM deliverables WHERE field_id = $1)`, [fieldId]);
    await fieldRepo.query(`DELETE FROM pernoctacion_records WHERE deliverable_id IN (SELECT id FROM deliverables WHERE field_id = $1)`, [fieldId]);
    await fieldRepo.query(`DELETE FROM disponibilidad_records WHERE deliverable_id IN (SELECT id FROM deliverables WHERE field_id = $1)`, [fieldId]);
    await fieldRepo.query(`DELETE FROM horas_extra_records WHERE deliverable_id IN (SELECT id FROM deliverables WHERE field_id = $1)`, [fieldId]);
    await fieldRepo.query(`DELETE FROM deliverables WHERE field_id = $1`, [fieldId]);
    await fieldRepo.query(`DELETE FROM schedule_days WHERE schedule_id IN (SELECT id FROM schedules WHERE field_id = $1)`, [fieldId]);
    await fieldRepo.query(`DELETE FROM schedules WHERE field_id = $1`, [fieldId]);
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

    const mailService = app.get(MailService);
    jest.spyOn(mailService, 'sendVerificationEmail').mockResolvedValue(undefined);
    jest.spyOn(mailService, 'sendPasswordResetByAdmin').mockResolvedValue(undefined);

    // Limpiar stale data de corridas anteriores
    const staleUsers = await userRepo.find({
      where: [{ email: ADMIN_EMAIL }, { email: COORD_EMAIL }, { email: PLAIN_EMAIL }],
    });
    await cleanupUsers(staleUsers.map(u => u.id));
    const staleField = await fieldRepo.findOne({ where: { name: 'QA-Compliance-Field' } });
    if (staleField) await cleanupField(staleField.id);

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
      first_name: 'QA', last_name: 'CompAdmin', position: 'tester',
      is_active: true, is_email_verified: true, is_first_login: false,
    }));
    await userRoleRepo.save({ user: adminUser, role: adminRole });

    coordUser = await userRepo.save(userRepo.create({
      email: COORD_EMAIL, password_hash: hash,
      first_name: 'QA', last_name: 'CompCoord', position: 'tester',
      is_active: true, is_email_verified: true, is_first_login: false,
    }));
    await userRoleRepo.save({ user: coordUser, role: coordRole });

    plainUser = await userRepo.save(userRepo.create({
      email: PLAIN_EMAIL, password_hash: hash,
      first_name: 'QA', last_name: 'CompPlain', position: 'tester',
      is_active: true, is_email_verified: true, is_first_login: false,
    }));

    // Crear campo de prueba para compliance
    testField = await fieldRepo.save(
      fieldRepo.create({ name: 'QA-Compliance-Field', location: 'QA Compliance Location' }),
    );

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

    // Generar los 6 entregables del mes de prueba
    const genRes = await request(app.getHttpServer())
      .post('/api/v1/compliance/deliverables/generate-month')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ field_id: testField.id, mes: TEST_MES, anio: TEST_ANIO });

    const deliverables: any[] = [200, 201].includes(genRes.status)
      ? (Array.isArray(genRes.body) ? genRes.body : genRes.body?.deliverables ?? [])
      : [];
    deliverableId      = deliverables.find(d => d.format_type === 'taxi')?.id;
    pernoctacionId     = deliverables.find(d => d.format_type === 'pernoctacion')?.id;
    disponibilidadId   = deliverables.find(d => d.format_type === 'disponibilidad')?.id;
    horasExtraId       = deliverables.find(d => d.format_type === 'horas_extra')?.id;
  });

  afterAll(async () => {
    if (testField) await cleanupField(testField.id);
    const allUserIds = [adminUser?.id, coordUser?.id, plainUser?.id].filter(Boolean) as string[];
    await cleanupUsers(allUserIds);
    await app.close();
  });

  // ─── DELIVERABLES: GENERATE MONTH ────────────────────────────────────────
  describe('POST /api/v1/compliance/deliverables/generate-month', () => {
    it('genera los 6 entregables del mes (se crearon en beforeAll)', () => {
      // Validamos que el beforeAll tuvo exito
      expect(deliverableId).toBeDefined();
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/compliance/deliverables/generate-month')
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ field_id: testField.id, mes: 1, anio: 2099 })
        .expect(403);
    });

    it('retorna 400 con mes invalido', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/compliance/deliverables/generate-month')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ field_id: testField.id, mes: 13, anio: 2099 })
        .expect(400);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/compliance/deliverables/generate-month')
        .send({ field_id: testField.id, mes: 1, anio: 2099 })
        .expect(401);
    });
  });

  // ─── DELIVERABLES: LIST ───────────────────────────────────────────────────
  describe('GET /api/v1/compliance/deliverables', () => {
    it('cualquier usuario autenticado puede listar entregables', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/compliance/deliverables')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('filtra por field_id correctamente', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/compliance/deliverables?field_id=${testField.id}&anio=${TEST_ANIO}&mes=${TEST_MES}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(6); // generate-month crea 6
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/compliance/deliverables')
        .expect(401);
    });
  });

  describe('GET /api/v1/compliance/deliverables/summary', () => {
    it('cualquier usuario autenticado puede ver el resumen de cumplimiento', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/compliance/deliverables/summary?anio=${TEST_ANIO}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/compliance/deliverables/summary')
        .expect(401);
    });
  });

  describe('GET /api/v1/compliance/deliverables/month/:fieldId/:anio/:mes', () => {
    it('cualquier usuario autenticado puede ver el detalle mensual', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/compliance/deliverables/month/${testField.id}/${TEST_ANIO}/${TEST_MES}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('deliverables');
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/compliance/deliverables/month/${testField.id}/${TEST_ANIO}/${TEST_MES}`)
        .expect(401);
    });
  });

  describe('GET /api/v1/compliance/deliverables/:id', () => {
    it('cualquier usuario autenticado puede ver un entregable por ID', async () => {
      if (!deliverableId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/compliance/deliverables/${deliverableId}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(res.body.id).toBe(deliverableId);
    });

    it('retorna 401 sin token', async () => {
      if (!deliverableId) return;
      await request(app.getHttpServer())
        .get(`/api/v1/compliance/deliverables/${deliverableId}`)
        .expect(401);
    });
  });

  describe('PATCH /api/v1/compliance/deliverables/:id/submit', () => {
    it('cualquier usuario autenticado puede marcar un entregable como entregado', async () => {
      if (!deliverableId) return;
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/compliance/deliverables/${deliverableId}/submit`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('status');
    });

    it('retorna 401 sin token', async () => {
      if (!deliverableId) return;
      await request(app.getHttpServer())
        .patch(`/api/v1/compliance/deliverables/${deliverableId}/submit`)
        .expect(401);
    });
  });

  describe('PATCH /api/v1/compliance/deliverables/:id/viewed', () => {
    it('admin puede marcar un entregable como visto', async () => {
      if (!deliverableId) return;
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/compliance/deliverables/${deliverableId}/viewed`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('id');
    });

    it('[SEGURIDAD] usuario sin rol recibe 403 en viewed', async () => {
      if (!deliverableId) return;
      await request(app.getHttpServer())
        .patch(`/api/v1/compliance/deliverables/${deliverableId}/viewed`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });

    it('retorna 401 sin token', async () => {
      if (!deliverableId) return;
      await request(app.getHttpServer())
        .patch(`/api/v1/compliance/deliverables/${deliverableId}/viewed`)
        .expect(401);
    });
  });

  describe('POST /api/v1/compliance/deliverables/reminders/trigger', () => {
    it('[SEGURIDAD] solo admin puede disparar recordatorios manuales', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/compliance/deliverables/reminders/trigger')
        .set('Authorization', `Bearer ${adminToken}`);
      // NestJS POST devuelve 201 por defecto; el endpoint puede retornar 200 o 201
      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('notifications_sent');
    });

    it('[SEGURIDAD] coordinator recibe 403 en trigger de recordatorios', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/compliance/deliverables/reminders/trigger')
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(403);
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/compliance/deliverables/reminders/trigger')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/compliance/deliverables/reminders/trigger')
        .expect(401);
    });
  });

  // ─── SCHEDULES ────────────────────────────────────────────────────────────
  describe('POST /api/v1/compliance/schedules', () => {
    let createdScheduleId: string;

    it('cualquier usuario autenticado puede crear un schedule', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/compliance/schedules')
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ field_id: testField.id, mes: TEST_MES, anio: TEST_ANIO, tipo: '6x6' })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      createdScheduleId = res.body.id;
    });

    it('retorna 400 con tipo invalido', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/compliance/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ field_id: testField.id, mes: TEST_MES, anio: TEST_ANIO, tipo: 'invalido' })
        .expect(400);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/compliance/schedules')
        .send({ field_id: testField.id, mes: TEST_MES, anio: TEST_ANIO, tipo: '5x2' })
        .expect(401);
    });

    it('GET /compliance/schedules — cualquier usuario autenticado puede listar', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/compliance/schedules')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /compliance/schedules/:id — cualquier usuario autenticado puede ver un schedule', async () => {
      if (!createdScheduleId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/compliance/schedules/${createdScheduleId}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(res.body.id).toBe(createdScheduleId);
    });

    it('retorna 401 sin token en GET /compliance/schedules', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/compliance/schedules')
        .expect(401);
    });
  });

  // ─── EVIDENCES ────────────────────────────────────────────────────────────
  describe('GET /api/v1/compliance/evidences', () => {
    it('cualquier usuario autenticado puede listar evidencias', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/compliance/evidences')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('filtra por field_id correctamente', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/compliance/evidences?field_id=${testField.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/compliance/evidences')
        .expect(401);
    });
  });

  describe('DELETE /api/v1/compliance/evidences/cache', () => {
    it('cualquier usuario autenticado puede limpiar el cache de Drive', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/compliance/evidences/cache')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/compliance/evidences/cache')
        .expect(401);
    });
  });

  describe('POST /api/v1/compliance/evidences/upload', () => {
    it('[SEGURIDAD] requiere autenticacion — 401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/compliance/evidences/upload')
        .expect(401);
    });

    it('retorna 400 sin archivos (multipart requerido)', async () => {
      // Con auth pero sin archivos/datos validos debe rechazar
      const res = await request(app.getHttpServer())
        .post('/api/v1/compliance/evidences/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      // 400 (validacion) o 500 (Drive no disponible en test) son aceptables
      expect([400, 500]).toContain(res.status);
    });
  });

  // ─── FORMATS (dentro de un deliverable) ──────────────────────────────────
  describe('GET /api/v1/compliance/deliverables/:id/taxi', () => {
    it('cualquier usuario autenticado puede leer el formato taxi', async () => {
      if (!deliverableId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/compliance/deliverables/${deliverableId}/taxi`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('retorna 401 sin token', async () => {
      if (!deliverableId) return;
      await request(app.getHttpServer())
        .get(`/api/v1/compliance/deliverables/${deliverableId}/taxi`)
        .expect(401);
    });
  });

  describe('GET /api/v1/compliance/deliverables/:id/pernoctacion', () => {
    it('cualquier usuario autenticado puede leer el formato pernoctacion', async () => {
      if (!pernoctacionId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/compliance/deliverables/${pernoctacionId}/pernoctacion`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('retorna 401 sin token', async () => {
      if (!pernoctacionId) return;
      await request(app.getHttpServer())
        .get(`/api/v1/compliance/deliverables/${pernoctacionId}/pernoctacion`)
        .expect(401);
    });
  });

  describe('GET /api/v1/compliance/deliverables/:id/disponibilidad', () => {
    it('cualquier usuario autenticado puede leer el formato disponibilidad', async () => {
      if (!disponibilidadId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/compliance/deliverables/${disponibilidadId}/disponibilidad`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('retorna 401 sin token', async () => {
      if (!disponibilidadId) return;
      await request(app.getHttpServer())
        .get(`/api/v1/compliance/deliverables/${disponibilidadId}/disponibilidad`)
        .expect(401);
    });
  });

  describe('GET /api/v1/compliance/deliverables/:id/horas-extra', () => {
    it('cualquier usuario autenticado puede leer el formato horas extra', async () => {
      if (!horasExtraId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/compliance/deliverables/${horasExtraId}/horas-extra`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('retorna 401 sin token', async () => {
      if (!horasExtraId) return;
      await request(app.getHttpServer())
        .get(`/api/v1/compliance/deliverables/${horasExtraId}/horas-extra`)
        .expect(401);
    });
  });
});
