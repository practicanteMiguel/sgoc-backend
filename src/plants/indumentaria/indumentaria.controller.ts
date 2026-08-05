import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
  ApiHeader,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ApiKeyGuard } from '../../auth/guards/api-key.guard';
import { IndumentariaService } from './indumentaria.service';
import {
  CreateIndumentariaDto,
  UpdateIndumentariaDto,
  CreateEntregaDto,
  RegistrarEntregaBatchDto,
  UpsertTallaDto,
} from './dto/indumentaria.dto';
import { TipoEntrega } from './entities/entrega-indumentaria.entity';
import { TallaCategoria } from './entities/empleado-talla.entity';

@ApiTags('Indumentaria')
@Controller('indumentaria')
export class IndumentariaController {
  constructor(private readonly service: IndumentariaService) {}

  // --- Catalogo ---

  @Post()
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'X-Api-Key', description: 'API key de acceso publico' })
  @ApiOperation({
    summary:
      'Crear item de indumentaria. El codigo se genera automaticamente (IND-001...)',
  })
  create(@Body() dto: CreateIndumentariaDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar catalogo de indumentaria' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'activo', required: false })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
    @Query('activo') activo?: string,
  ) {
    const activoFlag = activo !== undefined ? activo === 'true' : undefined;
    return this.service.findAll(+page, +limit, search, activoFlag);
  }

  // --- Entregas / Historial ---
  // Nota: estas rutas de literal deben ir antes de ':id' para que Nest no las
  // confunda con el parametro de ruta del catalogo (ej. GET /entregas).

  @Post('entregas')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'X-Api-Key', description: 'API key de acceso publico' })
  @ApiOperation({
    summary:
      'Registrar entrega de indumentaria a un empleado (tocacion o reposicion)',
  })
  registrarEntrega(@Body() dto: CreateEntregaDto) {
    return this.service.registrarEntrega(dto);
  }

  @Post('entregas/batch')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'X-Api-Key', description: 'API key de acceso publico' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('firma'))
  @ApiOperation({
    summary:
      'Registrar varias entregas de indumentaria a un empleado en un solo lote, con la firma de quien recibe',
  })
  registrarEntregaBatch(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: RegistrarEntregaBatchDto,
  ) {
    if (!file)
      throw new BadRequestException('Se requiere la imagen de la firma');
    return this.service.registrarEntregaBatch(file, dto);
  }

  @Get('entregas/historial/:empleadoId')
  @ApiOperation({
    summary: 'Historial de entregas de indumentaria de un empleado',
  })
  @ApiQuery({ name: 'tipo', enum: TipoEntrega, required: false })
  getHistorialEmpleado(
    @Param('empleadoId') empleadoId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('tipo') tipo?: TipoEntrega,
  ) {
    return this.service.getHistorialEmpleado(empleadoId, +page, +limit, tipo);
  }

  @Get('entregas')
  @ApiOperation({
    summary:
      'Listar todas las entregas. Filtrar por tipo, item de indumentaria o numero de RQ',
  })
  @ApiQuery({ name: 'tipo', enum: TipoEntrega, required: false })
  @ApiQuery({ name: 'indumentariaId', required: false })
  @ApiQuery({ name: 'numeroRq', required: false })
  getEntregas(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('tipo') tipo?: TipoEntrega,
    @Query('indumentariaId') indumentariaId?: string,
    @Query('numeroRq') numeroRq?: string,
  ) {
    return this.service.getEntregas(
      +page,
      +limit,
      tipo,
      indumentariaId,
      numeroRq,
    );
  }

  @Delete('entregas/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar registro de entrega' })
  removeEntrega(@Param('id') id: string) {
    return this.service.removeEntrega(id);
  }

  // --- Tallas / Censo ---

  @Get('tallas')
  @ApiOperation({
    summary: 'Listar todas las tallas registradas (sin paginar)',
  })
  getTallasBulk() {
    return this.service.getTallasBulk();
  }

  @Get('tallas/:empleadoId')
  @ApiOperation({
    summary:
      'Talla actual de un empleado en las 4 categorias (pantalon, camisa, overol, calzado)',
  })
  getTallasEmpleado(@Param('empleadoId') empleadoId: string) {
    return this.service.getTallasEmpleado(empleadoId);
  }

  @Patch('tallas/:empleadoId/:categoria')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'X-Api-Key', description: 'API key de acceso publico' })
  @ApiOperation({
    summary:
      'Actualizar la talla actual de un empleado para una categoria (PANTALON, CAMISA, OVEROL, CALZADO)',
  })
  upsertTallaEmpleado(
    @Param('empleadoId') empleadoId: string,
    @Param('categoria') categoria: TallaCategoria,
    @Body() dto: UpsertTallaDto,
  ) {
    return this.service.upsertTallaEmpleado(empleadoId, categoria, dto);
  }

  @Get('censo-resumen')
  @ApiOperation({
    summary: 'Ultima entrega por empleado e item, para el censo general',
  })
  getCensoResumen() {
    return this.service.getCensoResumen();
  }

  @Get('censo-valores')
  @ApiOperation({
    summary:
      'Censo en valores por empleado (historico). El valor de cada entrega queda congelado desde que se registra',
  })
  getCensoValores() {
    return this.service.getCensoValores();
  }

  @Get('censo-valores/:empleadoId')
  @ApiOperation({
    summary:
      'Detalle del censo en valores de un empleado: una fila por entrega con el valor congelado en ese momento',
  })
  getCensoValorEmpleadoDetalle(@Param('empleadoId') empleadoId: string) {
    return this.service.getCensoValorEmpleadoDetalle(empleadoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener item de indumentaria por id' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'X-Api-Key', description: 'API key de acceso publico' })
  @ApiOperation({ summary: 'Actualizar item de indumentaria' })
  update(@Param('id') id: string, @Body() dto: UpdateIndumentariaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'X-Api-Key', description: 'API key de acceso publico' })
  @ApiOperation({ summary: 'Eliminar item de indumentaria' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
