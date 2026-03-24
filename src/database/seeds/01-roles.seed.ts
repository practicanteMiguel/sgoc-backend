import { DataSource } from 'typeorm';
import { Role } from '../../roles/entities/role.entity';

export async function seedRoles(dataSource: DataSource) {
  const repo = dataSource.getRepository(Role);

  const roles = [
    {
      name: 'Administrador',
      slug: 'admin',
      description: 'Acceso total a la plataforma',
      is_system: true,
      is_active: true,
    },
    {
      name: 'Coordinador',
      slug: 'coordinator',
      description: 'Lectura total y acceso a reportes',
      is_system: true,
      is_active: true,
    },
    {
      name: 'Encargado de Módulo',
      slug: 'module_manager',
      description: 'Gestión completa de su módulo asignado',
      is_system: false,
      is_active: true,
    },
    {
      name: 'Supervisor',
      slug: 'supervisor',
      description: 'Lectura y exportación de su módulo y reportes',
      is_system: true,
      is_active: true,
    },
  ];

  for (const role of roles) {
    const exists = await repo.findOne({ where: { slug: role.slug } });
    if (!exists) {
      await repo.save(repo.create(role));
      console.log(`✅ Rol creado: ${role.slug}`);
    } else {
      console.log(`⏭️  Rol ya existe: ${role.slug}`);
    }
  }
}