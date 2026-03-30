import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from './entities/module.entity';
import { UserModuleAccess } from './entities/user-module.entity';
import { RolePermission } from '../roles/entities/role-permission.entity';
import { ModulesService } from './modules.service';
import { ModulesController } from './modules.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppModule,
      UserModuleAccess,
      RolePermission,
    ]),
  ],
  controllers: [ModulesController],
  providers: [ModulesService],
  exports: [ModulesService],
})
export class ModulesModule {}