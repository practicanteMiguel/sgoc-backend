import {
  Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpsertScheduleDaysDto } from './dto/upsert-schedule-days.dto';
import { ScheduleTipo } from './schedule.entity';

@ApiTags('Compliance - Schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('compliance/schedules')
export class SchedulesController {
  constructor(private readonly svc: SchedulesService) {}

  // ------------------------------------------------------------------
  // Crea la cabecera del schedule para un mes/planta/tipo.
  // Paso previo a asignar los dias.
  // ------------------------------------------------------------------
  @Post()
  @ApiOperation({ summary: 'Crear schedule (cabecera) para una planta y mes' })
  create(@Body() dto: CreateScheduleDto, @CurrentUser() user: User) {
    return this.svc.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar schedules con filtros' })
  findAll(
    @Query('field_id') fieldId?: string,
    @Query('mes')      mes?: number,
    @Query('anio')     anio?: number,
    @Query('tipo')     tipo?: ScheduleTipo,
  ) {
    return this.svc.findAll({
      field_id: fieldId,
      mes:  mes  ? +mes  : undefined,
      anio: anio ? +anio : undefined,
      tipo,
    });
  }

  // ------------------------------------------------------------------
  // Devuelve el schedule con todos los dias agrupados por empleado.
  // Util para renderizar la grilla en el front.
  // ------------------------------------------------------------------
  @Get(':id')
  @ApiOperation({ summary: 'Obtener schedule con dias agrupados por empleado' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  // ------------------------------------------------------------------
  // PUT (reemplaza) la grilla completa de dias del schedule.
  // El supervisor puede subir la grilla del mes completa de una vez.
  // Solo funciona si el schedule esta en borrador.
  // ------------------------------------------------------------------
  @Put(':id/days')
  @ApiOperation({ summary: 'Subir/reemplazar grilla completa de dias del schedule' })
  upsertDays(
    @Param('id') id: string,
    @Body() dto: UpsertScheduleDaysDto,
  ) {
    return this.svc.upsertDays(id, dto);
  }

  // ------------------------------------------------------------------
  // Cierra el schedule y lo vincula automaticamente al entregable del mes.
  // Una vez cerrado no puede modificarse.
  // ------------------------------------------------------------------
  @Patch(':id/close')
  @ApiOperation({ summary: 'Cerrar schedule y vincularlo al entregable del mes' })
  close(@Param('id') id: string) {
    return this.svc.close(id);
  }
}
