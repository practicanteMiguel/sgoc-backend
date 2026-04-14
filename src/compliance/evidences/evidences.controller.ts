import {
  Controller, Post, Get, Delete, Body, Query, Param, UseGuards,
  UseInterceptors, UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { EvidencesService } from './evidences.service';
import { UploadEvidenceDto } from './dto/upload-evidence.dto';
import { EvidenceCategory } from './entities/evidence-file.entity';

@ApiTags('Compliance - Evidences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('compliance/evidences')
export class EvidencesController {
  constructor(private readonly svc: EvidencesService) {}

  // ------------------------------------------------------------------
  // Sube uno o varios PDF/imagenes a Drive.
  // Campos del form: field_id, anio, mes (opcional), category (opcional).
  // Los archivos van en el campo "files".
  // ------------------------------------------------------------------
  @Post('upload')
  @ApiOperation({ summary: 'Subir evidencias a Google Drive (cualquier tipo de archivo)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['field_id'],
      properties: {
        files:     { type: 'array', items: { type: 'string', format: 'binary' } },
        field_id:  { type: 'string', format: 'uuid' },
        anio:      { type: 'integer', example: 2026 },
        mes:       { type: 'integer', example: 4, description: '1-12, opcional' },
        category:  { type: 'string', enum: Object.values(EvidenceCategory) },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 20, {
    storage: memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
  }))
  upload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadEvidenceDto,
    @CurrentUser() user: User,
  ) {
    return this.svc.upload(dto, files, user);
  }

  // ------------------------------------------------------------------
  // Limpia cache de carpetas Drive. Sin field_id limpia todo el cache.
  // Usar cuando se eliminan carpetas manualmente en Drive.
  // ------------------------------------------------------------------
  @Delete('cache')
  @ApiOperation({ summary: 'Limpiar cache de carpetas Drive (todo o por field_id)' })
  clearCache(@Query('field_id') fieldId?: string) {
    return this.svc.clearFolderCache(fieldId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar evidencia de Drive y de la base de datos' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  // ------------------------------------------------------------------
  // Lista evidencias con filtros opcionales.
  // ------------------------------------------------------------------
  @Get()
  @ApiOperation({ summary: 'Listar evidencias subidas' })
  findAll(
    @Query('field_id')  fieldId?: string,
    @Query('anio')      anio?: number,
    @Query('mes')       mes?: number,
    @Query('category')  category?: EvidenceCategory,
  ) {
    return this.svc.findAll({
      field_id: fieldId,
      anio: anio ? +anio : undefined,
      mes:  mes  ? +mes  : undefined,
      category,
    });
  }
}
