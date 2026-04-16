import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Crew } from './entities/crew.entity';
import { Field } from '../../fields/entities/field.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { User } from '../../../users/entities/user.entity';
import { CreateCrewDto } from './dto/create-crew.dto';

@Injectable()
export class CrewsService {
  constructor(
    @InjectRepository(Crew)     private crewRepo: Repository<Crew>,
    @InjectRepository(Field)    private fieldRepo: Repository<Field>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
  ) {}

  async create(dto: CreateCrewDto, currentUser: User) {
    if (!currentUser.field_id)
      throw new BadRequestException('El usuario no tiene un campo asignado');

    const field = await this.fieldRepo.findOne({ where: { id: currentUser.field_id } });
    if (!field) throw new NotFoundException('Campo no encontrado');

    const crew = this.crewRepo.create({
      name:       dto.name,
      field,
      employees:  [],
      created_by: currentUser,
    });

    return this.crewRepo.save(crew);
  }

  async findAll(page = 1, limit = 20, fieldId?: string) {
    const qb = this.crewRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.field', 'field')
      .leftJoinAndSelect('c.employees', 'employees')
      .where('c.deleted_at IS NULL')
      .orderBy('c.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (fieldId) qb.andWhere('field.id = :fieldId', { fieldId });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const crew = await this.crewRepo.findOne({
      where: { id },
      relations: ['field', 'employees', 'created_by'],
    });
    if (!crew) throw new NotFoundException('Cuadrilla no encontrada');
    return crew;
  }

  async update(id: string, dto: CreateCrewDto) {
    const crew = await this.findOne(id);
    crew.name = dto.name;
    return this.crewRepo.save(crew);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.crewRepo.softDelete(id);
    return { message: 'Cuadrilla eliminada correctamente' };
  }

  async addEmployee(crewId: string, employeeId: string) {
    const crew = await this.findOne(crewId);

    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
      relations: ['field'],
    });
    if (!employee) throw new NotFoundException('Empleado no encontrado');

    if (employee.field?.id !== crew.field.id)
      throw new BadRequestException('Empleado no pertenece a la planta de esta cuadrilla');

    if (crew.employees.some((e) => e.id === employeeId))
      throw new ConflictException('Empleado ya esta en esta cuadrilla');

    crew.employees.push(employee);
    return this.crewRepo.save(crew);
  }

  async removeEmployee(crewId: string, employeeId: string) {
    const crew = await this.findOne(crewId);

    const index = crew.employees.findIndex((e) => e.id === employeeId);
    if (index === -1)
      throw new NotFoundException('Employee is not in this crew');

    crew.employees.splice(index, 1);
    return this.crewRepo.save(crew);
  }
}
