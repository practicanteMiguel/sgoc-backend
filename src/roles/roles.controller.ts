import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesService } from './roles.service';
import { User } from '../users/entities/user.entity';
import { IsArray, IsString } from 'class-validator';

class CreateRoleDto {
  @IsString() name!: string;
  @IsString() slug!: string;
  description?: string;
}
class AssignPermissionsDto {
  @IsArray() @IsString({ each: true }) permissions!: string[];
}

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get() findAll() { return this.rolesService.findAll(); }

  @Get('permissions')
  @Roles('admin', 'coordinator')
  findPermissions() { return this.rolesService.findAllPermissions(); }

  @Post()
  create(@Body() dto: CreateRoleDto, @CurrentUser() user: User) {
    return this.rolesService.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.rolesService.remove(id); }

  @Post(':id/permissions')
  @ApiOperation({ summary: 'Asignar permisos a un rol' })
  assignPermissions(
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser() user: User,
  ) {
    return this.rolesService.assignPermissions(id, dto.permissions, user);
  }
}