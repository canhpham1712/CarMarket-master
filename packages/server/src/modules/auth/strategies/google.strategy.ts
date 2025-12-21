import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
// Removed unused AuthService import

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
  ) {
    let callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL')!;
    
    // Ensure callback URL includes /api prefix if not already present
    // This handles cases where the URL might be missing the /api prefix due to global prefix
    if (callbackURL && !callbackURL.includes('/api/')) {
      // Replace /auth/google/callback with /api/auth/google/callback
      callbackURL = callbackURL.replace('/auth/google/callback', '/api/auth/google/callback');
    }
    
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')!,
      callbackURL,
      scope: ['email', 'profile'],
    } as const);
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    
    const user = {
      providerId: id,
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      profileImage: photos[0]?.value,
      provider: 'google',
    };

    done(null, user);
  }
}
