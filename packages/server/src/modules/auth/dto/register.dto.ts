import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  Matches,
  ValidateIf,
  IsBoolean,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number or special character',
  })
  password!: string;

  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  firstName!: string;

  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  lastName!: string;

  @IsOptional()
  @ValidateIf((o) => o.phoneNumber !== undefined && o.phoneNumber !== '')
  @IsString({ message: 'Phone number must be a string' })
  @Matches(/^[\+]?[0-9][\d]{8,14}$/, {
    message: 'Please provide a valid phone number',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsBoolean({ message: 'wantsToSell must be a boolean' })
  wantsToSell?: boolean;
}
