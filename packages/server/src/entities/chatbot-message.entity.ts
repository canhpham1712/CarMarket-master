import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ChatbotConversation } from './chatbot-conversation.entity';

export enum ChatbotMessageSender {
  USER = 'user',
  ASSISTANT = 'assistant',
}

@Entity('chatbot_messages')
export class ChatbotMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  content!: string;

  @Column({
    type: 'enum',
    enum: ChatbotMessageSender,
    default: ChatbotMessageSender.USER,
  })
  sender!: ChatbotMessageSender;

  @CreateDateColumn()
  createdAt!: Date;

  // Relationships
  @ManyToOne(() => ChatbotConversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation!: ChatbotConversation;

  @Column({ type: 'uuid' })
  conversationId!: string;
}

