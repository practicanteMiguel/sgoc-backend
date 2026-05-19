import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SolicitudesService } from './solicitudes.service';
import { CrearSolicitudesDto, LlenadoSolicitudDto, GenerarRqsDto, CrearAdicionalDto, UpdateAdicionalDto, CrearSolicitudAdicionalDto } from './dto/create-solicitud.dto';

@ApiTags('Solicitudes')
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly service: SolicitudesService) {}

  @Post()
  @ApiOperation({ summary: 'Envia plantillas a todas las plantas activas con supervisor. Una solicitud por planta con todos los insumos activos.' })
  enviarAplantas(@Body() dto: CrearSolicitudesDto) {
    return this.service.enviarAplantas(dto);
  }

  @Post('generar-rqs')
  @ApiOperation({ summary: 'Genera RQs formales por categoria a partir de una solicitud completada. Solo crea RQ para categorias con al menos un item solicitado.' })
  generarRqs(@Body() dto: GenerarRqsDto) {
    return this.service.generarRqs(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista solicitudes de un periodo. Filtrar por planta con field_id.' })
  @ApiQuery({ name: 'mes', type: Number, example: 5 })
  @ApiQuery({ name: 'anio', type: Number, example: 2026 })
  @ApiQuery({ name: 'field_id', required: false, type: String })
  findAll(
    @Query('mes', ParseIntPipe) mes: number,
    @Query('anio', ParseIntPipe) anio: number,
    @Query('field_id') fieldId?: string,
  ) {
    return this.service.findAll(mes, anio, fieldId);
  }

  @Get('mi-solicitud')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Retorna la solicitud del periodo para la planta del supervisor autenticado. 404 si no existe.' })
  @ApiQuery({ name: 'mes', type: Number, example: 5 })
  @ApiQuery({ name: 'anio', type: Number, example: 2026 })
  findMiSolicitud(
    @CurrentUser('id') userId: string,
    @Query('mes', ParseIntPipe) mes: number,
    @Query('anio', ParseIntPipe) anio: number,
  ) {
    return this.service.findMiSolicitud(userId, mes, anio);
  }

  @Get('mis-solicitudes')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lista todas las solicitudes del periodo para el supervisor autenticado (principal + adicionales)' })
  @ApiQuery({ name: 'mes', type: Number, example: 5 })
  @ApiQuery({ name: 'anio', type: Number, example: 2026 })
  findMisSolicitudes(
    @CurrentUser('id') userId: string,
    @Query('mes', ParseIntPipe) mes: number,
    @Query('anio', ParseIntPipe) anio: number,
  ) {
    return this.service.findMisSolicitudes(userId, mes, anio);
  }

  @Post('adicional')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Supervisor crea una solicitud adicional para un espacio especifico de su campo' })
  crearAdicional(
    @CurrentUser('id') userId: string,
    @Body() dto: CrearSolicitudAdicionalDto,
  ) {
    return this.service.crearAdicional(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Solicitud completa con items agrupados por categoria, subtotales y total general' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/requisiciones')
  @ApiOperation({ summary: 'Requisiciones generadas a partir de esta solicitud. Para trazabilidad del supervisor.' })
  findRequisiciones(@Param('id') id: string) {
    return this.service.findRequisicionesBySolicitud(id);
  }

  @Patch(':id/reabrir')
  @ApiOperation({ summary: 'Encargado re-abre la solicitud: vuelve a PENDIENTE para que el supervisor pueda editarla de nuevo' })
  reabrir(@Param('id') id: string) {
    return this.service.reabrir(id);
  }

  @Patch(':id/llenado')
  @ApiOperation({ summary: 'Supervisor llena fecha, nombre, contrato y cantidades solicitadas' })
  llenado(@Param('id') id: string, @Body() dto: LlenadoSolicitudDto) {
    return this.service.llenado(id, dto);
  }

  @Post(':id/adicionales')
  @ApiOperation({ summary: 'Agrega un insumo adicional a la solicitud (exclusivo del mes y planta)' })
  addAdicional(@Param('id') id: string, @Body() dto: CrearAdicionalDto) {
    return this.service.addAdicional(id, dto);
  }

  @Patch(':id/adicionales/:adicionalId')
  @ApiOperation({ summary: 'Edita un insumo adicional' })
  updateAdicional(
    @Param('id') id: string,
    @Param('adicionalId') adicionalId: string,
    @Body() dto: UpdateAdicionalDto,
  ) {
    return this.service.updateAdicional(id, adicionalId, dto);
  }

  @Delete(':id/adicionales/:adicionalId')
  @ApiOperation({ summary: 'Elimina un insumo adicional de la solicitud' })
  removeAdicional(@Param('id') id: string, @Param('adicionalId') adicionalId: string) {
    return this.service.removeAdicional(id, adicionalId);
  }
}
