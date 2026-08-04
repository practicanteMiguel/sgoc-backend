import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Indumentaria } from './entities/indumentaria.entity';
import { EntregaIndumentaria } from './entities/entrega-indumentaria.entity';
import { EmpleadoTalla } from './entities/empleado-talla.entity';
import { Employee } from '../employees/entities/employee.entity';
import { User } from '../../users/entities/user.entity';
import { CloudinaryService } from '../activities/cloudinary/cloudinary.service';
import { IndumentariaService } from './indumentaria.service';
import { IndumentariaController } from './indumentaria.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Indumentaria,
      EntregaIndumentaria,
      EmpleadoTalla,
      Employee,
      User,
    ]),
  ],
  controllers: [IndumentariaController],
  providers: [IndumentariaService, CloudinaryService],
  exports: [TypeOrmModule, IndumentariaService],
})
export class IndumentariaModule {}
