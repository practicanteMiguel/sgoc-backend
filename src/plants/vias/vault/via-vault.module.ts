import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ViaCaptureGroup } from '../entities/via-capture-group.entity';
import { ViaCapture } from '../entities/via-capture.entity';
import { ViaMonthlyLog } from '../entities/via-monthly-log.entity';
import { CloudinaryService } from '../../activities/cloudinary/cloudinary.service';
import { ViaVaultService } from './via-vault.service';
import { ViaVaultController } from './via-vault.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ViaCaptureGroup, ViaCapture, ViaMonthlyLog])],
  controllers: [ViaVaultController],
  providers: [ViaVaultService, CloudinaryService],
  exports: [TypeOrmModule, ViaVaultService],
})
export class ViaVaultModule {}
