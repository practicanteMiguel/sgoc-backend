# Plataforma de Gestión — Backend

API REST construida con NestJS, TypeORM y PostgreSQL para la gestión operativa del contrato de servicios en campos petroleros.

---

## Stack tecnológico

| Tecnología | Versión | Propósito |
|---|---|---|
| NestJS | 11.x | Framework backend modular |
| TypeORM | 0.3.x | ORM para PostgreSQL |
| PostgreSQL | 16.x | Base de datos relacional |
| JWT | — | Autenticación con access + refresh tokens |
| SendGrid | — | Envío de emails transaccionales |
| Swagger | — | Documentación interactiva de APIs |
| pnpm | 8.x | Gestor de paquetes |

---

## Requisitos previos

- Node.js v20 o superior
- pnpm v8 o superior
- PostgreSQL 16 corriendo localmente o en la nube
- Cuenta en SendGrid (plan gratuito — 100 emails/día)

---

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/TU_USUARIO/gestion-backend.git
cd gestion-backend

# Instalar dependencias
pnpm install

# Copiar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

---

## Variables de entorno

Crear el archivo `.env` en la raíz del proyecto con las siguientes variables:

```bash
# Aplicación
PORT=3000
NODE_ENV=development

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=tu_password
DB_NAME=gestion_db

# JWT
JWT_SECRET=tu_secret_minimo_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=otro_secret_minimo_32_chars
JWT_REFRESH_EXPIRES_IN=7d

# Email — SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
MAIL_FROM=tu_correo_verificado@gmail.com

# Frontend (para links de verificación en emails)
FRONTEND_URL=http://localhost:3001

# Admin inicial (usado en el seed)
ADMIN_EMAIL=admin@tuempresa.com
ADMIN_PASSWORD=Admin123!
ADMIN_FIRST_NAME=Administrador
ADMIN_LAST_NAME=Sistema
```

---

## Comandos disponibles

```bash
# Desarrollo con hot reload
pnpm run start:dev

# Ejecutar seeds (primera vez o después de resetear la BD)
pnpm run seed

# Build para producción
pnpm run build

# Producción
pnpm run start:prod
```

---

## Estructura del proyecto

```
src/
├── auth/                     # Login, JWT, guards, estrategias
│   ├── decorators/           # @CurrentUser, @Roles
│   ├── dto/                  # LoginDto, RefreshTokenDto
│   ├── guards/               # JwtAuthGuard, RolesGuard
│   └── strategies/           # JwtStrategy, LocalStrategy
├── users/                    # Gestión de usuarios
│   ├── dto/                  # CreateUserDto, UpdateUserDto, etc.
│   └── entities/             # User, Session
├── roles/                    # Roles y permisos
│   ├── dto/
│   └── entities/             # Role, Permission, UserRole, RolePermission
├── modules/                  # Módulos de la plataforma
│   └── entities/             # AppModule, RoleModuleAccess
├── audit/                    # Auditoría automática
│   └── entities/             # AuditLog
├── notifications/            # Notificaciones internas
│   ├── dto/                  # SendNotificationDto
│   └── entities/             # Notification
├── mail/                     # Servicio de emails con SendGrid
├── common/                   # Compartido entre módulos
│   ├── decorators/           # @RequirePermissions
│   ├── filters/              # HttpExceptionFilter
│   ├── interceptors/         # AuditInterceptor
│   ├── pipes/                # ValidationPipe
│   └── types/                # express.d.ts
├── database/
│   └── seeds/                # Seeds en orden de ejecución
│       ├── 01-roles.seed.ts
│       ├── 02-permissions.seed.ts
│       ├── 03-modules.seed.ts
│       ├── 04-role-permissions.seed.ts
│       ├── 05-admin.seed.ts
│       └── run-seeds.ts
├── app.module.ts             # Módulo raíz con interceptor global
└── main.ts                   # Bootstrap con CORS, Swagger y pipes
```

---

## Base de datos

### Tablas

| Tabla | Propósito |
|---|---|
| `users` | Usuarios de la plataforma |
| `sessions` | Sesiones JWT activas |
| `roles` | Roles del sistema |
| `permissions` | Permisos granulares por módulo y acción |
| `user_roles` | Asignación usuario ↔ rol |
| `role_permissions` | Asignación rol ↔ permiso |
| `modules` | Módulos registrados de la plataforma |
| `role_module_access` | Acceso de cada rol a cada módulo |
| `audit_logs` | Registro automático de todas las operaciones de escritura |
| `notifications` | Notificaciones internas entre usuarios |

### Seeds

Los seeds se ejecutan en orden y son idempotentes (se pueden ejecutar varias veces sin duplicar datos):

```
01 → Roles base (admin, coordinator, module_manager, supervisor)
02 → 45 permisos (9 módulos × 5 acciones: view, create, edit, delete, export)
03 → 9 módulos de la plataforma
04 → Asignación de permisos por rol según matriz definida
05 → Usuario administrador inicial
```

---

## Roles y permisos

### Roles del sistema

| Rol | is_system | Acceso |
|---|---|---|
| `admin` | Sí | Total — todos los módulos y acciones |
| `coordinator` | Sí | Lectura y exportación en todos los módulos |
| `module_manager` | No | CRUD completo en su módulo asignado |
| `supervisor` | Sí | Lectura y exportación en dashboard, reports y monitoring |

Los roles con `is_system: true` no pueden eliminarse desde la UI. Los roles nuevos que cree el admin tienen `is_system: false` y son completamente gestionables.

### Campos específicos por rol

