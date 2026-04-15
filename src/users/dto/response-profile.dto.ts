export class RoleInfoDto {
  name!: string;
  slug!: string;
}

export class UserRoleProfileDto {
  role!: RoleInfoDto;
}

export class FieldInfoDto {
  name!: string;
}

export class ProfileResponseDto {
  id!: string;
  email!: string;
  first_name!: string;
  last_name!: string;
  phone!: string;
  position!: string;
  module!: string;
  field!: FieldInfoDto | null;
  user_roles!: UserRoleProfileDto[];
}
