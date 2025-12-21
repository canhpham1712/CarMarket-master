import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  override handleRequest(err: any, user: any, _info: any, _context: ExecutionContext) {
    // Always allow request to proceed, even if authentication fails
    // The callback handler will check req.user and handle errors appropriately
    if (err || !user) {
      return null;
    }
    return user;
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    // Always allow the request to proceed to the controller
    // The controller will handle authentication success/failure
    try {
      await super.canActivate(context);
    } catch (error) {
      // If authentication fails, set user to null and continue
      const request = context.switchToHttp().getRequest();
      request.user = null;
    }
    return true;
  }
}
