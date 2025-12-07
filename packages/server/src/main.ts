import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { LoggingExceptionFilter } from './common/filters/logging-exception.filter';
import { LogsService } from './modules/logs/logs.service';
import { MonitoringInterceptor } from './modules/monitoring/monitoring.interceptor';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  // 1. Lấy BACKEND_URL ngay từ đầu để dùng cho Swagger và Log
  // Nếu không có biến môi trường thì fallback về localhost
  const backendUrl = configService.get<string>('BACKEND_URL', `http://localhost:${port}`);
  
  // Serve static files for uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // 1. Cấu hình CORS linh hoạt hơn
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  
  // Mặc định luôn cho phép localhost để dev
  const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000'];
  
  // Nếu có biến môi trường FRONTEND_URL, thêm nó vào danh sách cho phép
  const allowedOrigins = frontendUrl 
    ? [...defaultOrigins, frontendUrl, 'https://carmarket-six.vercel.app'] // Thêm cứng domain vercel để chắc chắn
    : defaultOrigins;
  
  console.log('🌍 CORS Allowed Origins:', allowedOrigins);
  
  app.enableCors({
    origin: allowedOrigins,
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

  // Global monitoring interceptor
  const monitoringInterceptor = app.get(MonitoringInterceptor);
  app.useGlobalInterceptors(monitoringInterceptor);

  // Global exception filter
  app.useGlobalFilters(new LoggingExceptionFilter(logsService));

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CarMarket API')
    .setDescription('API documentation and live testing')
    .setVersion('1.0')
    .addBearerAuth()
    // 2. Thêm server URL vào Swagger để nút "Try it out" hoạt động đúng trên Prod
    .addServer(backendUrl)
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  //const port = configService.get<number>('PORT', 3000);

  app.enableShutdownHooks();

  // Start the NestJS application
  await app.listen(port);
  
  // console.log(`🚀 Server running on http://localhost:${port}`);
  // console.log(`📘 Swagger docs on http://localhost:${port}/api/docs`);
  console.log(`🚀 Server running on ${backendUrl}`);
  console.log(`📘 Swagger docs on ${backendUrl}/api/docs`);
  console.log(`🔌 Socket.IO server running on /chat namespace`);
}
void bootstrap();
