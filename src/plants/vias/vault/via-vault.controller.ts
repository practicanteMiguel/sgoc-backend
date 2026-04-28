import {
  Controller, Get, Post, Param, Body,
  UseInterceptors, UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ViaVaultService } from './via-vault.service';

class UploadCaptureMetaDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  lat?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  lng?: number;

  @IsString()
  @IsOptional()
  via_name?: string;

  @IsString()
  @IsOptional()
  comment?: string;
}

@ApiTags('Vias - Bóveda de Capturas')
@Controller('via-vault')
export class ViaVaultController {
  constructor(private readonly service: ViaVaultService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Obtener bóveda del mes y sus capturas por token' })
  getVault(@Param('token') token: string) {
    return this.service.getByToken(token);
  }

  @Post(':token/captures')
  @ApiOperation({ summary: 'Subir capturas a la bóveda (sin autenticación). Hasta 20 imágenes. Se envían lat/lng como campos de formulario.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 20))
  uploadCaptures(
    @Param('token') token: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() meta: UploadCaptureMetaDto,
  ) {
    return this.service.uploadCaptures(token, files ?? [], {
      lat:      meta.lat      ? +meta.lat      : undefined,
      lng:      meta.lng      ? +meta.lng      : undefined,
      via_name: meta.via_name,
      comment:  meta.comment,
    });
  }
}
