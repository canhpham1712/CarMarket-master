// import { Injectable } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';

// @Injectable()
// export class JwtAuthGuard extends AuthGuard('jwt') {}
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    // 1. Dùng Reflector để soi xem Class hoặc Function xử lý request này
    // có được dán cái nhãn metadata tên là 'isPublic' (IS_PUBLIC_KEY) hay không.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. Nếu tìm thấy nhãn Public (isPublic = true)
    if (isPublic) {
      return true; // Mở cửa ngay lập tức, không cần hỏi vé (Token).
    }

    // 3. Nếu không có nhãn Public
    // Gọi lại logic cũ (super.canActivate) để bắt trình Token ra kiểm tra.
    return super.canActivate(context);
    }
}