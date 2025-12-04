import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  IsDateString,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  lastName?: string;

  @IsOptional()
  @ValidateIf((o) => o.phoneNumber !== undefined && o.phoneNumber !== '')
  @IsString({ message: 'Phone number must be a string' })
  @Matches(/^[\+]?[0-9][\d]{8,14}$/, {
    message: 'Please provide a valid phone number',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString({ message: 'Profile image must be a string' })
  profileImage?: string;

  @IsOptional()
  @IsString({ message: 'Bio must be a string' })
  bio?: string;

  @IsOptional()
  @IsString({ message: 'Location must be a string' })
  location?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Please provide a valid date of birth' })
  dateOfBirth?: string;
}
