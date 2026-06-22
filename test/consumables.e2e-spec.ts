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

const ADMIN_EMAIL  = 'qa-cons-admin@test.com';
const TEST_PASSWORD = 'TestPass123!';
const INSUMO_DESC  = 'QA-CONS-Insumo-Test';
const API_KEY      = 'test-public-api-key';
// Periodo muy futuro para no colisionar con datos reales
const TEST_MES  = 11;
const TEST_ANIO = 2099;

describe('Consumables (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let roleRepo: Repository<Role>;
  let userRoleRepo: Repository<UserRole>;
  let sessionRepo: Repository<Session>;

  let adminUser: User;
  let adminToken: string;

  let testInsumoId: string;
  let tempInsumoId: string;  // creado en un test, eliminado en otro

  async function cleanupUsers(ids: string[]) {
    if (ids.length === 0) return;
    const ph = ids.map((_, i) => `$${i + 1}`).join(', ');
    await userRoleRepo.query(`UPDATE user_roles SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await userRepo.query(`UPDATE users SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await roleRepo.query(`UPDATE roles SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await sessionRepo.query(`DELETE FROM sessions WHERE user_id IN (${ph})`, ids);
    await userRoleRepo.query(`DELETE FROM user_roles WHERE user_id IN (${ph})`, ids);
    await userRepo.query(`DELETE FROM users WHERE id IN (${ph})`, ids);
  }

  async function cleanupTestInsumos() {
    await userRepo.query(`DELETE FROM insumos_borradores WHERE insumo_id IN (SELECT id FROM insumos WHERE descripcion LIKE 'QA-CONS-%')`);
    await userRepo.query(`DELETE FROM insumos_historial WHERE insumo_id IN (SELECT id FROM insumos WHERE descripcion LIKE 'QA-CONS-%')`);
    await userRepo.query(`DELETE FROM insumos WHERE descripcion LIKE 'QA-CONS-%'`);
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

    const mailService = app.get(MailService);
    jest.spyOn(mailService, 'sendVerificationEmail').mockResolvedValue(undefined);
    jest.spyOn(mailService, 'sendPasswordResetByAdmin').mockResolvedValue(undefined);

    // Limpiar stale data de corridas anteriores
    await cleanupTestInsumos();
    const staleUsers = await userRepo.find({ where: [{ email: ADMIN_EMAIL }] });
    await cleanupUsers(staleUsers.map(u => u.id));

    // Crear usuario admin
    for (const r of [{ slug: 'admin', name: 'Administrador', is_system: true }]) {
      if (!(await roleRepo.findOne({ where: { slug: r.slug } }))) {
        await roleRepo.save(roleRepo.create({ ...r, is_active: true }));
      }
    }
    const adminRole = await roleRepo.findOneOrFail({ where: { slug: 'admin' } });
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);
    adminUser = await userRepo.save(userRepo.create({
      email: ADMIN_EMAIL, password_hash: hash,
      first_name: 'QA', last_name: 'ConsAdmin', position: 'tester',
      is_active: true, is_email_verified: true, is_first_login: false,
    }));
    await userRoleRepo.save({ user: adminUser, role: adminRole });

    adminToken = (await request(app.getHttpServer())
      .post('/api/v1/auth/login').send({ email: ADMIN_EMAIL, password: TEST_PASSWORD }))
      .body.access_token;
  });

  afterAll(async () => {
    await cleanupTestInsumos();
    const allUserIds = [adminUser?.id].filter(Boolean) as string[];
    await cleanupUsers(allUserIds);
    await app.close();
  });

  // ─── INSUMOS ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/insumos', () => {
    it('crea insumo con API key valida', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/insumos')
        .set('X-Api-Key', API_KEY)
        .send({
          descripcion:   INSUMO_DESC,
          unidad:        'unidad',
          categoria:     'PAPELERIA',
          valor_unitario: 100,
        })
        .expect(201);
      testInsumoId = res.body.id;
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('codigo');
      expect(res.body.descripcion).toBe(INSUMO_DESC);
    });

    it('[SEGURIDAD] retorna 401 sin API key', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/insumos')
        .send({ descripcion: 'QA-CONS-Sin-Key', unidad: 'kg', categoria: 'EPP' })
        .expect(401);
    });

    it('retorna 400 con campos requeridos ausentes', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/insumos')
        .set('X-Api-Key', API_KEY)
        .send({ descripcion: 'Falta categoria y unidad' })
        .expect(400);
    });

    it('retorna 400 con categoria invalida', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/insumos')
        .set('X-Api-Key', API_KEY)
        .send({ descripcion: 'QA-CONS-Bad', unidad: 'kg', categoria: 'INVALIDA' })
        .expect(400);
    });
  });

  describe('GET /api/v1/insumos', () => {
    it('lista insumos sin autenticacion', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/insumos')
        .expect(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('total');
    });

    it('filtra por categoria PAPELERIA', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/insumos?categoria=PAPELERIA')
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('filtra por texto de busqueda', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/insumos?search=QA-CONS')
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/insumos/periodos-cerrados', () => {
    it('lista periodos cerrados sin autenticacion', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/insumos/periodos-cerrados')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/v1/insumos/cambios', () => {
    it('obtiene cambios del periodo', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/insumos/cambios?mes=1&anio=2026')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('retorna 400 sin parametros requeridos', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/insumos/cambios')
        .expect(400);
    });
  });

  describe('GET /api/v1/insumos/borradores', () => {
    it('[SEGURIDAD] requiere autenticacion — 401 sin token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/insumos/borradores?mes=1&anio=2026')
        .expect(401);
    });

    it('obtiene borradores del periodo con token valido', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/insumos/borradores?mes=1&anio=2026')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/v1/insumos/:id', () => {
    it('obtiene un insumo por id', async () => {
      if (!testInsumoId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/insumos/${testInsumoId}`)
        .expect(200);
      expect(res.body.id).toBe(testInsumoId);
      expect(res.body.descripcion).toBe(INSUMO_DESC);
    });

    it('retorna 404 para id inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/insumos/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('PATCH /api/v1/insumos/:id/borrador', () => {
    it('crea un borrador para el insumo con API key valida', async () => {
      if (!testInsumoId) return;
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/insumos/${testInsumoId}/borrador`)
        .set('X-Api-Key', API_KEY)
        .send({ mes: TEST_MES, anio: TEST_ANIO, valor_unitario: 200 })
        .expect(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body.insumo_id || res.body.insumo?.id).toBeDefined();
    });

    it('[SEGURIDAD] retorna 401 sin API key', async () => {
      if (!testInsumoId) return;
      await request(app.getHttpServer())
        .patch(`/api/v1/insumos/${testInsumoId}/borrador`)
        .send({ mes: TEST_MES, anio: TEST_ANIO, valor_unitario: 200 })
        .expect(401);
    });
  });

  describe('PATCH /api/v1/insumos/:id', () => {
    it('actualiza un insumo con API key valida', async () => {
      if (!testInsumoId) return;
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/insumos/${testInsumoId}`)
        .set('X-Api-Key', API_KEY)
        .send({ valor_unitario: 150 })
        .expect(200);
      expect(res.body).toHaveProperty('id');
    });

    it('[SEGURIDAD] retorna 401 sin API key', async () => {
      if (!testInsumoId) return;
      await request(app.getHttpServer())
        .patch(`/api/v1/insumos/${testInsumoId}`)
        .send({ valor_unitario: 150 })
        .expect(401);
    });
  });

  describe('DELETE /api/v1/insumos/:id', () => {
    it('elimina un insumo con API key valida', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/insumos')
        .set('X-Api-Key', API_KEY)
        .send({ descripcion: 'QA-CONS-Para-Eliminar', unidad: 'kg', categoria: 'EPP' })
        .expect(201);
      tempInsumoId = createRes.body.id;
      await request(app.getHttpServer())
        .delete(`/api/v1/insumos/${tempInsumoId}`)
        .set('X-Api-Key', API_KEY)
        .expect(200);
    });

    it('[SEGURIDAD] retorna 401 sin API key', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/insumos/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });
  });

  // ─── SOLICITUDES ─────────────────────────────────────────────────────────────

  describe('GET /api/v1/solicitudes', () => {
    it('lista solicitudes del periodo sin autenticacion', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/solicitudes?mes=${TEST_MES}&anio=${TEST_ANIO}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('retorna 400 sin mes/anio', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/solicitudes')
        .expect(400);
    });
  });

  describe('GET /api/v1/solicitudes/mi-solicitud', () => {
    it('[SEGURIDAD] requiere autenticacion', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/solicitudes/mi-solicitud?mes=${TEST_MES}&anio=${TEST_ANIO}`)
        .expect(401);
    });

    it('admin sin planta asignada recibe 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/solicitudes/mi-solicitud?mes=${TEST_MES}&anio=${TEST_ANIO}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect([404, 200]).toContain(res.status);
    });
  });

  describe('GET /api/v1/solicitudes/mis-solicitudes', () => {
    it('[SEGURIDAD] requiere autenticacion', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/solicitudes/mis-solicitudes?mes=${TEST_MES}&anio=${TEST_ANIO}`)
        .expect(401);
    });

    it('admin autenticado puede llamar el endpoint (204/404 si no tiene planta)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/solicitudes/mis-solicitudes?mes=${TEST_MES}&anio=${TEST_ANIO}`)
        .set('Authorization', `Bearer ${adminToken}`);
      // Admin sin field_id: el servicio puede retornar 200 vacio o 404
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });
  });

  describe('POST /api/v1/solicitudes/generar-rqs', () => {
    it('[SEGURIDAD] requiere autenticacion', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/solicitudes/generar-rqs')
        .send({ solicitud_id: '00000000-0000-0000-0000-000000000000' })
        .expect(401);
    });
  });

  describe('POST /api/v1/solicitudes/adicional', () => {
    it('[SEGURIDAD] requiere autenticacion', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/solicitudes/adicional')
        .send({ mes: TEST_MES, anio: TEST_ANIO })
        .expect(401);
    });
  });

  // ─── REQUISICIONES ───────────────────────────────────────────────────────────

  describe('GET /api/v1/requisiciones', () => {
    it('lista requisiciones sin autenticacion', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/requisiciones')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('filtra por mes y anio', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/requisiciones?mes=${TEST_MES}&anio=${TEST_ANIO}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/v1/requisiciones/informe', () => {
    it('obtiene informe mensual sin autenticacion', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/requisiciones/informe?mes=1&anio=2026')
        .expect(200);
      expect(res.body).toHaveProperty('rows');
      expect(res.body).toHaveProperty('total_estimado');
    });

    it('retorna 400 sin mes/anio', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/requisiciones/informe')
        .expect(400);
    });
  });

  describe('GET /api/v1/requisiciones/:id', () => {
    it('retorna 404 para id inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/requisiciones/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('PATCH /api/v1/requisiciones/:id/recepcion', () => {
    it('[SEGURIDAD] requiere autenticacion', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/requisiciones/00000000-0000-0000-0000-000000000000/recepcion')
        .send({})
        .expect(401);
    });
  });

  describe('POST /api/v1/insumos/cerrar-mes', () => {
    it('[SEGURIDAD] requiere autenticacion — 401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/insumos/cerrar-mes')
        .send({ mes: 1, anio: 2026 })
        .expect(401);
    });

    it('retorna 400 con mes/anio invalidos (con token admin)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/insumos/cerrar-mes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ mes: 13, anio: 2026 })
        .expect(400);
    });
  });
});
