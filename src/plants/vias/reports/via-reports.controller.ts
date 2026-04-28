import {
  Controller, Get, Post, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { User } from '../../../users/entities/user.entity';
import { ViaReportsService } from './via-reports.service';
import { CreateReportDto } from '../dto/create-report.dto';

@ApiTags('Vias - Informes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('via-reports')
export class ViaReportsController {
  constructor(private readonly service: ViaReportsService) {}

  @Post()
  @Roles('supervisor', 'admin', 'coordinator')
  @ApiOperation({ summary: 'Crear informe mensual o urgente de vías' })
  create(@Body() dto: CreateReportDto, @CurrentUser() user: User) {
    return this.service.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar informes. Filtrar por field_id, type, year, month' })
  findAll(
    @Query('page')     page = 1,
    @Query('limit')    limit = 20,
    @Query('field_id') fieldId?: string,
    @Query('type')     type?: string,
    @Query('year')     year?: number,
    @Query('month')    month?: number,
  ) {
    return this.service.findAll(
      +page, +limit, fieldId, type,
      year ? +year : undefined,
      month ? +month : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener informe con items, capturas y puntos para el mapa' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Delete(':id')
  @Roles('supervisor', 'admin', 'coordinator')
  @ApiOperation({ summary: 'Eliminar informe (soft delete)' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
