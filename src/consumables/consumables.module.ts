import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Insumo } from './entities/insumo.entity';
import { Requisicion } from './entities/requisicion.entity';
import { RequisicionItem } from './entities/requisicion-item.entity';
import { InsumosService } from './insumos.service';
import { InsumosController } from './insumos.controller';
import { RequisicionesService } from './requisiciones.service';
import { RequisicionesController } from './requisiciones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Insumo, Requisicion, RequisicionItem])],
  controllers: [InsumosController, RequisicionesController],
  providers: [InsumosService, RequisicionesService],
  exports: [TypeOrmModule, InsumosService, RequisicionesService],
})
export class ConsumablesModule {}
