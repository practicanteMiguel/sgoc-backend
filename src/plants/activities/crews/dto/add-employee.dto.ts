import { IsUUID } from 'class-validator';

export class AddEmployeeDto {
  @IsUUID()
  employee_id!: string;
}
