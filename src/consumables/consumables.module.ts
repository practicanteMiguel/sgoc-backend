import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Insumo } from './entities/insumo.entity';
import { InsumoHistorial } from './entities/insumo-historial.entity';
import { Requisicion } from './entities/requisicion.entity';
import { RequisicionItem } from './entities/requisicion-item.entity';
import { Field } from '../plants/fields/entities/field.entity';
import { AppModule as ModuloEntity } from '../modules/entities/module.entity';
import { UserModuleAccess } from '../modules/entities/user-module.entity';
import { InsumosService } from './insumos.service';
import { InsumosController } from './insumos.controller';
import { RequisicionesService } from './requisiciones.service';
import { RequisicionesController } from './requisiciones.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Insumo, InsumoHistorial, Requisicion, RequisicionItem, Field, ModuloEntity, UserModuleAccess]),
    NotificationsModule,
  ],
  controllers: [InsumosController, RequisicionesController],
  providers: [InsumosService, RequisicionesService],
  exports: [TypeOrmModule, InsumosService, RequisicionesService],
})
export class ConsumablesModule {}
