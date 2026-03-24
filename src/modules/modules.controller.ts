import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ModulesService } from './modules.service';

@ApiTags('Modules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los módulos activos' })
  findAll() { return this.modulesService.findAll(); }

  @Get('my-access')
  @ApiOperation({ summary: 'Módulos accesibles para el usuario autenticado (sidebar)' })
  myModules(@CurrentUser() user: any) {
    return this.modulesService.findMyModules(user.roles ?? []);
  }
}