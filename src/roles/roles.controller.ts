import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesService } from './roles.service';
import { User } from '../users/entities/user.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { PermissionsDto } from './dto/permissions.dto';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
    @ApiOperation({ summary: 'Obtener todos los roles' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get('permissions')
  @Roles('admin', 'coordinator')
    @ApiOperation({ summary: 'Obtener todos los permisos disponibles' })
  findPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Post()
    @ApiOperation({ summary: 'Crear un rol' })
  create(@Body() dto: CreateRoleDto, @CurrentUser() user: User) {
    return this.rolesService.create(dto, user);
  }

  @Patch(':id')
    @ApiOperation({ summary: 'Actualizar nombre o descripocion de un rol' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un rol ( solo roles que no son del sistema )' })
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
  @Get(':id/permissions')
  @ApiOperation({ summary: 'Obtener los permisos de un rol' })
  getRolePermissions(@Param('id') id: string) {
    return this.rolesService.getRolePermissions(id);
  }

  @Post(':id/permissions')
  @ApiOperation({ summary: 'Reemplazar todos los permisos de un rol' })
  assignPermissions(
    @Param('id') id: string,
    @Body() dto: PermissionsDto,
    @CurrentUser() user: User,
  ) {
    return this.rolesService.assignPermissions(id, dto.permissions, user);
  }

  @Post(':id/permissions/add')
  @ApiOperation({
    summary: 'Agregar permisos a un rol(sin reemplazar los actuales)',
    description: 'Los permisos se agregan al final de la lista de permisos del rol',
  })
  addPermissions(
    @Param('id') id: string,
    @Body() dto: PermissionsDto,
    @CurrentUser() user: User,
  ) {
    return this.rolesService.addPermissions(id, dto.permissions, user);
  }

  @Post(':id/permissions/remove')
  @ApiOperation({
    summary: 'Eliminar permisos de un rol(sin reemplazar los actuales)',
    description: 'Los permisos se eliminan de la lista de permisos del rol',
  })
  removePermissions(
    @Param('id') id: string,
    @Body() dto: PermissionsDto
  ) {
    return this.rolesService.removePermissions(id, dto.permissions);
  }
  
}
