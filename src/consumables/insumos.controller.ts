import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InsumosService } from './insumos.service';
import { CreateInsumoDto, UpdateInsumoDto, CerrarMesDto, BorradorInsumoDto } from './dto/create-insumo.dto';
import { CategoriaInsumo } from './entities/insumo.entity';

@ApiTags('Insumos')
@Controller('insumos')
export class InsumosController {
  constructor(private readonly service: InsumosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear insumo. El codigo se genera automaticamente segun la categoria' })
  create(@Body() dto: CreateInsumoDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar insumos. Filtrar por categoria, busqueda y estado' })
  @ApiQuery({ name: 'categoria', enum: CategoriaInsumo, required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'activo', required: false })
  findAll(
    @Query('page')      page = 1,
    @Query('limit')     limit = 20,
    @Query('categoria') categoria?: CategoriaInsumo,
    @Query('search')    search?: string,
    @Query('activo')    activo?: string,
  ) {
    const activoFlag = activo !== undefined ? activo === 'true' : undefined;
    return this.service.findAll(+page, +limit, categoria, search, activoFlag);
  }

  @Get('periodos-cerrados')
  @ApiOperation({ summary: 'Retorna todos los meses ya cerrados' })
  getPeriodosCerrados() {
    return this.service.getPeriodosCerrados();
  }

  @Get('cambios')
  @ApiOperation({ summary: 'Retorna insumos que tuvieron cambios en el mes indicado con valores anterior y nuevo' })
  @ApiQuery({ name: 'mes', type: Number, example: 5 })
  @ApiQuery({ name: 'anio', type: Number, example: 2026 })
  getCambios(
    @Query('mes', ParseIntPipe) mes: number,
    @Query('anio', ParseIntPipe) anio: number,
  ) {
    return this.service.getCambios(mes, anio);
  }

  @Get('borradores')
  @ApiOperation({ summary: 'Borradores pendientes de un periodo. Incluye datos del insumo para mostrar en pantalla' })
  @ApiQuery({ name: 'mes', type: Number, example: 5 })
  @ApiQuery({ name: 'anio', type: Number, example: 2026 })
  getBorradores(
    @Query('mes', ParseIntPipe) mes: number,
    @Query('anio', ParseIntPipe) anio: number,
  ) {
    return this.service.getBorradores(mes, anio);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener insumo por id' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/borrador')
  @ApiOperation({ summary: 'Upsert de borrador por (insumo, mes, anio). Solo guarda los campos enviados' })
  upsertBorrador(@Param('id') id: string, @Body() dto: BorradorInsumoDto) {
    return this.service.upsertBorrador(id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar valor unitario, proveedor o estado del insumo (aplicacion directa, sin borrador)' })
  update(@Param('id') id: string, @Body() dto: UpdateInsumoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar insumo permanentemente' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('cerrar-mes')
  @ApiOperation({ summary: 'Compras cierra el mes: notifica a los encargados de consumables que la lista esta lista para revisar' })
  cerrarMes(@Body() dto: CerrarMesDto) {
    return this.service.cerrarMes(dto);
  }
}
