import { IsString, MinLength, IsBoolean, IsOptional } from 'class-validator';

export class CreateCrewDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsBoolean()
  is_soldadura?: boolean;
}
