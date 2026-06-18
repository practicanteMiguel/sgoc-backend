import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');
import * as bcrypt from 'bcrypt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';
import { Session } from '../src/users/entities/session.entity';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let sessionRepo: Repository<Session>;
  let testUser: User;
  let accessToken: string;
  let refreshToken: string;

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

    userRepo = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    sessionRepo = moduleFixture.get<Repository<Session>>(getRepositoryToken(Session));

    // Limpiar si quedaron datos de una corrida anterior (por crash o --forceExit)
    const existing = await userRepo.findOne({ where: { email: 'qa-test@test.com' } });
    if (existing) {
      await sessionRepo.delete({ user: { id: existing.id } });
      await userRepo.delete({ id: existing.id });
    }

    const hash = await bcrypt.hash('TestPass123!', 10);
    testUser = userRepo.create({
      email: 'qa-test@test.com',
      password_hash: hash,
      first_name: 'QA',
      last_name: 'Test',
      position: 'tester',
      is_active: true,
      is_email_verified: true,
      is_first_login: false,
    });
    await userRepo.save(testUser);
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await sessionRepo.delete({ user: { id: testUser.id } });
    await userRepo.delete({ id: testUser.id });
    await app.close();
  });

  // ─── LOGIN ────────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/login', () => {
    it('login exitoso con credenciales validas', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'qa-test@test.com', password: 'TestPass123!' })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
      expect(res.body.user.email).toBe('qa-test@test.com');
      expect(res.body.user).not.toHaveProperty('password_hash');

      accessToken = res.body.access_token;
      refreshToken = res.body.refresh_token;
    });

    it('rechaza password incorrecto con 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'qa-test@test.com', password: 'WrongPassword!' })
        .expect(401);
    });

    it('rechaza email inexistente con 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'noexiste@test.com', password: 'TestPass123!' })
        .expect(401);
    });

    it('rechaza payload vacio con 401', async () => {
      // AuthGuard('local') corre ANTES que el ValidationPipe en NestJS,
      // por eso passport falla con 401 antes de que el pipe valide el DTO
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(401);
    });

    it('rechaza email con formato invalido con 401', async () => {
      // AuthGuard('local') intenta buscar el usuario y falla antes que el pipe
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'no-es-un-email', password: 'TestPass123!' })
        .expect(401);
    });

    it('[SEGURIDAD] no expone password_hash en la respuesta', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'qa-test@test.com', password: 'TestPass123!' })
        .expect(200);

      const body = JSON.stringify(res.body);
      expect(body).not.toContain('password_hash');
      expect(body).not.toContain('password');
    });

    it('[SEGURIDAD] rechaza usuario inactivo', async () => {
      await userRepo.update(testUser.id, { is_active: false });

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'qa-test@test.com', password: 'TestPass123!' })
        .expect(401);

      await userRepo.update(testUser.id, { is_active: true });
    });

    it('[SEGURIDAD] rechaza usuario sin email verificado', async () => {
      await userRepo.update(testUser.id, { is_email_verified: false });

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'qa-test@test.com', password: 'TestPass123!' })
        .expect(401);

      await userRepo.update(testUser.id, { is_email_verified: true });
    });
  });

  // ─── RUTAS PROTEGIDAS ─────────────────────────────────────────────────────
  describe('GET /api/v1/auth/me (ruta protegida)', () => {
    it('retorna usuario autenticado con token valido', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe('qa-test@test.com');
    });

    it('[SEGURIDAD] rechaza peticion sin token con 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('[SEGURIDAD] rechaza token manipulado con 401', async () => {
      const manipulatedToken = accessToken.slice(0, -10) + 'MANIPULADO';
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${manipulatedToken}`)
        .expect(401);
    });

    it('[SEGURIDAD] rechaza token con firma falsa', async () => {
      const parts = accessToken.split('.');
      // Cambiar el payload (parte del medio) para intentar elevar privilegios
      const fakePayload = Buffer.from(
        JSON.stringify({ sub: testUser.id, email: testUser.email, roles: ['admin'] }),
      ).toString('base64url');
      const fakeToken = `${parts[0]}.${fakePayload}.${parts[2]}`;

      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(401);
    });

    it('[SEGURIDAD] rechaza token con formato Bearer incorrecto', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Token ${accessToken}`)
        .expect(401);
    });
  });

  // ─── REFRESH TOKEN ─────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/refresh', () => {
    it('genera nuevo access_token con refresh_token valido', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      // El token es un JWT valido (3 partes separadas por punto)
      expect(res.body.access_token.split('.')).toHaveLength(3);
    });

    it('[SEGURIDAD] rechaza refresh_token invalido con 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: 'token.falso.invalido' })
        .expect(401);
    });

    it('[SEGURIDAD] rechaza refresh_token vacio con 400 o 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: '' });

      // El DTO puede rechazar con 400 (validacion) o el servicio con 401
      expect([400, 401]).toContain(res.status);
    });
  });

  // ─── LOGOUT ───────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/logout', () => {
    it('cierra sesion y revoca el refresh_token', async () => {
      // Login fresco para este test
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'qa-test@test.com', password: 'TestPass123!' })
        .expect(200);

      const { access_token, refresh_token } = loginRes.body;

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${access_token}`)
        .send({ refresh_token })
        .expect(200);

      // Intentar usar el refresh_token despues del logout debe fallar
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token })
        .expect(401);
    });

    it('[SEGURIDAD] rechaza logout sin token con 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refresh_token: refreshToken })
        .expect(401);
    });
  });

  // ─── SQL INJECTION / INYECCION ────────────────────────────────────────────
  describe('[SEGURIDAD] Proteccion contra inyeccion', () => {
    it('rechaza SQL injection en email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: "admin@test.com' OR '1'='1", password: 'cualquiera' });

      expect([400, 401]).toContain(res.status);
    });

    it('rechaza campos extra no declarados en DTO (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'qa-test@test.com',
          password: 'TestPass123!',
          is_admin: true,
          role: 'admin',
        })
        .expect(400);
    });
  });
});
