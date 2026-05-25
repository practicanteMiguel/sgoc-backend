import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Field } from './entities/field.entity';
import { FieldLugar } from './entities/field-lugar.entity';
import { User } from '../../users/entities/user.entity';
import { Solicitud } from '../../consumables/entities/solicitud.entity';
import { FieldsService } from './fields.service';
import { FieldsController } from './fields.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Field, FieldLugar, User, Solicitud])],
  controllers: [FieldsController],
  providers: [FieldsService],
  exports: [FieldsService],
})
export class FieldsModule {}
