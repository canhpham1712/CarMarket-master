import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SellerVerificationController } from './seller-verification.controller';
import { SellerVerificationService } from './seller-verification.service';
import { SellerVerification } from '../../entities/seller-verification.entity';
import { SellerVerificationDocument } from '../../entities/seller-verification-document.entity';
import { PhoneVerificationOtp } from '../../entities/phone-verification-otp.entity';
import { User } from '../../entities/user.entity';
import { RbacModule } from '../rbac/rbac.module';
import { OtpService } from './services/otp.service';
import { MockSmsService, SmsServiceFactory } from './services/sms.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SellerVerification,
      SellerVerificationDocument,
      PhoneVerificationOtp,
      User, // Added to access user data for hybrid approach
    ]),
    RbacModule,
  ],
  controllers: [SellerVerificationController],
  providers: [
    SellerVerificationService,
    OtpService,
    MockSmsService,
    SmsServiceFactory,
    {
      provide: 'SMS_SERVICE',
      useFactory: (factory: SmsServiceFactory) => factory.create(),
      inject: [SmsServiceFactory],
    },
  ],
  exports: [SellerVerificationService, OtpService],
})
export class SellerVerificationModule {}