- `module` — obligatorio para `module_manager` (indica qué módulo controla)
- `field` — obligatorio para `supervisor` (indica a qué planta o campo pertenece)
- `admin` y `coordinator` dejan estos campos vacíos

---

## APIs disponibles

El servidor corre en `http://localhost:3000/api/v1`

La documentación interactiva de Swagger está en `http://localhost:3000/api/docs`

### Auth

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| POST | `/auth/login` | Iniciar sesión | No |
| POST | `/auth/refresh` | Renovar access token | No |
| POST | `/auth/logout` | Cerrar sesión | Bearer |
| GET | `/auth/me` | Obtener usuario autenticado | Bearer |
| GET | `/auth/verify-email?token=` | Verificar correo electrónico | No |

### Users

| Método | Endpoint | Descripción | Roles |
|---|---|---|---|
| GET | `/users` | Listar usuarios | admin, coordinator |
| GET | `/users/profile` | Mi perfil | Todos |
| GET | `/users/:id` | Usuario por ID | admin, coordinator |
| POST | `/users` | Crear usuario + enviar email | admin |
| PATCH | `/users/:id` | Actualizar usuario | admin |
| DELETE | `/users/:id` | Eliminar (soft delete) | admin |
| PATCH | `/users/me/change-password` | Cambiar mi contraseña | Todos |
| PATCH | `/users/:id/reset-password` | Admin resetea contraseña | admin |

### Roles y Permisos

| Método | Endpoint | Descripción | Roles |
|---|---|---|---|
| GET | `/roles` | Listar roles | admin |
| GET | `/roles/permissions` | Listar todos los permisos | admin, coordinator |
| GET | `/roles/:id/permissions` | Permisos actuales de un rol | admin |
| POST | `/roles` | Crear rol | admin |
| PATCH | `/roles/:id` | Actualizar rol | admin |
| DELETE | `/roles/:id` | Eliminar rol (no sistema) | admin |
| POST | `/roles/:id/permissions` | Reemplazar todos los permisos | admin |
| POST | `/roles/:id/permissions/add` | Agregar permisos sin quitar los existentes | admin |
| POST | `/roles/:id/permissions/remove` | Quitar permisos específicos | admin |

### Módulos

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| GET | `/modules` | Listar todos los módulos activos | Bearer |
| GET | `/modules/my-access` | Módulos accesibles según mi rol (sidebar) | Bearer |

### Notifications

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| POST | `/notifications/send` | Enviar mensaje a un usuario | Bearer |
| GET | `/notifications` | Mis notificaciones | Bearer |
| GET | `/notifications?unread=true` | Solo las no leídas | Bearer |
| GET | `/notifications/unread-count` | Contador para el badge | Bearer |
| PATCH | `/notifications/:id/read` | Marcar una como leída | Bearer |
| PATCH | `/notifications/read-all` | Marcar todas como leídas | Bearer |
| DELETE | `/notifications/:id` | Eliminar una notificación | Bearer |

### Audit

| Método | Endpoint | Descripción | Roles |
|---|---|---|---|
| GET | `/audit-logs` | Listar logs con filtros | admin |
| GET | `/audit-logs?module=users` | Filtrar por módulo | admin |
| GET | `/audit-logs?action=CREATE` | Filtrar por acción | admin |
| GET | `/audit-logs?userId=uuid` | Filtrar por usuario | admin |

---

## Flujo de creación de usuarios

```
1. Admin → POST /users (email, nombre, cargo, rol)
2. Sistema genera contraseña temporal y token de verificación
3. SendGrid envía email con contraseña temporal y botón de verificación
4. Usuario hace clic en el link → GET /auth/verify-email?token=xxx
5. Sistema marca is_email_verified = true
6. Usuario hace login con contraseña temporal
7. Backend devuelve is_first_login: true
8. Frontend redirige a pantalla de cambio de contraseña
9. Usuario → PATCH /users/me/change-password
10. Sistema marca is_first_login = false
```

---

## Auditoría automática

El `AuditInterceptor` registra automáticamente todas las operaciones de escritura (POST, PUT, PATCH, DELETE) en la tabla `audit_logs`.

**Se registra:** creación de usuarios, cambios de roles, asignación de permisos, envío de notificaciones, reset de contraseñas y cualquier otra operación de escritura.

**No se registra:** login, logout, refresh token, cambio de contraseña propio, operaciones de solo lectura (GET).

**Seguridad:** los campos sensibles como contraseñas y tokens se reemplazan automáticamente por `[REDACTED]` antes de guardarse.

---

## Despliegue en Railway

1. Crear un nuevo proyecto en Railway
2. Conectar el repositorio de GitHub
3. Agregar un servicio de PostgreSQL desde el marketplace de Railway
4. Configurar las variables de entorno del backend en Railway
5. Railway detecta automáticamente que es un proyecto Node.js

Variables adicionales para producción:
```bash
NODE_ENV=production
FRONTEND_URL=https://tu-dominio-frontend.vercel.app
```

---

## Estado del proyecto

### Fase 1 — Completada ✅
- Base de datos diseñada e implementada
- Sistema de autenticación con JWT (access + refresh tokens)
- Gestión de usuarios con verificación de email
- Roles y permisos granulares y dinámicos
- Módulos registrados y control de acceso por rol
- Auditoría automática de operaciones
- Notificaciones internas entre usuarios
- Seeds automáticos

### Fase 2 — Pendiente 🔄
- Módulo de Vehículos
- Módulo de Consumibles
- Módulo de Herramientas
- Módulo de Equipos
- Módulo de Reportes
- Dashboard con estadísticas
- Monitoreo en tiempo real