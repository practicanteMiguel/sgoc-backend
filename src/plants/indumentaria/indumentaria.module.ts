import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Indumentaria } from './entities/indumentaria.entity';
import { EntregaIndumentaria } from './entities/entrega-indumentaria.entity';
import { Employee } from '../employees/entities/employee.entity';
import { User } from '../../users/entities/user.entity';
import { IndumentariaService } from './indumentaria.service';
import { IndumentariaController } from './indumentaria.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Indumentaria, EntregaIndumentaria, Employee, User]),
  ],
  controllers: [IndumentariaController],
  providers: [IndumentariaService],
  exports: [TypeOrmModule, IndumentariaService],
})
export class IndumentariaModule {}
