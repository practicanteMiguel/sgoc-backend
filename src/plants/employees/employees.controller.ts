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
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { AssignFieldDto } from './dto/assign-field.dto';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar empleados. Filtrar por field_id (query param)' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('field_id') fieldId?: string,
  ) {
    return this.employeesService.findAll(+page, +limit, fieldId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener empleado por ID' })
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Post()
  @Roles('admin', 'coordinator')
  @ApiOperation({ summary: 'Crear empleado (opcionalmente asignar planta)' })
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: User) {
    return this.employeesService.create(dto, user);
  }

  @Patch(':id')
  @Roles('admin', 'coordinator')
  @ApiOperation({ summary: 'Actualizar datos del empleado' })
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar empleado (soft delete)' })
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }

  @Post(':id/field')
  @Roles('admin', 'coordinator')
  @ApiOperation({ summary: 'Asignar empleado a una planta' })
  assignToField(@Param('id') id: string, @Body() dto: AssignFieldDto) {
    return this.employeesService.assignToField(id, dto.field_id);
  }

  @Patch(':id/field')
  @Roles('admin', 'coordinator')
  @ApiOperation({ summary: 'Cambiar empleado de planta' })
  changeField(@Param('id') id: string, @Body() dto: AssignFieldDto) {
    return this.employeesService.changeField(id, dto.field_id);
  }

  @Delete(':id/field')
  @Roles('admin', 'coordinator')
  @ApiOperation({ summary: 'Remover empleado de su planta actual' })
  removeFromField(@Param('id') id: string) {
    return this.employeesService.removeFromField(id);
  }
}
