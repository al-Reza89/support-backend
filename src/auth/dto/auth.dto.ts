import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AuthDto {
  @IsNotEmpty()
  @IsString()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

export class AuthDtoSignUp extends AuthDto {
  @IsNotEmpty()
  @IsString()
  confirmPassword: string;

  @IsOptional()
  @IsString()
  firstName?: string;
}
