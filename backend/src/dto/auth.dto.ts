import {
  IsNotEmpty,
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
} from "class-validator";

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  username!: string;

  @IsString()
  password?: string;
}

export class ForgotPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}

export class ResetPasswordAuthDto {
  @IsNotEmpty()
  @IsString()
  token!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  new_password!: string;
}

export class ChangePasswordAuthDto {
  @IsString()
  @IsOptional()
  old_password?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  new_password!: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refresh_token!: string;
}

export class LogoutDto {
  session_id?: string;
}
