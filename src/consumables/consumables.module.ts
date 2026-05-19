import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Insumo } from './entities/insumo.entity';
import { InsumoHistorial } from './entities/insumo-historial.entity';
import { PeriodoCerrado } from './entities/periodo-cerrado.entity';
import { InsumosBorrador } from './entities/insumo-borrador.entity';
import { Requisicion } from './entities/requisicion.entity';
import { RequisicionItem } from './entities/requisicion-item.entity';
import { Solicitud } from './entities/solicitud.entity';
import { SolicitudItem } from './entities/solicitud-item.entity';
import { SolicitudAdicional } from './entities/solicitud-adicional.entity';
import { RequisicionItemAdicional } from './entities/requisicion-item-adicional.entity';
import { Field } from '../plants/fields/entities/field.entity';
import { FieldLugar } from '../plants/fields/entities/field-lugar.entity';
import { AppModule as ModuloEntity } from '../modules/entities/module.entity';
import { UserModuleAccess } from '../modules/entities/user-module.entity';
import { InsumosService } from './insumos.service';
import { InsumosController } from './insumos.controller';
import { RequisicionesService } from './requisiciones.service';
import { RequisicionesController } from './requisiciones.controller';
import { SolicitudesService } from './solicitudes.service';
import { SolicitudesController } from './solicitudes.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Insumo, InsumoHistorial, PeriodoCerrado, InsumosBorrador, Requisicion, RequisicionItem, Solicitud, SolicitudItem, SolicitudAdicional, RequisicionItemAdicional, Field, FieldLugar, ModuloEntity, UserModuleAccess]),
    NotificationsModule,
  ],
  controllers: [InsumosController, RequisicionesController, SolicitudesController],
  providers: [InsumosService, RequisicionesService, SolicitudesService],
  exports: [TypeOrmModule, InsumosService, RequisicionesService, SolicitudesService],
})
export class ConsumablesModule {}
