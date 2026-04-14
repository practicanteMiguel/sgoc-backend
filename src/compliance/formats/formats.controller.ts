import {
  Controller, Get, Post, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { FormatsService } from './formats.service';
import { BulkTaxiDto } from './dto/taxi-row.dto';
import { BulkPernoctacionDto } from './dto/pernoctacion-row.dto';
import { BulkDisponibilidadDto } from './dto/disponibilidad-row.dto';
import { BulkHorasExtraDto } from './dto/horas-extra-row.dto';

@ApiTags('Compliance - Formatos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('compliance/deliverables/:deliverableId')
export class FormatsController {
  constructor(private readonly svc: FormatsService) {}

  // ------------------------------------------------------------------
  // TAXI
  // POST sube (y reemplaza) el formato completo.
  // GET  consulta las filas guardadas.
  // ------------------------------------------------------------------
  @Post('taxi')
  @ApiOperation({ summary: 'Subir/reemplazar formato taxi (bulk)' })
  upsertTaxi(
    @Param('deliverableId') id: string,
    @Body() dto: BulkTaxiDto,
  ) {
    return this.svc.upsertTaxi(id, dto);
  }

  @Get('taxi')
  @ApiOperation({ summary: 'Obtener filas del formato taxi' })
  getTaxi(@Param('deliverableId') id: string) {
    return this.svc.getTaxi(id);
  }

  // ------------------------------------------------------------------
  // PERNOCTACION
  // ------------------------------------------------------------------
  @Post('pernoctacion')
  @ApiOperation({ summary: 'Subir/reemplazar formato pernoctacion (bulk)' })
  upsertPernoctacion(
    @Param('deliverableId') id: string,
    @Body() dto: BulkPernoctacionDto,
  ) {
    return this.svc.upsertPernoctacion(id, dto);
  }

  @Get('pernoctacion')
  @ApiOperation({ summary: 'Obtener filas del formato pernoctacion' })
  getPernoctacion(@Param('deliverableId') id: string) {
    return this.svc.getPernoctacion(id);
  }

  // ------------------------------------------------------------------
  // DISPONIBILIDAD
  // ------------------------------------------------------------------
  @Post('disponibilidad')
  @ApiOperation({ summary: 'Subir/reemplazar formato disponibilidad (bulk)' })
  upsertDisponibilidad(
    @Param('deliverableId') id: string,
    @Body() dto: BulkDisponibilidadDto,
  ) {
    return this.svc.upsertDisponibilidad(id, dto);
  }

  @Get('disponibilidad')
  @ApiOperation({ summary: 'Obtener filas del formato disponibilidad' })
  getDisponibilidad(@Param('deliverableId') id: string) {
    return this.svc.getDisponibilidad(id);
  }

  // ------------------------------------------------------------------
  // HORAS EXTRA
  // ------------------------------------------------------------------
  @Post('horas-extra')
  @ApiOperation({ summary: 'Subir/reemplazar formato horas extra (bulk)' })
  upsertHorasExtra(
    @Param('deliverableId') id: string,
    @Body() dto: BulkHorasExtraDto,
  ) {
    return this.svc.upsertHorasExtra(id, dto);
  }

  @Get('horas-extra')
  @ApiOperation({ summary: 'Obtener filas del formato horas extra' })
  getHorasExtra(@Param('deliverableId') id: string) {
    return this.svc.getHorasExtra(id);
  }
}
