import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { ModulesModule } from './modules/modules.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MailModule } from './mail/mail.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { PlantsModule } from './plants/plants.module';
import { ComplianceModule } from './compliance/compliance.module';
import { VoiceLogsModule } from './voice-logs/voice-logs.module';
import { ConsumablesModule } from './consumables/consumables.module';

@Module({
  imports: [
    // Configuración de variables de entorno — global para todos los módulos
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),

    // Conexión a PostgreSQL con TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        ssl: config.get('NODE_ENV') === 'production' ? { rejectUnauthorized: true } : false,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: ['development', 'test'].includes(config.get('NODE_ENV') ?? ''),
        logging: false,
      }),
    }),

    // Rate limiting: 60 req/min global; ajustable por THROTTLE_LIMIT en env
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{
        ttl: 60000,
        limit: parseInt(config.get('THROTTLE_LIMIT') ?? '60'),
      }],
    }),

    ScheduleModule.forRoot(),

    // Módulos de la aplicación
    AuthModule,
    UsersModule,
    RolesModule,
    ModulesModule,
    AuditModule,
    NotificationsModule,
    MailModule,
    PlantsModule,
    ComplianceModule,
    VoiceLogsModule,
    ConsumablesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}