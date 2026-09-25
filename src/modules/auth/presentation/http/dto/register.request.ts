import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterRequest {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(32)
  password!: string;
}
