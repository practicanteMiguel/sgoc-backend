import {
  Controller, Get, Post, Patch, Delete, Param, Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RequisicionesService } from './requisiciones.service';
import {
  CreateRequisicionDto,
  UpdateRequisicionDto,
  LlenadoSupervisorDto,
  CreateRequisicionMasivoDto,
  UpdateEstadoDto,
  UpdateFacturasDto,
} from './dto/create-requisicion.dto';

@ApiTags('Requisiciones')
@Controller('requisiciones')
export class RequisicionesController {
  constructor(private readonly service: RequisicionesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear RQ individual. Genera automaticamente un item por cada insumo activo de la categoria' })
  create(@Body() dto: CreateRequisicionDto) {
    return this.service.create(dto);
  }

  @Post('masivo')
  @ApiOperation({ summary: 'Encargado genera RQs para todas las plantas con supervisor. Notifica a cada supervisor automaticamente' })
  crearMasivo(@Body() dto: CreateRequisicionMasivoDto) {
    return this.service.crearMasivo(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las requisiciones' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener RQ con items, valores unitarios y totales' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cabecera de la RQ (numero_rq, lote, lugar)' })
  update(@Param('id') id: string, @Body() dto: UpdateRequisicionDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/llenado')
  @ApiOperation({ summary: 'Supervisor llena fecha, nombre, contrato y cantidades solicitadas' })
  llenadoSupervisor(@Param('id') id: string, @Body() dto: LlenadoSupervisorDto) {
    return this.service.llenadoSupervisor(id, dto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Compras avanza el estado de la RQ: PEDIDO_REALIZADO | EN_BODEGA | ENTREGADO' })
  updateEstado(@Param('id') id: string, @Body() dto: UpdateEstadoDto) {
    return this.service.updateEstado(id, dto);
  }

  @Patch(':id/facturas')
  @ApiOperation({ summary: 'Encargado registra numero de factura y precio real por item' })
  updateFacturas(@Param('id') id: string, @Body() dto: UpdateFacturasDto) {
    return this.service.updateFacturas(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar RQ y todos sus items' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
