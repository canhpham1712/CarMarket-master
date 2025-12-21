import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
// Removed unused AuthService import

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    configService: ConfigService,
  ) {
    let callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL')!;
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID')!;
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET')!;
    
    // Ensure callback URL includes /api prefix if not already present
    // This handles cases where the URL might be missing the /api prefix due to global prefix
    if (callbackURL && !callbackURL.includes('/api/')) {
      // Replace /auth/google/callback with /api/auth/google/callback
      callbackURL = callbackURL.replace('/auth/google/callback', '/api/auth/google/callback');
    }
    
    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    } as const);
    
    // Log configuration for debugging (without exposing secrets) - after super()
    this.logger.log(`Google OAuth configured with callback URL: ${callbackURL}`);
    this.logger.log(`Google OAuth Client ID: ${clientID ? `${clientID.substring(0, 10)}...` : 'NOT SET'}`);
    
    if (!clientID || !clientSecret) {
      this.logger.error('Google OAuth credentials are missing!');
    }
    
    if (!callbackURL) {
      this.logger.error('Google OAuth callback URL is not set!');
    }
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      // Handle case where profile might be null or undefined
      if (!profile) {
        return done(null, false);
      }

      const { id, name, emails, photos } = profile;
      
      // Validate required fields - if missing, pass false instead of undefined
      // Passport treats false differently than undefined - false explicitly denies auth
      // but won't throw UnauthorizedException if guard handles it properly
      if (!id || !emails || !emails[0] || !emails[0].value) {
        return done(null, false);
      }
      
      const user = {
        providerId: id,
        email: emails[0].value,
        firstName: name?.givenName || '',
        lastName: name?.familyName || '',
        profileImage: photos?.[0]?.value || null,
        provider: 'google',
      };

      done(null, user);
    } catch (error) {
      // Log error for debugging but don't throw
      this.logger.error('Validation error:', error);
      // Pass false instead of undefined to prevent Passport from throwing
      done(null, false);
    }
  }
}
