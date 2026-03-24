import { IsString } from 'class-validator';
export class CreateRoleDto {
    @IsString() name!: string;
    @IsString() slug!: string;
    description?: string;
}
