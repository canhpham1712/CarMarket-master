import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { Server as SocketIOServer } from 'socket.io';
import { ChatService } from './modules/chat/chat.service';
import { JwtService } from '@nestjs/jwt';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { LoggingExceptionFilter } from './common/filters/logging-exception.filter';
import { LogsService } from './modules/logs/logs.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Serve static files for uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Cache-Control',
      'Pragma',
      'Expires',
    ],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global logging interceptor
  const logsService = app.get(LogsService);
  app.useGlobalInterceptors(new LoggingInterceptor(logsService));

  // Global exception filter
  app.useGlobalFilters(new LoggingExceptionFilter(logsService));

  // Global prefix
  app.setGlobalPrefix('api');

  const port = configService.get<number>('PORT', 3000);

  app.enableShutdownHooks();

  // Start the NestJS application first
  await app.listen(port);

  // Get services from NestJS
  const httpServer = app.getHttpServer();
  const chatService = app.get(ChatService);
  const jwtService = app.get(JwtService);

  // Create Socket.IO server using the existing HTTP server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Set Socket.IO instance in ChatService
  chatService.setSocketIO(io);

  // Create chat namespace
  const chatNamespace = io.of('/chat');

  // Socket.IO connection handling
  chatNamespace.on('connection', async (socket) => {
    // Extract token from query params
    const token = socket.handshake.query.token as string;

    if (!token) {
      socket.disconnect();
      return;
    }

    // Verify JWT token
    let userId: string | null = null;
    try {
      const payload = await jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
      userId = (payload as any).sub || (payload as any).userId;
    } catch {
      socket.disconnect();
      return;
    }

    if (!userId) {
      socket.disconnect();
      return;
    }

    // Join user to their personal room for notifications
    void socket.join(`user:${userId}`);

    // Join conversation room for real-time updates
    socket.on('joinConversation', (conversationId: string) => {
      void socket.join(`conversation:${conversationId}`);
    });

    socket.on('disconnect', () => {
      // User disconnected
    });
  });
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`🔌 Socket.IO server running on /chat namespace`);
}
void bootstrap();
