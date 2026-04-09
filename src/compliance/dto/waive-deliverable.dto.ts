import { IsString, MinLength } from 'class-validator';

export class WaiveDeliverableDto {
  // Obligatorio para tener trazabilidad de por que no aplica ese mes
  @IsString()
  @MinLength(10, { message: 'La razon debe tener al menos 10 caracteres' })
  reason!: string;
}
