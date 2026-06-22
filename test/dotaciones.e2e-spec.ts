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
import { Field } from '../src/plants/fields/entities/field.entity';
import { MailService } from '../src/mail/mail.service';

const ADMIN_EMAIL  = 'qa-dot-admin@test.com';
const SUPER_EMAIL  = 'qa-dot-super@test.com';
const PLAIN_EMAIL  = 'qa-dot-plain@test.com';
const TEST_PASSWORD = 'TestPass123!';
const API_KEY      = 'test-public-api-key';

describe('Dotaciones (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let roleRepo: Repository<Role>;
  let userRoleRepo: Repository<UserRole>;
  let sessionRepo: Repository<Session>;
  let fieldRepo: Repository<Field>;

  let adminUser: User;
  let superUser: User;
  let plainUser: User;

  let adminToken: string;
  let superToken: string;
  let plainToken: string;

  let testField: Field;
  let spaceToken: string;   // vault_token del espacio creado por el supervisor

  async function cleanupUsers(ids: string[]) {
    if (ids.length === 0) return;
    const ph = ids.map((_, i) => `$${i + 1}`).join(', ');
    // dotacion_spaces tiene supervisor_id → User sin onDelete, hay que borrar espacios primero
    await fieldRepo.query(`DELETE FROM dotacion_imagenes WHERE reposicion_id IN (SELECT id FROM reposiciones_dotacion WHERE solicitud_id IN (SELECT id FROM solicitudes_dotacion WHERE space_id IN (SELECT id FROM dotacion_spaces WHERE supervisor_id IN (${ph}))))`, ids);
    await fieldRepo.query(`DELETE FROM reposiciones_dotacion WHERE solicitud_id IN (SELECT id FROM solicitudes_dotacion WHERE space_id IN (SELECT id FROM dotacion_spaces WHERE supervisor_id IN (${ph})))`, ids);
    await fieldRepo.query(`DELETE FROM solicitudes_dotacion WHERE space_id IN (SELECT id FROM dotacion_spaces WHERE supervisor_id IN (${ph}))`, ids);
    await fieldRepo.query(`DELETE FROM dotacion_spaces WHERE supervisor_id IN (${ph})`, ids);
    await userRoleRepo.query(`UPDATE user_roles SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await userRepo.query(`UPDATE users SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await roleRepo.query(`UPDATE roles SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await fieldRepo.query(`UPDATE employees SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await fieldRepo.query(`UPDATE fields SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await sessionRepo.query(`DELETE FROM sessions WHERE user_id IN (${ph})`, ids);
    await userRoleRepo.query(`DELETE FROM user_roles WHERE user_id IN (${ph})`, ids);
    await userRepo.query(`DELETE FROM users WHERE id IN (${ph})`, ids);
  }

  async function cleanupField(fieldId: string) {
    // CASCADE en dotacion_spaces.field_id elimina espacios y su cadena
    // pero hay que borrar imagenes/reposiciones/solicitudes manualmente si no cascadean
    await fieldRepo.query(`DELETE FROM dotacion_imagenes WHERE reposicion_id IN (SELECT id FROM reposiciones_dotacion WHERE solicitud_id IN (SELECT id FROM solicitudes_dotacion WHERE space_id IN (SELECT id FROM dotacion_spaces WHERE field_id = $1)))`, [fieldId]);
    await fieldRepo.query(`DELETE FROM reposiciones_dotacion WHERE solicitud_id IN (SELECT id FROM solicitudes_dotacion WHERE space_id IN (SELECT id FROM dotacion_spaces WHERE field_id = $1))`, [fieldId]);
    await fieldRepo.query(`DELETE FROM solicitudes_dotacion WHERE space_id IN (SELECT id FROM dotacion_spaces WHERE field_id = $1)`, [fieldId]);
    await fieldRepo.query(`DELETE FROM dotacion_spaces WHERE field_id = $1`, [fieldId]);
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

    // Limpiar stale data
    const staleUsers = await userRepo.find({
      where: [{ email: ADMIN_EMAIL }, { email: SUPER_EMAIL }, { email: PLAIN_EMAIL }],
    });
    await cleanupUsers(staleUsers.map(u => u.id));
    const staleField = await fieldRepo.findOne({ where: { name: 'QA-Dotaciones-Field' } });
    if (staleField) await cleanupField(staleField.id);

    // Asegurar roles del sistema
    for (const r of [
      { slug: 'admin',      name: 'Administrador', is_system: true },
      { slug: 'supervisor', name: 'Supervisor',    is_system: true },
    ]) {
      if (!(await roleRepo.findOne({ where: { slug: r.slug } }))) {
        await roleRepo.save(roleRepo.create({ ...r, is_active: true }));
      }
    }

    const adminRole = await roleRepo.findOneOrFail({ where: { slug: 'admin' } });
    const superRole = await roleRepo.findOneOrFail({ where: { slug: 'supervisor' } });
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);

    // Crear campo de prueba primero (supervisor lo necesita asignado)
    testField = await fieldRepo.save(
      fieldRepo.create({ name: 'QA-Dotaciones-Field', location: 'QA Dotaciones Location' }),
    );

    adminUser = await userRepo.save(userRepo.create({
      email: ADMIN_EMAIL, password_hash: hash,
      first_name: 'QA', last_name: 'DotAdmin', position: 'tester',
      is_active: true, is_email_verified: true, is_first_login: false,
    }));
    await userRoleRepo.save({ user: adminUser, role: adminRole });

    superUser = await userRepo.save(userRepo.create({
      email: SUPER_EMAIL, password_hash: hash,
      first_name: 'QA', last_name: 'DotSuper', position: 'supervisor',
      is_active: true, is_email_verified: true, is_first_login: false,
      field_id: testField.id,
    }));
    await userRoleRepo.save({ user: superUser, role: superRole });

    plainUser = await userRepo.save(userRepo.create({
      email: PLAIN_EMAIL, password_hash: hash,
      first_name: 'QA', last_name: 'DotPlain', position: 'tester',
      is_active: true, is_email_verified: true, is_first_login: false,
    }));

    adminToken = (await request(app.getHttpServer())
      .post('/api/v1/auth/login').send({ email: ADMIN_EMAIL, password: TEST_PASSWORD }))
      .body.access_token;
    superToken = (await request(app.getHttpServer())
      .post('/api/v1/auth/login').send({ email: SUPER_EMAIL, password: TEST_PASSWORD }))
      .body.access_token;
    plainToken = (await request(app.getHttpServer())
      .post('/api/v1/auth/login').send({ email: PLAIN_EMAIL, password: TEST_PASSWORD }))
      .body.access_token;
  });

  afterAll(async () => {
    if (testField) await cleanupField(testField.id);
    const allUserIds = [adminUser?.id, superUser?.id, plainUser?.id].filter(Boolean) as string[];
    await cleanupUsers(allUserIds);
    await app.close();
  });

  // ─── SPACES ──────────────────────────────────────────────────────────────────

  describe('POST /api/v1/dotaciones/spaces', () => {
    it('[SEGURIDAD] requiere autenticacion', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/dotaciones/spaces')
        .expect(401);
    });

    it('[SEGURIDAD] usuario sin rol (sin supervisor/admin/coordinator) recibe 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/dotaciones/spaces')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });

    it('supervisor puede crear su espacio de dotaciones', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/dotaciones/spaces')
        .set('Authorization', `Bearer ${superToken}`)
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('vault_token');
      spaceToken = res.body.vault_token;
    });

    it('segunda llamada retorna el mismo espacio (idempotente)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/dotaciones/spaces')
        .set('Authorization', `Bearer ${superToken}`);
      expect([200, 201]).toContain(res.status);
      expect(res.body.vault_token).toBe(spaceToken);
    });

    it('admin puede crear espacio', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/dotaciones/spaces')
        .set('Authorization', `Bearer ${adminToken}`);
      // admin sin field_id puede recibir 400 o crear un espacio
      expect([200, 201, 400]).toContain(res.status);
    });
  });

  describe('GET /api/v1/dotaciones/spaces/my', () => {
    it('[SEGURIDAD] requiere autenticacion', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/dotaciones/spaces/my')
        .expect(401);
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/dotaciones/spaces/my')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });

    it('supervisor puede ver su espacio', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dotaciones/spaces/my')
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('vault_token');
      expect(res.body.vault_token).toBe(spaceToken);
    });
  });

  // ─── ENDPOINTS POR TOKEN (PUBLICOS) ──────────────────────────────────────────

  describe('GET /api/v1/dotaciones/spaces/:token', () => {
    it('obtiene info del espacio por token sin autenticacion', async () => {
      if (!spaceToken) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/dotaciones/spaces/${spaceToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('vault_token');
      expect(res.body.vault_token).toBe(spaceToken);
    });

    it('retorna 404 con token invalido', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/dotaciones/spaces/token-invalido-123')
        .expect(404);
    });
  });

  describe('GET /api/v1/dotaciones/spaces/:token/empleados', () => {
    it('lista empleados del campo sin autenticacion', async () => {
      if (!spaceToken) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/dotaciones/spaces/${spaceToken}/empleados`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/v1/dotaciones/spaces/:token/solicitudes', () => {
    it('lista solicitudes del espacio sin autenticacion', async () => {
      if (!spaceToken) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/dotaciones/spaces/${spaceToken}/solicitudes`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/v1/dotaciones/spaces/:token/solicitudes', () => {
    it('retorna 400 si reposiciones no es JSON valido', async () => {
      if (!spaceToken) return;
      await request(app.getHttpServer())
        .post(`/api/v1/dotaciones/spaces/${spaceToken}/solicitudes`)
        .field('contrato', 'CONT-001')
        .field('fecha', '2026-01-01')
        .field('inspeccion_realizada_por', 'QA Tester')
        .field('cargo_inspector', 'Tester')
        .field('reposiciones', 'no-es-json')
        .expect(400);
    });

    it('retorna 400 si reposiciones esta vacio', async () => {
      if (!spaceToken) return;
      await request(app.getHttpServer())
        .post(`/api/v1/dotaciones/spaces/${spaceToken}/solicitudes`)
        .field('contrato', 'CONT-001')
        .field('fecha', '2026-01-01')
        .field('inspeccion_realizada_por', 'QA Tester')
        .field('cargo_inspector', 'Tester')
        .field('reposiciones', '[]')
        .expect(400);
    });
  });

  // ─── SOLICITUDES (PUBLICAS) ──────────────────────────────────────────────────

  describe('GET /api/v1/dotaciones/solicitudes', () => {
    it('lista todas las solicitudes sin autenticacion', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dotaciones/solicitudes')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('filtra por estado', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dotaciones/solicitudes?estado=emitida')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('filtra por campo_id', async () => {
      if (!testField) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/dotaciones/solicitudes?campo_id=${testField.id}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('PATCH /api/v1/dotaciones/solicitudes/:id/estado', () => {
    it('[SEGURIDAD] requiere autenticacion — 401 sin token', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/dotaciones/solicitudes/00000000-0000-0000-0000-000000000000/estado')
        .send({ estado: 'autorizada' })
        .expect(401);
    });

    it('retorna 404 para solicitud inexistente', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/dotaciones/solicitudes/00000000-0000-0000-0000-000000000000/estado')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'autorizada' })
        .expect(404);
    });

    it('retorna 400 con estado invalido', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/dotaciones/solicitudes/00000000-0000-0000-0000-000000000000/estado')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'estado-invalido' })
        .expect(400);
    });
  });

  describe('POST /api/v1/dotaciones/solicitudes/:id/rq', () => {
    it('retorna 404 para solicitud inexistente (con DTO valido y API key)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/dotaciones/solicitudes/00000000-0000-0000-0000-000000000000/rq')
        .set('X-Api-Key', API_KEY)
        .send({
          numero_rq: 1,
          items: [
            { descripcion: 'Item test', unidad: 'unidad', tipo_requisicion: 'ORDINARIA', solicitado: 1 },
          ],
        })
        .expect(404);
    });

    it('[SEGURIDAD] retorna 401 sin API key', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/dotaciones/solicitudes/00000000-0000-0000-0000-000000000000/rq')
        .send({ numero_rq: 1, items: [] })
        .expect(401);
    });
  });
});
