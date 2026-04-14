import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { DeliverablesService } from './deliverables.service';
import { GenerateMonthDto } from './dto/generate-month.dto';
import { DeliverableStatus, FormatType } from './deliverable.entity';
import { WaiveDeliverableDto } from './dto/waive-deliverable.dto';

@ApiTags('Compliance - Deliverables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('compliance/deliverables')
export class DeliverablesController {
  constructor(private readonly svc: DeliverablesService) {}

  // ------------------------------------------------------------------
  // Genera los 6 entregables pendientes para una planta en un mes.
  // Solo admin/coordinator pueden generar meses.
  // ------------------------------------------------------------------
  @Post('generate-month')
  @Roles('admin', 'coordinator', 'module_manager')
  @ApiOperation({ summary: 'Generar los 6 entregables del mes para una planta' })
  generateMonth(@Body() dto: GenerateMonthDto, @CurrentUser() user: User) {
    return this.svc.generateMonth(dto, user);
  }

  // ------------------------------------------------------------------
  // Lista entregables. El supervisor ve solo los suyos (por field_id).
  // Admin/coordinator pueden filtrar por cualquier planta.
  // ------------------------------------------------------------------
  @Get()
  @ApiOperation({ summary: 'Listar entregables con filtros' })
  findAll(
    @Query('field_id')    fieldId?: string,
    @Query('mes')         mes?: number,
    @Query('anio')        anio?: number,
    @Query('status')      status?: DeliverableStatus,
    @Query('format_type') formatType?: FormatType,
  ) {
    return this.svc.findAll({
      field_id: fieldId,
      mes:    mes    ? +mes    : undefined,
      anio:   anio   ? +anio   : undefined,
      status,
      format_type: formatType,
    });
  }

  // ------------------------------------------------------------------
  // Dashboard de cumplimiento: score por planta y mes.
  // ------------------------------------------------------------------
  @Get('summary')
  @ApiOperation({ summary: 'Resumen de cumplimiento: score por planta y mes' })
  summary(
    @Query('field_id') fieldId?: string,
    @Query('anio')     anio?: number,
  ) {
    return this.svc.complianceSummary({
      field_id: fieldId,
      anio: anio ? +anio : undefined,
    });
  }

  // ------------------------------------------------------------------
  // Detalle de un mes especifico: los 6 formatos y su estado.
  // ------------------------------------------------------------------
  @Get('month/:fieldId/:anio/:mes')
  @ApiOperation({ summary: 'Detalle de cumplimiento de una planta en un mes especifico' })
  monthDetail(
    @Param('fieldId') fieldId: string,
    @Param('anio')    anio: string,
    @Param('mes')     mes: string,
  ) {
    return this.svc.monthDetail(fieldId, +anio, +mes);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener entregable por ID' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  // ------------------------------------------------------------------
  // El supervisor marca un formato como entregado.
  // El sistema detecta automaticamente si es tarde o a tiempo.
  // ------------------------------------------------------------------
  @Patch(':id/submit')
  @ApiOperation({ summary: 'Marcar entregable como entregado (sistema detecta si es tarde)' })
  submit(@Param('id') id: string) {
    return this.svc.submit(id);
  }

  // ------------------------------------------------------------------
  // Marca un entregable como "no aplica" para ese mes.
  // Requiere una razon. El score se recalcula sobre los aplicables.
  // ------------------------------------------------------------------
  @Patch(':id/waive')
  @ApiOperation({ summary: 'Marcar formato como no aplica ese mes (requiere razon)' })
  waive(
    @Param('id') id: string,
    @Body() dto: WaiveDeliverableDto,
    @CurrentUser() user: User,
  ) {
    return this.svc.waive(id, dto, user);
  }

  // ------------------------------------------------------------------
  // Revierte un no_aplica a pendiente (si el supervisor se equivoco).
  // ------------------------------------------------------------------
  @Delete(':id/waive')
  @ApiOperation({ summary: 'Revertir no_aplica a pendiente' })
  unwaive(@Param('id') id: string) {
    return this.svc.unwaive(id);
  }

  // ------------------------------------------------------------------
  // El coordinador abre el modal de detalle -> se registra quien lo vio.
  // La tarjeta del supervisor muestra: "Visto por Juan Garcia - 09 abr. 14:30"
  // ------------------------------------------------------------------
  @Patch(':id/viewed')
  @Roles('admin', 'coordinator', 'module_manager')
  @ApiOperation({ summary: 'Registrar que el coordinador/admin vio el entregable' })
  markViewed(@Param('id') id: string, @CurrentUser() user: User) {
    return this.svc.markViewed(id, user);
  }
}
