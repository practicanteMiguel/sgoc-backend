import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { Field } from '../fields/entities/field.entity';
import { User } from '../../users/entities/user.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
    @InjectRepository(Field)    private fieldRepo: Repository<Field>,
  ) {}

  async findAll(page = 1, limit = 20, fieldId?: string) {
    const qb = this.employeeRepo
      .createQueryBuilder('emp')
      .leftJoinAndSelect('emp.field', 'field')
      .where('emp.deleted_at IS NULL')
      .orderBy('emp.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (fieldId) qb.andWhere('field.id = :fieldId', { fieldId });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const emp = await this.employeeRepo.findOne({
      where: { id },
      relations: ['field', 'created_by'],
    });
    if (!emp) throw new NotFoundException('Empleado no encontrado');
    return emp;
  }

  async create(dto: CreateEmployeeDto, currentUser: User) {
    const { field_id, ...fields } = dto;

    const existing = await this.employeeRepo.findOne({
      where: { identification_number: dto.identification_number },
      withDeleted: true,
    });
    if (existing) throw new ConflictException(`Ya existe un empleado con el numero de documento ${dto.identification_number}`);

    const emp = this.employeeRepo.create({
      ...fields,
      aux_trans:  fields.aux_trans ?? false,
      aux_hab:    fields.aux_hab   ?? false,
      aux_ali:    fields.aux_ali   ?? false,
      created_by: currentUser,
    });

    if (field_id) {
      const field = await this.fieldRepo.findOne({ where: { id: field_id } });
      if (!field) throw new NotFoundException('Planta no encontrada');
      emp.field = field;
    }

    return this.employeeRepo.save(emp);
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const emp = await this.findOne(id);
    Object.assign(emp, dto);
    return this.employeeRepo.save(emp);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.employeeRepo.softDelete(id);
    return { message: 'Empleado eliminado correctamente' };
  }

  async assignToField(employeeId: string, fieldId: string) {
    const emp   = await this.findOne(employeeId);
    const field = await this.fieldRepo.findOne({ where: { id: fieldId } });
    if (!field) throw new NotFoundException('Planta no encontrada');

    if (emp.field?.id === fieldId)
      throw new BadRequestException('El empleado ya está asignado a esta planta');

    emp.field = field;
    await this.employeeRepo.save(emp);
    return { message: `Empleado asignado a la planta ${field.name}` };
  }

  async changeField(employeeId: string, newFieldId: string) {
    const emp      = await this.findOne(employeeId);
    const newField = await this.fieldRepo.findOne({ where: { id: newFieldId } });
    if (!newField) throw new NotFoundException('Planta no encontrada');

    const prevField = emp.field?.name ?? 'ninguna';
    emp.field = newField;
    await this.employeeRepo.save(emp);

    return {
      message:    `Empleado movido de "${prevField}" a "${newField.name}"`,
      prev_field: prevField,
      new_field:  newField.name,
    };
  }

  async removeFromField(employeeId: string) {
    const emp = await this.findOne(employeeId);
    if (!emp.field)
      throw new BadRequestException('El empleado no está asignado a ninguna planta');

    const fieldName = emp.field.name;
    emp.field       = null as any;
    await this.employeeRepo.save(emp);
    return { message: `Empleado removido de la planta "${fieldName}"` };
  }
}
