import { IsString, IsNotEmpty, IsPhoneNumber, Length } from 'class-validator';

export class VerifyPhoneDto {
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber('VN', { message: 'Invalid Vietnamese phone number' })
  phoneNumber!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP code must be 6 digits' })
  otpCode!: string;
}

export class RequestPhoneVerificationDto {
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber('VN', { message: 'Invalid Vietnamese phone number' })
  phoneNumber!: string;
}

