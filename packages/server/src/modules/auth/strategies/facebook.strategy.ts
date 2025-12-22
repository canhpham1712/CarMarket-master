import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    configService: ConfigService,
  ) {
    let callbackURL = configService.get<string>('FACEBOOK_CALLBACK_URL')!;
    const clientID = configService.get<string>('FACEBOOK_APP_ID')!;
    const clientSecret = configService.get<string>('FACEBOOK_APP_SECRET')!;
    
    // Ensure callback URL includes /api prefix if not already present
    // This handles cases where the URL might be missing the /api prefix due to global prefix
    if (callbackURL && !callbackURL.includes('/api/')) {
      // Replace /auth/facebook/callback with /api/auth/facebook/callback
      callbackURL = callbackURL.replace('/auth/facebook/callback', '/api/auth/facebook/callback');
    }
    
    super({
      clientID,
      clientSecret,
      callbackURL,
      profileFields: ['id', 'emails', 'name', 'picture'],
    } as const);
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void,
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
        firstName: name?.givenName || name?.familyName?.split(' ')[0] || '',
        lastName: name?.familyName || name?.givenName?.split(' ')[1] || '',
        profileImage: photos?.[0]?.value || null,
        provider: 'facebook',
      };

      done(null, user);
    } catch (error) {
      // Pass false instead of undefined to prevent Passport from throwing
      done(null, false);
    }
  }
}
