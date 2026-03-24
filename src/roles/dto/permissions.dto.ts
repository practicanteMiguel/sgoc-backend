import { IsArray, IsString } from 'class-validator';
export class PermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}
