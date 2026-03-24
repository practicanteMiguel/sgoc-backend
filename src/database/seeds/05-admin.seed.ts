import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';
import { UserRole } from '../../roles/entities/user-role.entity';

export async function seedAdmin(dataSource: DataSource) {
  const userRepo     = dataSource.getRepository(User);
  const roleRepo     = dataSource.getRepository(Role);
  const userRoleRepo = dataSource.getRepository(UserRole);

  const email = process.env.ADMIN_EMAIL ?? 'admin@gestion.com';
  const exists = await userRepo.findOne({ where: { email } });

  if (exists) {
    console.log(`⏭️  Admin ya existe: ${email}`);
    return;
  }

  const password_hash = await bcrypt.hash(
    process.env.ADMIN_PASSWORD ?? 'Admin123', 10
  );

  // Crear usuario — created_by apunta a sí mismo (self-reference)
  const admin = userRepo.create({
    email,
    password_hash,
    first_name: process.env.ADMIN_FIRST_NAME ?? 'Administrador',
    last_name:  process.env.ADMIN_LAST_NAME  ?? 'Sistema',
    position:   'Administrador del Sistema',
    is_active:  true,
    is_email_verified: true,
  });

  const saved = await userRepo.save(admin);

  // Self-reference para created_by
  await userRepo.update(saved.id, { created_by: saved });

  // Asignar rol admin
  const adminRole = await roleRepo.findOne({ where: { slug: 'admin' } });
  if (adminRole) {
    await userRoleRepo.save({ user: saved, role: adminRole, created_by: saved });
  }

  console.log(`✅ Admin creado: ${email}`);
}