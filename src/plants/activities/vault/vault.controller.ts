import {
  Controller, Get, Post, Param,
  UseInterceptors, UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { VaultService } from './vault.service';

@ApiTags('Vault')
@Controller('vault')
export class VaultController {
  constructor(private readonly service: VaultService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Obtener info de la bóveda y sus imágenes por token' })
  getVault(@Param('token') token: string) {
    return this.service.getByToken(token);
  }

  @Post(':token/images')
  @ApiOperation({ summary: 'Subir imágenes a la bóveda (sin autenticación). Acepta hasta 20 archivos.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 20))
  uploadImages(
    @Param('token') token: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.service.uploadImages(token, files ?? []);
  }
}
