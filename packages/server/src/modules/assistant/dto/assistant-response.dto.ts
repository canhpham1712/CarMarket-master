export enum UserIntent {
  CAR_SPECS = 'car_specs',
  CAR_LISTING = 'car_listing',
  FAQ = 'faq',
  CAR_COMPARE = 'car_compare',
  USER_INFO = 'user_info',
}

export interface MessageAction {
  label: string;
  action: string;
  data?: any;
}

export interface SuggestionChip {
  id: string;
  label: string;
  query: string;
  icon?: string;
}

export class AssistantResponseDto {
  intent!: UserIntent | null;
  message!: string;
  conversationId?: string;
  data?: any;
  suggestions?: SuggestionChip[];
  actions?: MessageAction[];
  error?: {
    code: string;
    message: string;
    details?: string;
    partialData?: {
      conversationId?: string;
      userMessageId?: string;
    };
  };
}

