import { IsString, MinLength } from 'class-validator';

export class CreateCrewDto {
  @IsString()
  @MinLength(2)
  name!: string;
}
