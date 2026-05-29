import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequisicionesService } from './requisiciones.service';
import {
  CreateRequisicionDto,
  UpdateRequisicionDto,
  LlenadoSupervisorDto,
  CreateRequisicionMasivoDto,
  UpdateEstadoDto,
  UpdateFacturasDto,
  RecepcionDto,
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
  @ApiOperation({ summary: 'Listar requisiciones. Con mes+anio filtra por periodo de la solicitud vinculada (o created_at si es manual)' })
  @ApiQuery({ name: 'mes', type: Number, required: false, example: 5 })
  @ApiQuery({ name: 'anio', type: Number, required: false, example: 2026 })
  findAll(
    @Query('mes') mes?: string,
    @Query('anio') anio?: string,
  ) {
    return this.service.findAll(mes ? Number(mes) : undefined, anio ? Number(anio) : undefined);
  }

  @Get('informe')
  @ApiOperation({ summary: 'Informe mensual: rows planos por item con estimado vs real, totales globales' })
  @ApiQuery({ name: 'mes', type: Number, example: 5 })
  @ApiQuery({ name: 'anio', type: Number, example: 2026 })
  informe(
    @Query('mes', ParseIntPipe) mes: number,
    @Query('anio', ParseIntPipe) anio: number,
  ) {
    return this.service.informe(mes, anio);
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

  @Patch(':id/recepcion')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Supervisor confirma recepcion: registra cantidades recibidas por item, fecha de entrega y firma. Cambia estado a ENTREGADO.' })
  confirmarRecepcion(
    @Param('id') id: string,
    @Body() dto: RecepcionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.confirmarRecepcion(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar RQ y todos sus items' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
