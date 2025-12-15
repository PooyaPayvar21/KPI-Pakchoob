import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  username!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  language?: 'FA' | 'EN';

  @IsOptional()
  @IsString()
  timezone?: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password!: string;
}

export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  oldPassword!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class AssignRoleDto {
  @IsNotEmpty()
  @IsEnum(UserRole)
  role!: UserRole;
}

export class SetAccessLevelsDto {
  @IsNotEmpty()
  accessLevels!: any;
}

export class SetPermissionsDto {
  @IsNotEmpty()
  permissions!: any;
}

export class DeactivateUserDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
