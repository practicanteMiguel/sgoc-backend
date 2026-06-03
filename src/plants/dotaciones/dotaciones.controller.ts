import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFiles, UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { DotacionesService } from './dotaciones.service';
import { CreateSolicitudMultipartDto, CreateReposicionDto, UpdateEstadoDotacionDto, FirmaAutorizadorDto, CreateRqDesdeDotacionDto } from './dto/create-solicitud.dto';
import { EstadoSolicitudDotacion } from './entities/solicitud-dotacion.entity';

@ApiTags('Dotaciones')
@Controller('dotaciones')
export class DotacionesController {
  constructor(private readonly service: DotacionesService) {}

  // --- Autenticados (supervisor) ---

  @Post('spaces')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor', 'admin', 'coordinator')
  @ApiOperation({ summary: 'Crear o recuperar el espacio de dotaciones del supervisor' })
  createOrGetSpace(@CurrentUser() user: User) {
    return this.service.createOrGetSpace(user);
  }

  @Get('spaces/my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor', 'admin', 'coordinator')
  @ApiOperation({ summary: 'Obtener mi espacio de dotaciones' })
  getMySpace(@CurrentUser() user: User) {
    return this.service.getMySpace(user);
  }

  // --- Autorizador (publico, sin autenticacion) ---

  @Get('solicitudes')
  @ApiOperation({ summary: 'Listar todas las solicitudes. Filtrar por estado y/o campo_id' })
  getAllSolicitudes(
    @Query('estado')   estado?: EstadoSolicitudDotacion,
    @Query('campo_id') campoId?: string,
  ) {
    return this.service.getAllSolicitudes(estado, campoId);
  }

  @Patch('solicitudes/:id/estado')
  @ApiOperation({ summary: 'Cambiar estado de una solicitud (emitida -> autorizada -> generada -> entregada)' })
  updateEstado(@Param('id') id: string, @Body() dto: UpdateEstadoDotacionDto) {
    return this.service.updateEstado(id, dto);
  }

  @Post('solicitudes/:id/rq')
  @ApiOperation({
    summary: 'Generar RQ desde una solicitud autorizada. La solicitud pasa a estado "generada".',
  })
  generarRq(@Param('id') id: string, @Body() dto: CreateRqDesdeDotacionDto) {
    return this.service.generarRq(id, dto);
  }

  @Patch('solicitudes/:id/firma-hse')
  @ApiOperation({
    summary: 'Guardar firma del HSE. Multipart con campo "firma" (imagen). Nombre y cargo se toman de la solicitud.',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('firma'))
  firmarHse(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Se requiere la imagen de la firma');
    return this.service.firmarHse(id, file);
  }

  @Patch('solicitudes/:id/firma-autorizador')
  @ApiOperation({
    summary: 'Guardar firma del autorizador. Multipart con campo "firma" (imagen) + nombre_autorizador + cargo_autorizador.',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('firma'))
  firmarAutorizador(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: FirmaAutorizadorDto,
  ) {
    if (!file) throw new BadRequestException('Se requiere la imagen de la firma');
    return this.service.firmarAutorizador(id, file, dto);
  }

  // --- Publicos (token) ---

  @Get('spaces/:token')
  @ApiOperation({ summary: 'Obtener info del espacio por token' })
  getByToken(@Param('token') token: string) {
    return this.service.getByToken(token);
  }

  @Get('spaces/:token/empleados')
  @ApiOperation({ summary: 'Listar empleados activos del campo asociado al token (sin autenticacion)' })
  getEmpleados(@Param('token') token: string) {
    return this.service.getEmpleadosByToken(token);
  }

  @Get('spaces/:token/solicitudes')
  @ApiOperation({ summary: 'Listar solicitudes del espacio' })
  getSolicitudes(@Param('token') token: string) {
    return this.service.getSolicitudes(token);
  }

  @Post('spaces/:token/solicitudes')
  @ApiOperation({
    summary: 'Crear solicitud con reposiciones y evidencias fotograficas en un solo envio',
    description: `
Multipart/form-data. Campos de texto mas "reposiciones" como JSON string
y archivos nombrados imagenes_0, imagenes_1... segun el indice de cada reposicion.

Ejemplo de reposiciones:
[
  {"empleado_id":"uuid","condicion_encontrada":"Casco roto","fecha_entrega":"2026-06-10"},
  {"empleado_id":"uuid2","condicion_encontrada":"Guantes desgastados"}
]

Las fotos del empleado en indice 0 van en el campo "imagenes_0",
las del indice 1 en "imagenes_1", etc.
    `,
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor())
  createSolicitud(
    @Param('token') token: string,
    @Body() body: CreateSolicitudMultipartDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    let reposicionesData: CreateReposicionDto[];
    try {
      reposicionesData = JSON.parse(body.reposiciones);
    } catch {
      throw new BadRequestException('El campo reposiciones debe ser un JSON valido');
    }

    if (!Array.isArray(reposicionesData) || reposicionesData.length === 0) {
      throw new BadRequestException('Se requiere al menos una reposicion');
    }

    // Agrupar archivos por indice de reposicion: imagenes_0, imagenes_1, ...
    const filesByIndex: Record<number, Express.Multer.File[]> = {};
    for (const file of (files ?? [])) {
      const match = file.fieldname.match(/^imagenes_(\d+)$/);
      if (match) {
        const idx = parseInt(match[1], 10);
        if (!filesByIndex[idx]) filesByIndex[idx] = [];
        filesByIndex[idx].push(file);
      }
    }

    return this.service.createSolicitud(
      token,
      {
        contrato:                body.contrato,
        fecha:                   body.fecha,
        inspeccion_realizada_por: body.inspeccion_realizada_por,
        cargo_inspector:         body.cargo_inspector,
        reposiciones:            reposicionesData,
      },
      filesByIndex,
    );
  }
}
