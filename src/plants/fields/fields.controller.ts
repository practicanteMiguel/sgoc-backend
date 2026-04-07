import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { FieldsService } from './fields.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { AssignSupervisorDto } from './dto/assign-supervisor.dto';

@ApiTags('Fields')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fields')
export class FieldsController {
  constructor(private readonly fieldsService: FieldsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las plantas' })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.fieldsService.findAll(+page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener planta por ID con empleados y supervisor' })
  findOne(@Param('id') id: string) {
    return this.fieldsService.findOne(id);
  }

  @Post()
  @Roles('admin', 'coordinator')
  @ApiOperation({ summary: 'Crear planta' })
  create(@Body() dto: CreateFieldDto, @CurrentUser() user: User) {
    return this.fieldsService.create(dto, user);
  }

  @Patch(':id')
  @Roles('admin', 'coordinator')
  @ApiOperation({ summary: 'Actualizar datos de la planta' })
  update(@Param('id') id: string, @Body() dto: UpdateFieldDto) {
    return this.fieldsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar planta (soft delete)' })
  remove(@Param('id') id: string) {
    return this.fieldsService.remove(id);
  }

  @Post(':id/supervisor')
  @Roles('admin', 'coordinator')
  @ApiOperation({ summary: 'Asignar supervisor a la planta' })
  assignSupervisor(@Param('id') id: string, @Body() dto: AssignSupervisorDto) {
    return this.fieldsService.assignSupervisor(id, dto.user_id);
  }

  @Delete(':id/supervisor')
  @Roles('admin', 'coordinator')
  @ApiOperation({ summary: 'Remover supervisor de la planta' })
  removeSupervisor(@Param('id') id: string) {
    return this.fieldsService.removeSupervisor(id);
  }
}
