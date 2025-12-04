import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Try to authenticate, but don't throw error if token is missing
    const result = super.canActivate(context);
    
    if (result instanceof Promise) {
      return result.catch(() => {
        // If authentication fails, allow request to continue without user
        return true;
      });
    }
    
    if (result instanceof Observable) {
      return result.pipe(
        catchError(() => {
          // If authentication fails, allow request to continue without user
          return of(true);
        }),
      );
    }
    
    // If it's a boolean, return as is
    return result;
  }

  override handleRequest(_err: any, user: any) {
    // Return user if authenticated, otherwise return undefined
    return user || undefined;
  }
}

