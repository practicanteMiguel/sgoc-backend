import {
  Controller, Get, Post, Patch, Param, Body, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SolicitudesService } from './solicitudes.service';
import { CrearSolicitudesDto, LlenadoSolicitudDto, GenerarRqsDto } from './dto/create-solicitud.dto';

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
  @ApiOperation({ summary: 'Lista solicitudes de un periodo' })
  @ApiQuery({ name: 'mes', type: Number, example: 5 })
  @ApiQuery({ name: 'anio', type: Number, example: 2026 })
  findAll(
    @Query('mes', ParseIntPipe) mes: number,
    @Query('anio', ParseIntPipe) anio: number,
  ) {
    return this.service.findAll(mes, anio);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Solicitud completa con items agrupados por categoria, subtotales y total general' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/llenado')
  @ApiOperation({ summary: 'Supervisor llena fecha, nombre, contrato y cantidades solicitadas' })
  llenado(@Param('id') id: string, @Body() dto: LlenadoSolicitudDto) {
    return this.service.llenado(id, dto);
  }
}
