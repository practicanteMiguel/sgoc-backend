import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ApiKeyGuard } from '../../auth/guards/api-key.guard';
import { IndumentariaService } from './indumentaria.service';
import { CreateIndumentariaDto, UpdateIndumentariaDto, CreateEntregaDto } from './dto/indumentaria.dto';
import { TipoEntrega } from './entities/entrega-indumentaria.entity';

@ApiTags('Indumentaria')
@Controller('indumentaria')
export class IndumentariaController {
  constructor(private readonly service: IndumentariaService) {}

  // --- Catalogo ---

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear item de indumentaria. El codigo se genera automaticamente (IND-001...)' })
  create(@Body() dto: CreateIndumentariaDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar catalogo de indumentaria' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'activo', required: false })
  findAll(
    @Query('page')   page = 1,
    @Query('limit')  limit = 50,
    @Query('search') search?: string,
    @Query('activo') activo?: string,
  ) {
    const activoFlag = activo !== undefined ? activo === 'true' : undefined;
    return this.service.findAll(+page, +limit, search, activoFlag);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener item de indumentaria por id' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar item de indumentaria' })
  update(@Param('id') id: string, @Body() dto: UpdateIndumentariaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar item de indumentaria' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // --- Entregas / Historial ---

  @Post('entregas')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'X-Api-Key', description: 'API key de acceso publico' })
  @ApiOperation({ summary: 'Registrar entrega de indumentaria a un empleado (tocacion o reposicion)' })
  registrarEntrega(@Body() dto: CreateEntregaDto) {
    return this.service.registrarEntrega(dto);
  }

  @Get('entregas/historial/:empleadoId')
  @ApiOperation({ summary: 'Historial de entregas de indumentaria de un empleado' })
  @ApiQuery({ name: 'tipo', enum: TipoEntrega, required: false })
  getHistorialEmpleado(
    @Param('empleadoId') empleadoId: string,
    @Query('page')  page = 1,
    @Query('limit') limit = 50,
    @Query('tipo')  tipo?: TipoEntrega,
  ) {
    return this.service.getHistorialEmpleado(empleadoId, +page, +limit, tipo);
  }

  @Get('entregas')
  @ApiOperation({ summary: 'Listar todas las entregas. Filtrar por tipo o item de indumentaria' })
  @ApiQuery({ name: 'tipo', enum: TipoEntrega, required: false })
  @ApiQuery({ name: 'indumentariaId', required: false })
  getEntregas(
    @Query('page')            page = 1,
    @Query('limit')           limit = 50,
    @Query('tipo')            tipo?: TipoEntrega,
    @Query('indumentariaId')  indumentariaId?: string,
  ) {
    return this.service.getEntregas(+page, +limit, tipo, indumentariaId);
  }

  @Delete('entregas/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar registro de entrega' })
  removeEntrega(@Param('id') id: string) {
    return this.service.removeEntrega(id);
  }
}
