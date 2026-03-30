import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ModulesService } from './modules.service';
import { SetUserModuleAccessDto, SingleModuleAccessDto } from './dto/set-user-module-access.dto';

@ApiTags('Modules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los módulos activos' })
  findAll() {
    return this.modulesService.findAll();
  }

  @Get('my-access')
  @ApiOperation({ summary: 'Módulos accesibles para el usuario autenticado (sidebar)' })
  myModules(@CurrentUser() user: any) {
    // Ahora recibe también el userId para chequear overrides por usuario
    return this.modulesService.findMyModules(user.roles ?? [], user.id);
  }

  // ── Endpoints de gestión de accesos por usuario (solo admin) ──

  @Get('user/:userId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Ver accesos de módulos asignados a un usuario específico' })
  getUserAccess(@Param('userId') userId: string) {
    return this.modulesService.getUserModuleAccess(userId);
  }

  @Post('user/:userId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Asignar módulos a un usuario específico (reemplaza los anteriores)',
    description: 'Enviar array vacío limpia los accesos y vuelve a usar los del rol.',
  })
  setUserAccess(
    @Param('userId') userId: string,
    @Body() body: SetUserModuleAccessDto,
    @CurrentUser() admin: any,
  ) {
    return this.modulesService.setUserModuleAccess(userId, body.accesses, admin);
  }

  @Put('user/:userId/module/:moduleSlug')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Asignar o actualizar acceso a un módulo individual',
    description: 'Si el módulo ya está asignado, actualiza sus permisos. Si no existe, lo crea.',
  })
  assignModule(
    @Param('userId') userId: string,
    @Param('moduleSlug') moduleSlug: string,
    @Body() body: SingleModuleAccessDto,
    @CurrentUser() admin: any,
  ) {
    return this.modulesService.assignSingleModule(userId, moduleSlug, body, admin);
  }

  @Delete('user/:userId/module/:moduleSlug')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Revocar acceso a un módulo individual',
    description: 'Si era el último módulo asignado, el usuario vuelve automáticamente a los permisos del rol.',
  })
  revokeModule(
    @Param('userId') userId: string,
    @Param('moduleSlug') moduleSlug: string,
  ) {
    return this.modulesService.revokeSingleModule(userId, moduleSlug);
  }

  @Delete('user/:userId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Limpiar todos los accesos individuales — vuelve a usar los del rol' })
  clearUserAccess(@Param('userId') userId: string) {
    return this.modulesService.clearUserModuleAccess(userId);
  }
}