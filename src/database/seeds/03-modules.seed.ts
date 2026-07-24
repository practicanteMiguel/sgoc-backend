import { DataSource } from 'typeorm';
import { AppModule } from '../../modules/entities/module.entity';

export async function seedModules(dataSource: DataSource) {
  const repo = dataSource.getRepository(AppModule);

  const modules = [
    { name: 'Dashboard',     slug: 'dashboard',   icon: 'LayoutDashboard', route: '/dashboard/dashboard',   order_index: 1,  is_core: true  },
    { name: 'Vehículos',      slug: 'vehicles',    icon: 'Truck',           route: '/dashboard/vehicles',    order_index: 2,  is_core: false },
    { name: 'Consumibles',    slug: 'consumables', icon: 'Package',         route: '/dashboard/consumables', order_index: 3,  is_core: false },
    { name: 'Herramientas',   slug: 'tools',       icon: 'Wrench',          route: '/dashboard/tools',       order_index: 4,  is_core: false },
    { name: 'Equipos',        slug: 'equipment',   icon: 'Settings2',       route: '/dashboard/equipment',   order_index: 5,  is_core: false },
    { name: 'Reportes',       slug: 'reports',     icon: 'FileBarChart',    route: '/dashboard/reports',     order_index: 6,  is_core: false },
    { name: 'Monitoreo',      slug: 'monitoring',  icon: 'Activity',        route: '/dashboard/monitoring',  order_index: 7,  is_core: false },
    { name: 'Usuarios',       slug: 'users',       icon: 'Users',           route: '/dashboard/users',       order_index: 8,  is_core: true  },
    { name: 'Configuración',  slug: 'settings',    icon: 'Settings',        route: '/dashboard/settings',    order_index: 9,  is_core: true  },
  ];

  for (const mod of modules) {
    const exists = await repo.findOne({ where: { slug: mod.slug } });
    if (!exists) {
      await repo.save(repo.create({ ...mod, is_active: true }));
      console.log(`✅ Módulo creado: ${mod.slug}`);
    }
  }
}