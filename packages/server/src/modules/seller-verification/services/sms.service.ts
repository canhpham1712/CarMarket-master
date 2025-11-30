import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsService {
  sendOtp(phoneNumber: string, otpCode: string): Promise<{ success: boolean; messageId?: string }>;
}

@Injectable()
export class MockSmsService implements SmsService {
  private readonly logger = new Logger(MockSmsService.name);
  private readonly smsEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.smsEnabled = this.configService.get<string>('SMS_ENABLED', 'true') === 'true';
  }

  /**
   * Mock SMS service - logs OTP to console for testing
   * In production, replace this with real SMS provider (Twilio, AWS SNS, etc.)
   */
  async sendOtp(phoneNumber: string, otpCode: string): Promise<{ success: boolean; messageId?: string }> {
    if (!this.smsEnabled) {
      this.logger.warn('SMS service is disabled. OTP will not be sent.');
      return { success: false };
    }

    // Mock implementation - log to console
    this.logger.log('='.repeat(60));
    this.logger.log('📱 MOCK SMS SERVICE - OTP VERIFICATION');
    this.logger.log('='.repeat(60));
    this.logger.log(`Phone Number: ${phoneNumber}`);
    this.logger.log(`OTP Code: ${otpCode}`);
    this.logger.log(`Expires in: 1 minute`);
    this.logger.log('='.repeat(60));
    this.logger.log('⚠️  This is a MOCK service. In production, this would send a real SMS.');
    this.logger.log('='.repeat(60));

    // Simulate async SMS sending
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      success: true,
      messageId: `mock-${Date.now()}`,
    };
  }
}

/**
 * Factory to create SMS service based on configuration
 * In the future, can add TwilioSmsService, AwsSnsService, etc.
 */
@Injectable()
export class SmsServiceFactory {
  constructor(
    private readonly configService: ConfigService,
    private readonly mockSmsService: MockSmsService,
  ) {}

  create(): SmsService {
    const provider = this.configService.get<string>('SMS_PROVIDER', 'mock').toLowerCase();

    switch (provider) {
      case 'mock':
        return this.mockSmsService;
      // Future implementations:
      // case 'twilio':
      //   return this.twilioSmsService;
      // case 'aws':
      //   return this.awsSnsService;
      default:
        this.mockSmsService['logger'].warn(
          `Unknown SMS provider: ${provider}. Using mock service.`,
        );
        return this.mockSmsService;
    }
  }
}

