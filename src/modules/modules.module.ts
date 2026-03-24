import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from './entities/module.entity';
import { RoleModuleAccess } from './entities/role-module-access.entity';
import { ModulesService } from './modules.service';
import { ModulesController } from './modules.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AppModule, RoleModuleAccess])],
  controllers: [ModulesController],
  providers: [ModulesService],
  exports: [ModulesService],
})
export class ModulesModule {}