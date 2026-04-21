import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VaultImage } from './entities/vault-image.entity';
import { WeeklyLog } from '../logbook/entities/weekly-log.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { VaultService } from './vault.service';
import { VaultController } from './vault.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VaultImage, WeeklyLog])],
  controllers: [VaultController],
  providers: [VaultService, CloudinaryService],
  exports: [TypeOrmModule, VaultService],
})
export class VaultModule {}
