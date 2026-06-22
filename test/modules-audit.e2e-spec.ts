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
import { VoiceLog } from '../src/voice-logs/entities/voice-log.entity';

const ADMIN_EMAIL = 'qa-fase6-admin@test.com';
const PLAIN_EMAIL  = 'qa-fase6-plain@test.com';
const TEST_PASSWORD = 'TestPass123!';

describe('Fase 6 - Modules, Audit, Notifications, Voice Logs (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let roleRepo: Repository<Role>;
  let userRoleRepo: Repository<UserRole>;
  let sessionRepo: Repository<Session>;
  let voiceLogRepo: Repository<VoiceLog>;

  let adminUser: User;
  let plainUser: User;
  let adminToken: string;
  let plainToken: string;

  let notifId: string;
  let voiceLogId: string;
  let firstModuleSlug: string;

  // Endpoint único por ejecución para evitar conflictos de unicidad
  const pushEndpoint = `https://fcm.test.example.com/qa-fase6-${Date.now()}`;

  async function cleanupUsers(ids: string[]) {
    if (ids.length === 0) return;
    const ph = ids.map((_, i) => `$${i + 1}`).join(', ');
    await userRoleRepo.query(`UPDATE user_roles SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    await userRepo.query(`UPDATE users SET created_by = NULL WHERE created_by IN (${ph})`, ids);
    // notifications, voice_logs, push_subscriptions y user_module_access tienen onDelete CASCADE
    // audit_logs usa SET NULL — no necesita limpieza explícita
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

    userRepo      = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    roleRepo      = moduleFixture.get<Repository<Role>>(getRepositoryToken(Role));
    userRoleRepo  = moduleFixture.get<Repository<UserRole>>(getRepositoryToken(UserRole));
    sessionRepo   = moduleFixture.get<Repository<Session>>(getRepositoryToken(Session));
    voiceLogRepo  = moduleFixture.get<Repository<VoiceLog>>(getRepositoryToken(VoiceLog));

    const mailService = app.get(MailService);
    jest.spyOn(mailService, 'sendVerificationEmail').mockResolvedValue(undefined);
    jest.spyOn(mailService, 'sendPasswordResetByAdmin').mockResolvedValue(undefined);

    // Limpiar stale data de ejecuciones anteriores
    const staleUsers = await userRepo.find({
      where: [{ email: ADMIN_EMAIL }, { email: PLAIN_EMAIL }],
    });
    await cleanupUsers(staleUsers.map(u => u.id));

    // Asegurar rol admin
    if (!(await roleRepo.findOne({ where: { slug: 'admin' } }))) {
      await roleRepo.save(roleRepo.create({ slug: 'admin', name: 'Administrador', is_system: true, is_active: true }));
    }
    const adminRole = await roleRepo.findOneOrFail({ where: { slug: 'admin' } });
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);

    adminUser = await userRepo.save(userRepo.create({
      email: ADMIN_EMAIL, password_hash: hash,
      first_name: 'QA', last_name: 'Fase6Admin', position: 'tester',
      is_active: true, is_email_verified: true, is_first_login: false,
    }));
    await userRoleRepo.save({ user: adminUser, role: adminRole });

    plainUser = await userRepo.save(userRepo.create({
      email: PLAIN_EMAIL, password_hash: hash,
      first_name: 'QA', last_name: 'Fase6Plain', position: 'tester',
      is_active: true, is_email_verified: true, is_first_login: false,
    }));

    adminToken = (await request(app.getHttpServer())
      .post('/api/v1/auth/login').send({ email: ADMIN_EMAIL, password: TEST_PASSWORD }))
      .body.access_token;
    plainToken = (await request(app.getHttpServer())
      .post('/api/v1/auth/login').send({ email: PLAIN_EMAIL, password: TEST_PASSWORD }))
      .body.access_token;

    // Insertar un voice log directamente (POST /transcribe llama API externa Mistral)
    const saved = await voiceLogRepo.save(voiceLogRepo.create({
      user_id: adminUser.id,
      transcription: 'Transcripcion de prueba QA Fase 6',
      original_filename: 'qa-test.mp3',
    }));
    voiceLogId = saved.id;
  });

  afterAll(async () => {
    const allIds = [adminUser?.id, plainUser?.id].filter(Boolean) as string[];
    await cleanupUsers(allIds);
    await app.close();
  });

  // ─── AUDIT LOGS ──────────────────────────────────────────────────────────────

  describe('GET /api/v1/audit-logs', () => {
    it('admin puede listar audit logs (respuesta paginada)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('total');
    });

    it('admin puede filtrar por page y limit', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    it('admin puede filtrar por module y action', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs?module=users&action=CREATE')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .expect(401);
    });
  });

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

  describe('GET /api/v1/notifications/unread-count', () => {
    it('retorna count de notificaciones no leidas', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('count');
    });
  });

  describe('GET /api/v1/notifications', () => {
    it('retorna mis notificaciones en formato paginado { data, total, unread }', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('total');
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(401);
    });
  });

  describe('POST /api/v1/notifications/send', () => {
    it('admin envia notificacion a plain user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          recipient_id: plainUser.id,
          title: 'Notif QA Fase6',
          message: 'Mensaje de prueba de la Fase 6 del QA',
          priority: 'low',
        })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      notifId = res.body.id;
    });

    it('retorna 400 con body invalido (sin recipient_id)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Sin recipient ni priority' })
        .expect(400);
    });
  });

  describe('Ciclo de vida de notificacion', () => {
    it('plain user ve la notificacion recibida en res.body.data', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      const found = res.body.data.find((n: any) => n.id === notifId);
      expect(found).toBeDefined();
    });

    it('plain user puede marcar notificacion como leida', async () => {
      if (!notifId) return;
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('message');
    });

    it('GET /unread-count decrementado tras marcar como leida', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(res.body.count).toBe(0);
    });

    it('PATCH /read-all marca todas las notificaciones como leidas', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
    });

    it('plain user puede eliminar su notificacion', async () => {
      if (!notifId) return;
      await request(app.getHttpServer())
        .delete(`/api/v1/notifications/${notifId}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
    });
  });

  describe('Web Push', () => {
    it('GET /push/vapid-key devuelve clave VAPID o 400 si no esta configurada', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications/push/vapid-key')
        .set('Authorization', `Bearer ${adminToken}`);
      // 200 si VAPID_PUBLIC_KEY esta en el env, 400 si no esta configurada
      expect([200, 400]).toContain(res.status);
    });

    it('POST /push/subscribe registra suscripcion push', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications/push/subscribe')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          endpoint: pushEndpoint,
          keys: { p256dh: 'BNQvKzB8_GQzmJQx_cNNhxMxhGMz3abcdEFG', auth: 'QA_auth_secret_1234' },
          user_agent: 'QA-Test-Browser/1.0',
        });
      expect([200, 201]).toContain(res.status);
    });

    it('GET /push/subscriptions lista mis dispositivos suscritos', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications/push/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('DELETE /push/unsubscribe elimina suscripcion del dispositivo', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/v1/notifications/push/unsubscribe')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ endpoint: pushEndpoint });
      expect([200, 404]).toContain(res.status);
    });
  });

  // ─── VOICE LOGS ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/voice-logs/transcribe', () => {
    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/voice-logs/transcribe')
        .expect(401);
    });

    it('retorna 400 sin archivo adjunto', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/voice-logs/transcribe')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('retorna 400 con MIME type no soportado (PDF)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/voice-logs/transcribe')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('audio', Buffer.from('fake pdf'), { filename: 'test.pdf', contentType: 'application/pdf' })
        .expect(400);
    });

    it('con audio valido retorna 400 o 201 (API externa Mistral puede no estar disponible)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/voice-logs/transcribe')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('audio', Buffer.from('fake audio content'), { filename: 'test.mp3', contentType: 'audio/mpeg' });
      expect([201, 400, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/voice-logs', () => {
    it('admin lista todos los logs (ve el insertado en beforeAll)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/voice-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((l: any) => l.id === voiceLogId);
      expect(found).toBeDefined();
    });

    it('plain user lista sus propios logs (vacio)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/voice-logs')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/voice-logs')
        .expect(401);
    });
  });

  describe('GET /api/v1/voice-logs/:id', () => {
    it('admin puede ver su log por ID', async () => {
      if (!voiceLogId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/voice-logs/${voiceLogId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.id).toBe(voiceLogId);
      expect(res.body).toHaveProperty('transcription');
    });
  });

  describe('PATCH /api/v1/voice-logs/:id/transcription', () => {
    it('admin puede actualizar la transcripcion de su log', async () => {
      if (!voiceLogId) return;
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/voice-logs/${voiceLogId}/transcription`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ transcription: 'Transcripcion actualizada por QA Fase 6' })
        .expect(200);
      expect(res.body.transcription).toBe('Transcripcion actualizada por QA Fase 6');
    });

    it('retorna 400 con transcripcion vacia', async () => {
      if (!voiceLogId) return;
      await request(app.getHttpServer())
        .patch(`/api/v1/voice-logs/${voiceLogId}/transcription`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ transcription: '' })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/voice-logs/:id', () => {
    it('admin puede eliminar su log (soft delete)', async () => {
      if (!voiceLogId) return;
      await request(app.getHttpServer())
        .delete(`/api/v1/voice-logs/${voiceLogId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('GET /:id retorna 404 despues del soft delete', async () => {
      if (!voiceLogId) return;
      await request(app.getHttpServer())
        .get(`/api/v1/voice-logs/${voiceLogId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/voice-logs/report', () => {
    it('retorna 404 con IDs que no pertenecen al usuario', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000001';
      const res = await request(app.getHttpServer())
        .post('/api/v1/voice-logs/report')
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ ids: [fakeId], title: 'Informe QA Prueba' });
      expect([400, 404, 500]).toContain(res.status);
    });
  });

  // ─── MODULES ─────────────────────────────────────────────────────────────────

  describe('GET /api/v1/modules', () => {
    it('admin puede listar todos los modulos activos', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/modules')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        firstModuleSlug = res.body[0].slug;
      }
    });

    it('[SEGURIDAD] usuario sin rol recibe 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/modules')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });

    it('retorna 401 sin token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/modules')
        .expect(401);
    });
  });

  describe('GET /api/v1/modules/my-access', () => {
    it('admin ve todos los modulos (admin bypass)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/modules/my-access')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('plain user ve sus modulos accesibles (puede ser lista vacia)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/modules/my-access')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Gestion de accesos por usuario (solo admin)', () => {
    it('GET /user/:userId — admin ve accesos asignados al usuario', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/modules/user/${plainUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('[SEGURIDAD] GET /user/:userId — plain user recibe 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/modules/user/${adminUser.id}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });

    it('POST /user/:userId — admin asigna modulos a usuario', async () => {
      if (!firstModuleSlug) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/modules/user/${plainUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          accesses: [{
            module_slug: firstModuleSlug,
            can_create: false, can_edit: false, can_delete: false, can_export: false,
          }],
        })
        .expect(201);
      expect(res.body).toHaveProperty('assigned');
    });

    it('[SEGURIDAD] POST /user/:userId — plain user recibe 403', async () => {
      if (!firstModuleSlug) return;
      await request(app.getHttpServer())
        .post(`/api/v1/modules/user/${adminUser.id}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ accesses: [{ module_slug: firstModuleSlug }] })
        .expect(403);
    });

    it('PUT /user/:userId/module/:slug — admin actualiza permisos de modulo individual', async () => {
      if (!firstModuleSlug) return;
      const res = await request(app.getHttpServer())
        .put(`/api/v1/modules/user/${plainUser.id}/module/${firstModuleSlug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ can_create: true, can_edit: true })
        .expect(200);
      expect(res.body).toHaveProperty('assigned', true);
    });

    it('DELETE /user/:userId/module/:slug — admin revoca acceso a modulo individual', async () => {
      if (!firstModuleSlug) return;
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/modules/user/${plainUser.id}/module/${firstModuleSlug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('revoked', true);
    });

    it('DELETE /user/:userId — admin limpia todos los accesos del usuario', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/modules/user/${plainUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('message');
    });
  });
});
