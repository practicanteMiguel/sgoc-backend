import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DotacionSpace } from './entities/dotacion-space.entity';
import { SolicitudDotacion } from './entities/solicitud-dotacion.entity';
import { ReposicionDotacion } from './entities/reposicion-dotacion.entity';
import { DotacionImagen } from './entities/dotacion-imagen.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Field } from '../fields/entities/field.entity';
import { CloudinaryService } from '../activities/cloudinary/cloudinary.service';
import { DotacionesService } from './dotaciones.service';
import { DotacionesController } from './dotaciones.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DotacionSpace,
      SolicitudDotacion,
      ReposicionDotacion,
      DotacionImagen,
      Employee,
      Field,
    ]),
  ],
  controllers: [DotacionesController],
  providers: [DotacionesService, CloudinaryService],
  exports: [TypeOrmModule, DotacionesService],
})
export class DotacionesModule {}
