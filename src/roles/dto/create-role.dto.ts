import { IsString, IsOptional } from 'class-validator';
export class CreateRoleDto {
    @IsString() name!: string;
    @IsString() slug!: string;
    @IsOptional() @IsString() description?: string;
}
