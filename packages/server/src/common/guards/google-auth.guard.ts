import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  // Override to prevent exceptions from being thrown
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    try {
      // Try to authenticate
      const result = await super.canActivate(context) as boolean;
      return result;
    } catch (error: any) {
      // Log the error for debugging
      this.logger.error('Google OAuth authentication failed:', error?.message || error);
      
      // If authentication fails, set user to null and allow request to proceed
      // This allows the controller to handle the error gracefully
      request.user = null;
      return true; // Always return true to allow request to proceed to controller
    }
  }

  // Override handleRequest to always allow request to proceed
  // This is called by Passport after strategy validation
  override handleRequest(err: any, user: any, info: any, _context: ExecutionContext) {
    // If there's an error or no user, log it but don't throw
    if (err) {
      // Log detailed error information
      const errorDetails: any = {
        message: err.message,
        code: err.code,
        status: err.status,
        uri: err.uri,
      };
      
      // Add stack trace in development
      if (process.env.NODE_ENV === 'development') {
        errorDetails.stack = err.stack;
      }
      
      this.logger.error('Google OAuth error in handleRequest:', errorDetails);
      
      // Log specific error messages for common issues
      if (err.code === 'invalid_client') {
        this.logger.error(
          'Invalid client error - Check: 1) Client ID/Secret are correct, 2) Callback URL matches Google Console config'
        );
      } else if (err.code === 'redirect_uri_mismatch') {
        this.logger.error(
          'Redirect URI mismatch - Callback URL in code does not match Google Console configuration'
        );
      }
      
      return null;
    }
    
    if (!user) {
      this.logger.warn('Google OAuth validation returned no user', info ? { info } : '');
      return null;
    }
    
    // Return user if validation succeeded
    return user;
  }
}
