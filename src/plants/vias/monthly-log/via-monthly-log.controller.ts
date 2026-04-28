import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { User } from '../../../users/entities/user.entity';
import { ViaMonthlyLogService } from './via-monthly-log.service';
import { CreateMonthlyLogDto } from '../dto/create-monthly-log.dto';

@ApiTags('Vias - Registros Mensuales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('via-logs')
export class ViaMonthlyLogController {
  constructor(private readonly service: ViaMonthlyLogService) {}

  @Post()
  @Roles('supervisor', 'admin', 'coordinator')
  @ApiOperation({ summary: 'Crear registro mensual de vías para una planta' })
  create(@Body() dto: CreateMonthlyLogDto, @CurrentUser() user: User) {
    return this.service.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar registros mensuales. Filtrar por field_id, year, month' })
  findAll(
    @Query('page')     page = 1,
    @Query('limit')    limit = 20,
    @Query('field_id') fieldId?: string,
    @Query('year')     year?: number,
    @Query('month')    month?: number,
  ) {
    return this.service.findAll(+page, +limit, fieldId, year ? +year : undefined, month ? +month : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener registro mensual con sus capturas' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/token')
  @Roles('supervisor', 'admin', 'coordinator')
  @ApiOperation({ summary: 'Obtener token de bóveda para compartir con trabajadores' })
  getToken(@Param('id') id: string) {
    return this.service.getVaultToken(id);
  }
}
