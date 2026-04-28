import { Module } from '@nestjs/common';
import { ViaMonthlyLogModule } from './monthly-log/via-monthly-log.module';
import { ViaVaultModule } from './vault/via-vault.module';
import { ViaReportsModule } from './reports/via-reports.module';

@Module({
  imports: [ViaMonthlyLogModule, ViaVaultModule, ViaReportsModule],
  exports: [ViaMonthlyLogModule, ViaVaultModule, ViaReportsModule],
})
export class ViasModule {}
