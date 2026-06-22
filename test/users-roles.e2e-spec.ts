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

const ADMIN_EMAIL    = 'qa-admin@test.com';
const COORD_EMAIL    = 'qa-coord@test.com';
const PLAIN_EMAIL    = 'qa-plain@test.com';
const TEST_PASSWORD  = 'TestPass123!';

describe('Users & Roles (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let roleRepo: Repository<Role>;
  let userRoleRepo: Repository<UserRole>;
  let sessionRepo: Repository<Session>;

  let adminUser: User;
  let coordUser: User;
  let plainUser: User;

  let adminToken: string;
  let coordToken: string;
  let plainToken: string;

  let adminRoleId: string;

  // IDs de usuarios creados durante los tests para limpiar en afterAll
  const createdUserIds: string[] = [];
  // IDs de roles creados durante los tests para limpiar en afterAll
  const createdRoleIds: string[] = [];

  // Nulifica todos los FKs created_by que apuntan a una lista de user IDs,
  // luego borra sessions, user_roles y los usuarios mismos.
  async function cleanupUsers(ids: string[]) {
    if (ids.length === 0) return;
    const ph = ids.map((_, i) => `$${i + 1}`).join(', ');
    // Nulificar created_by en todas las tablas que referencian users
    await userRoleRepo.query(`UPDATE user_roles SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await userRepo.query(`UPDATE users SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await roleRepo.query(`UPDATE roles SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    // Borrar dependientes y luego los usuarios
    await sessionRepo.query(`DELETE FROM sessions WHERE user_id IN (${ph})`, ids);
    await userRoleRepo.query(`DELETE FROM user_roles WHERE user_id IN (${ph})`, ids);
    await userRepo.query(`DELETE FROM users WHERE id IN (${ph})`, ids);
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

    userRepo    = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    roleRepo    = moduleFixture.get<Repository<Role>>(getRepositoryToken(Role));
    userRoleRepo = moduleFixture.get<Repository<UserRole>>(getRepositoryToken(UserRole));
    sessionRepo = moduleFixture.get<Repository<Session>>(getRepositoryToken(Session));

    // Silenciar el mail service — evita llamadas reales a SendGrid
    const mailService = app.get(MailService);
    jest.spyOn(mailService, 'sendVerificationEmail').mockResolvedValue(undefined);
    jest.spyOn(mailService, 'sendPasswordResetByAdmin').mockResolvedValue(undefined);

    // Limpiar usuarios y roles de prueba de corridas anteriores
    const staleUsers = await userRepo.find({
      where: [
        { email: ADMIN_EMAIL },
        { email: COORD_EMAIL },
        { email: PLAIN_EMAIL },
        { email: 'qa-nuevo@test.com' },
      ],
    });
    await cleanupUsers(staleUsers.map(u => u.id));

    // Limpiar roles creados en corridas anteriores (slugs con prefijo qa-)
    const staleRoles = await roleRepo
      .createQueryBuilder('r')
      .where("r.slug LIKE 'qa-%'")
      .getMany();
    for (const r of staleRoles) {
      await roleRepo.delete({ id: r.id });
    }

    // Asegurar que los roles del sistema existen (pueden no estar si la seed no corrio)
    for (const r of [
      { slug: 'admin',       name: 'Administrador', is_system: true },
      { slug: 'coordinator', name: 'Coordinador',    is_system: true },
    ]) {
      if (!(await roleRepo.findOne({ where: { slug: r.slug } }))) {
        await roleRepo.save(roleRepo.create({ ...r, is_active: true }));
      }
    }

    const adminRole = await roleRepo.findOneOrFail({ where: { slug: 'admin' } });
    const coordRole = await roleRepo.findOneOrFail({ where: { slug: 'coordinator' } });
    adminRoleId = adminRole.id;

    const hash = await bcrypt.hash(TEST_PASSWORD, 10);

    // Crear los 3 usuarios de prueba sin created_by (nullable, evita FK al limpiar)
    adminUser = await userRepo.save(userRepo.create({
      email: ADMIN_EMAIL, password_hash: hash,
      first_name: 'QA', last_name: 'Admin', position: 'tester',
      is_active: true, is_email_verified: true, is_first_login: false,
    }));
    await userRoleRepo.save({ user: adminUser, role: adminRole });

    coordUser = await userRepo.save(userRepo.create({
      email: COORD_EMAIL, password_hash: hash,
      first_name: 'QA', last_name: 'Coord', position: 'tester',
      is_active: true, is_email_verified: true, is_first_login: false,
    }));
    await userRoleRepo.save({ user: coordUser, role: coordRole });

    plainUser = await userRepo.save(userRepo.create({
      email: PLAIN_EMAIL, password_hash: hash,
      first_name: 'QA', last_name: 'Plain', position: 'tester',
      is_active: true, is_email_verified: true, is_first_login: false,
    }));

    // Login de los tres para obtener tokens
    const loginAdmin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: TEST_PASSWORD });
    adminToken = loginAdmin.body.access_token;

    const loginCoord = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: COORD_EMAIL, password: TEST_PASSWORD });
    coordToken = loginCoord.body.access_token;

    const loginPlain = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: PLAIN_EMAIL, password: TEST_PASSWORD });
    plainToken = loginPlain.body.access_token;
  });

  afterAll(async () => {
    const allIds = [
      ...createdUserIds,
      adminUser?.id,
      coordUser?.id,
      plainUser?.id,
    ].filter(Boolean) as string[];

    await cleanupUsers(allIds);

    for (const id of createdRoleIds) {
      await roleRepo.delete({ id });
    }

    await app.close();
  });

  // ─── USERS: GET /users ────────────────────────────────────────────────────
  describe('GET /api/v1/users (listar usuarios)', () => {
    it('retorna lista paginada para usuario autenticado', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('limit');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .expect(401);
    });

    it('[SEGURIDAD] no expone password_hash en la lista', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = JSON.stringify(res.body);
      expect(body).not.toContain('password_hash');
    });

    it('usuario sin rol puede listar (sin restriccion de rol en GET /users)', async () => {
      // Documentado: GET /users no tiene @Roles() — cualquier auth user accede
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
    });
  });

  // ─── USERS: GET /users/profile ────────────────────────────────────────────
  describe('GET /api/v1/users/profile (perfil propio)', () => {
    it('retorna el perfil del usuario autenticado', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.email).toBe(ADMIN_EMAIL);
      expect(res.body).toHaveProperty('user_roles');
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .expect(401);
    });
  });

  // ─── USERS: GET /users/:id ────────────────────────────────────────────────
  describe('GET /api/v1/users/:id (buscar por ID)', () => {
    it('admin puede obtener cualquier usuario por ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${plainUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(plainUser.id);
    });

    it('coordinator puede obtener usuario por ID', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/users/${plainUser.id}`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });

    it('retorna 404 para UUID inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/users/${plainUser.id}`)
        .expect(401);
    });
  });

  // ─── USERS: POST /users ───────────────────────────────────────────────────
  describe('POST /api/v1/users (crear usuario)', () => {
    it('admin puede crear un usuario (mail mockeado)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email:     'qa-nuevo@test.com',
          first_name: 'Nuevo',
          last_name:  'Usuario',
          position:   'tester',
          role_slug:  'coordinator',
        })
        .expect(201);

      expect(res.body.email).toBe('qa-nuevo@test.com');
      expect(JSON.stringify(res.body)).not.toContain('password_hash');
      createdUserIds.push(res.body.id);
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${plainToken}`)
        .send({
          email: 'no-deberia@test.com',
          first_name: 'X', last_name: 'X', position: 'x', role_slug: 'coordinator',
        })
        .expect(403);
    });

    it('retorna 409 si el email ya existe', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: PLAIN_EMAIL, // ya existe
          first_name: 'Dup', last_name: 'Dup', position: 'dup', role_slug: 'coordinator',
        })
        .expect(409);
    });

    it('retorna 400 con role_slug invalido', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'rolemal@test.com',
          first_name: 'X', last_name: 'X', position: 'x', role_slug: 'superusuario',
        })
        .expect(400);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({ email: 'sin-token@test.com', first_name: 'X', last_name: 'X', position: 'x', role_slug: 'coordinator' })
        .expect(401);
    });
  });

  // ─── USERS: PATCH /users/:id ──────────────────────────────────────────────
  describe('PATCH /api/v1/users/:id (actualizar usuario)', () => {
    it('admin puede actualizar un usuario', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${plainUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ position: 'tester-actualizado' })
        .expect(200);

      expect(res.body.position).toBe('tester-actualizado');
    });

    it('[SEGURIDAD] usuario sin rol no puede actualizar a otro usuario — requiere admin', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ position: 'hacked' })
        .expect(403);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${plainUser.id}`)
        .send({ position: 'algo' })
        .expect(401);
    });
  });

  // ─── USERS: PATCH /users/me/change-password ───────────────────────────────
  describe('PATCH /api/v1/users/me/change-password', () => {
    it('cambia la contrasena correctamente con current_password valida', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me/change-password')
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ current_password: TEST_PASSWORD, new_password: 'NuevaClave123!' })
        .expect(200);

      // Restaurar password original
      const hash = await bcrypt.hash(TEST_PASSWORD, 10);
      await userRepo.update(plainUser.id, { password_hash: hash, is_first_login: false });
    });

    it('retorna 400 con current_password incorrecta', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me/change-password')
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ current_password: 'MalaClave!', new_password: 'NuevaClave123!' })
        .expect(400);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me/change-password')
        .send({ current_password: TEST_PASSWORD, new_password: 'Algo123!' })
        .expect(401);
    });
  });

  // ─── USERS: PATCH /users/:id/reset-password ──────────────────────────────
  describe('PATCH /api/v1/users/:id/reset-password (reset por admin)', () => {
    it('admin puede resetear la contrasena de otro usuario (mail mockeado)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${plainUser.id}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ new_password: 'ResetPass123!' })
        .expect(200);

      // Restaurar password original
      const hash = await bcrypt.hash(TEST_PASSWORD, 10);
      await userRepo.update(plainUser.id, { password_hash: hash, is_first_login: false });
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${adminUser.id}/reset-password`)
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ new_password: 'Intento123!' })
        .expect(403);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${plainUser.id}/reset-password`)
        .send({ new_password: 'Algo123!' })
        .expect(401);
    });
  });

  // ─── USERS: DELETE /users/:id ─────────────────────────────────────────────
  describe('DELETE /api/v1/users/:id (eliminar usuario)', () => {
    let throwawayUserId: string;

    beforeEach(async () => {
      // Usuario desechable para el test de borrado
      const hash = await bcrypt.hash('Temp123!', 10);
      const u = await userRepo.save(userRepo.create({
        email: `qa-throwaway-${Date.now()}@test.com`,
        password_hash: hash,
        first_name: 'Throw', last_name: 'Away', position: 'x',
        is_active: true, is_email_verified: true, is_first_login: false,
      }));
      throwawayUserId = u.id;
      createdUserIds.push(u.id);
    });

    it('admin puede eliminar un usuario (soft delete)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${throwawayUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${throwawayUserId}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${throwawayUserId}`)
        .expect(401);
    });
  });

  // ─── ROLES: GET /roles ────────────────────────────────────────────────────
  describe('GET /api/v1/roles (listar roles)', () => {
    it('admin obtiene lista de roles', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const slugs = res.body.map((r: any) => r.slug);
      expect(slugs).toContain('admin');
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/roles')
        .expect(401);
    });
  });

  // ─── ROLES: GET /roles/permissions ───────────────────────────────────────
  describe('GET /api/v1/roles/permissions (listar permisos)', () => {
    it('admin puede listar permisos', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/roles/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('coordinator puede listar permisos (@Roles sobreescribe clase)', async () => {
      // GET /roles/permissions tiene @Roles('admin','coordinator') que sobreescribe
      // el @Roles('admin') de clase via getAllAndOverride
      await request(app.getHttpServer())
        .get('/api/v1/roles/permissions')
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/roles/permissions')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });
  });

  // ─── ROLES: POST /roles ───────────────────────────────────────────────────
  describe('POST /api/v1/roles (crear rol)', () => {
    it('admin puede crear un rol', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'QA Test Role', slug: 'qa-test-role', description: 'Solo para tests E2E' })
        .expect(201);

      expect(res.body.slug).toBe('qa-test-role');
      createdRoleIds.push(res.body.id);
    });

    it('retorna 409 si el slug ya existe', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Duplicado', slug: 'admin' })
        .expect(409);
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ name: 'Rol Hacker', slug: 'hacker' })
        .expect(403);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/roles')
        .send({ name: 'X', slug: 'x' })
        .expect(401);
    });
  });

  // ─── ROLES: PATCH /roles/:id ──────────────────────────────────────────────
  describe('PATCH /api/v1/roles/:id (actualizar rol)', () => {
    it('admin puede actualizar un rol', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/roles/${adminRoleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Acceso total — actualizado por test' })
        .expect(200);

      expect(res.body.description).toBe('Acceso total — actualizado por test');
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/roles/${adminRoleId}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ description: 'Hacked' })
        .expect(403);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/roles/${adminRoleId}`)
        .send({ description: 'X' })
        .expect(401);
    });
  });

  // ─── ROLES: DELETE /roles/:id ─────────────────────────────────────────────
  describe('DELETE /api/v1/roles/:id (eliminar rol)', () => {
    it('[SEGURIDAD] no se puede eliminar un rol del sistema (is_system=true)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/roles/${adminRoleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('admin puede eliminar un rol personalizado', async () => {
      // Crear un rol desechable
      const created = await request(app.getHttpServer())
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'QA Throwaway', slug: `qa-throwaway-${Date.now()}` })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/v1/roles/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/roles/${adminRoleId}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });

    it('retorna 404 para ID inexistente', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/roles/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/roles/${adminRoleId}`)
        .expect(401);
    });
  });

  // ─── ROLES: GET /roles/:id/permissions ───────────────────────────────────
  describe('GET /api/v1/roles/:id/permissions (permisos de un rol)', () => {
    it('admin puede ver los permisos de un rol', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/roles/${adminRoleId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('role');
      expect(res.body).toHaveProperty('permissions');
      expect(res.body.role.slug).toBe('admin');
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/roles/${adminRoleId}/permissions`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });
  });
});
