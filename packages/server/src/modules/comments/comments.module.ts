import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CommentsGateway } from './comments.gateway';
import { WsJwtGuard } from '../chat/guards/ws-jwt.guard';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { ListingComment } from '../../entities/listing-comment.entity';
import { CommentReaction } from '../../entities/comment-reaction.entity';
import { CommentReport } from '../../entities/comment-report.entity';
import { ListingDetail } from '../../entities/listing-detail.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ListingComment,
      CommentReaction,
      CommentReport,
      ListingDetail,
      User,
    ]),
    AuthModule,
    RbacModule, // Import RbacModule to use RolesGuard
  ],
  controllers: [CommentsController],
  providers: [CommentsService, CommentsGateway, WsJwtGuard],
  exports: [CommentsService, CommentsGateway],
})
export class CommentsModule {}
