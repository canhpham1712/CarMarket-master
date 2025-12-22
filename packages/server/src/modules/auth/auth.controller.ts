import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LocalAuthGuard } from '../../common/guards/local-auth.guard';
import { GoogleAuthGuard } from '../../common/guards/google-auth.guard';
import { FacebookAuthGuard } from '../../common/guards/facebook-auth.guard';
import { AuthResponse } from './interfaces/auth-response.interface';
import { User, OAuthProvider } from '../../entities/user.entity';
import { LogAction } from '../../common/decorators/log-action.decorator';
import { LogCategory } from '../../entities/activity-log.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @LogAction({
    category: LogCategory.AUTHENTICATION,
    message: 'User Registration',
    description: 'New user registered successfully',
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @LogAction({
    category: LogCategory.AUTHENTICATION,
    message: 'User Login',
    description: 'User logged in successfully',
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: any): Promise<User> {
    return this.authService.findById(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any): Promise<User> {
    return this.authService.findById(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('session-check')
  async checkSession(@Request() req: any): Promise<{
    valid: boolean;
    requiresRefresh: boolean;
    reason?: string;
  }> {
    console.log('[AuthController] Session check requested for user:', req.user.id);
    const result = await this.authService.checkSessionValidity(
      req.user.id, 
      req.headers.authorization?.replace('Bearer ', '')
    );
    console.log('[AuthController] Session check result:', result);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(): Promise<{ message: string }> {
    // With JWT, logout is handled on the client side by removing the token
    // In a more sophisticated setup, you might maintain a blacklist of tokens
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('become-seller')
  @HttpCode(HttpStatus.OK)
  @LogAction({
    category: LogCategory.AUTHENTICATION,
    message: 'Become Seller',
    description: 'User upgraded to seller role',
  })
  async becomeSeller(@Request() req: any): Promise<AuthResponse> {
    return this.authService.becomeSeller(req.user.id);
  }

  // Google OAuth routes
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Guard initiates Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  // Temporarily removed @LogAction to debug OAuth issue
  // @LogAction({
  //   category: LogCategory.AUTHENTICATION,
  //   message: 'Google OAuth Login',
  //   description: 'User logged in via Google OAuth',
  // })
  async googleAuthCallback(@Request() req: any, @Res() res: any) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const redirectUrl = new URL(`${frontendUrl}/auth/callback`);
    
    try {
      // Check if user was authenticated by the guard
      if (!req.user) {
        // Check if there's an error in query params from Google
        const error = req.query.error;
        
        if (error) {
          // Provide more specific error messages
          let userMessage = 'OAuth authentication failed. Please try again.';
          if (error === 'access_denied') {
            userMessage = 'Authentication was cancelled. Please try again.';
          } else if (error === 'invalid_client') {
            userMessage = 'OAuth configuration error. Please contact support.';
          } else if (error === 'redirect_uri_mismatch') {
            userMessage = 'OAuth configuration error. Please contact support.';
          }
          
          redirectUrl.searchParams.set('error', 'oauth_failed');
          redirectUrl.searchParams.set('message', userMessage);
        } else {
          redirectUrl.searchParams.set('error', 'oauth_failed');
          redirectUrl.searchParams.set('message', 'OAuth authentication failed. Please try again.');
        }
        
        return res.redirect(redirectUrl.toString());
      }

      // Validate that user object has required fields
      if (!req.user.providerId || !req.user.email) {
        redirectUrl.searchParams.set('error', 'oauth_failed');
        redirectUrl.searchParams.set('message', 'Invalid OAuth user data. Please try again.');
        return res.redirect(redirectUrl.toString());
      }

      const authResponse = await this.authService.validateOAuthUser(req.user, OAuthProvider.GOOGLE);
      
      // Redirect to frontend with tokens as query params
      redirectUrl.searchParams.set('token', authResponse.accessToken);
      redirectUrl.searchParams.set('success', 'true');
      return res.redirect(redirectUrl.toString());
    } catch (error: any) {
      // Redirect to frontend with error
      redirectUrl.searchParams.set('error', 'oauth_failed');
      redirectUrl.searchParams.set('message', error?.message || 'OAuth authentication failed. Please try again.');
      return res.redirect(redirectUrl.toString());
    }
  }

  // Facebook OAuth routes
  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  async facebookAuth() {
    // Guard initiates Facebook OAuth flow
  }

  @Get('facebook/callback')
  @UseGuards(FacebookAuthGuard)
  @LogAction({
    category: LogCategory.AUTHENTICATION,
    message: 'Facebook OAuth Login',
    description: 'User logged in via Facebook OAuth',
  })
  async facebookAuthCallback(@Request() req: any, @Res() res: any) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const redirectUrl = new URL(`${frontendUrl}/auth/callback`);
    
    try {
      // Check if user was authenticated by the guard
      if (!req.user) {
        // Check if there's an error in query params from Facebook
        const error = req.query.error;
        
        if (error) {
          // Provide more specific error messages
          let userMessage = 'OAuth authentication failed. Please try again.';
          if (error === 'access_denied') {
            userMessage = 'Authentication was cancelled. Please try again.';
          } else if (error === 'invalid_client') {
            userMessage = 'OAuth configuration error. Please contact support.';
          } else if (error === 'redirect_uri_mismatch') {
            userMessage = 'OAuth configuration error. Please contact support.';
          }
          
          redirectUrl.searchParams.set('error', 'oauth_failed');
          redirectUrl.searchParams.set('message', userMessage);
        } else {
          redirectUrl.searchParams.set('error', 'oauth_failed');
          redirectUrl.searchParams.set('message', 'OAuth authentication failed. Please try again.');
        }
        
        return res.redirect(redirectUrl.toString());
      }

      // Validate that user object has required fields
      if (!req.user.providerId || !req.user.email) {
        redirectUrl.searchParams.set('error', 'oauth_failed');
        redirectUrl.searchParams.set('message', 'Invalid OAuth user data. Please try again.');
        return res.redirect(redirectUrl.toString());
      }

      const authResponse = await this.authService.validateOAuthUser(req.user, OAuthProvider.FACEBOOK);
      
      // Redirect to frontend with tokens as query params
      redirectUrl.searchParams.set('token', authResponse.accessToken);
      redirectUrl.searchParams.set('success', 'true');
      return res.redirect(redirectUrl.toString());
    } catch (error: any) {
      // Redirect to frontend with error
      redirectUrl.searchParams.set('error', 'oauth_failed');
      redirectUrl.searchParams.set('message', error?.message || 'OAuth authentication failed. Please try again.');
      return res.redirect(redirectUrl.toString());
    }
  }
}
