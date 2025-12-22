import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class FacebookAuthGuard extends AuthGuard('facebook') {
  // Override to prevent exceptions from being thrown
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    try {
      // Try to authenticate
      const result = await super.canActivate(context) as boolean;
      return result;
    } catch (error: any) {
      // If authentication fails, set user to null and allow request to proceed
      // This allows the controller to handle the error gracefully
      request.user = null;
      return true; // Always return true to allow request to proceed to controller
    }
  }

  // Override handleRequest to always allow request to proceed
  // This is called by Passport after strategy validation
  override handleRequest(err: any, user: any, _info: any, _context: ExecutionContext) {
    // If there's an error or no user, return null without throwing
    if (err) {
      return null;
    }
    
    if (!user) {
      return null;
    }
    
    // Return user if validation succeeded
    return user;
  }
}
