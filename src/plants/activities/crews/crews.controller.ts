import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { User } from '../../../users/entities/user.entity';
import { CrewsService } from './crews.service';
import { CreateCrewDto } from './dto/create-crew.dto';
import { AddEmployeeDto } from './dto/add-employee.dto';

@ApiTags('Crews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('crews')
export class CrewsController {
  constructor(private readonly service: CrewsService) {}

  @Post()
  @Roles('supervisor', 'admin', 'coordinator')
  @ApiOperation({ summary: 'Create crew — auto-assigned to the supervisor\'s field' })
  create(@Body() dto: CreateCrewDto, @CurrentUser() user: User) {
    return this.service.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List crews. Filter by field_id' })
  findAll(
    @Query('page')     page = 1,
    @Query('limit')    limit = 20,
    @Query('field_id') fieldId?: string,
  ) {
    return this.service.findAll(+page, +limit, fieldId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get crew by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('supervisor', 'admin', 'coordinator')
  @ApiOperation({ summary: 'Rename crew' })
  update(@Param('id') id: string, @Body() dto: CreateCrewDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('supervisor', 'admin', 'coordinator')
  @ApiOperation({ summary: 'Delete crew' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/employees')
  @Roles('supervisor', 'admin', 'coordinator')
  @ApiOperation({ summary: 'Add employee to crew (must belong to the same field)' })
  addEmployee(@Param('id') id: string, @Body() dto: AddEmployeeDto) {
    return this.service.addEmployee(id, dto.employee_id);
  }

  @Delete(':id/employees/:employeeId')
  @Roles('supervisor', 'admin', 'coordinator')
  @ApiOperation({ summary: 'Remove employee from crew' })
  removeEmployee(@Param('id') id: string, @Param('employeeId') employeeId: string) {
    return this.service.removeEmployee(id, employeeId);
  }
}
