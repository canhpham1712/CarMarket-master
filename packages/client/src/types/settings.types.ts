export interface UserSettings {
  id: string;
  userId: string;
  settings: SettingsData;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsData {
  profile?: ProfileSettings;
  security?: SecuritySettings;
  notifications?: NotificationSettings;
  privacy?: PrivacySettings;
  language?: LanguageSettings;
  buyer?: BuyerSettings;
  seller?: SellerSettings;
  moderator?: ModeratorSettings;
  admin?: AdminSettings;
  superAdmin?: SuperAdminSettings;
}

export interface ProfileSettings {
  [key: string]: any;
}

export interface SecuritySettings {
  passwordChangedAt?: string;
  oauthConnections?: {
    google: boolean;
    facebook: boolean;
  };
  loginHistory?: LoginHistoryItem[];
}

export interface LoginHistoryItem {
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}

export interface NotificationSettings {
  preferences?: Record<string, ChannelPreferences>;
  quietHours?: QuietHours | null;
}

export interface ChannelPreferences {
  inApp: boolean;
  email: boolean;
  push: boolean;
}

export interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
}

export interface PrivacySettings {
  profileVisibility?: 'public' | 'private' | 'friends';
  showEmail?: boolean;
  showPhone?: boolean;
  showListings?: boolean;
}

export interface LanguageSettings {
  locale?: 'vi' | 'en';
  timezone?: string;
  dateFormat?: string;
}

export interface BuyerSettings {
  savedSearches?: SavedSearch[];
  favoriteNotifications?: boolean;
  showPurchaseHistory?: boolean;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: Record<string, any>;
  createdAt: string;
}

export interface SellerSettings {
  autoApprove?: boolean;
  defaultListingTemplate?: Record<string, any>;
  promotionPreferences?: {
    autoPromote?: boolean;
  };
}

export interface ModeratorSettings {
  queuePreferences?: {
    itemsPerPage?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'priority';
    sortOrder?: 'ASC' | 'DESC';
  };
  autoAssignment?: boolean;
  contentFilters?: {
    keywords?: string[];
    autoModeration?: boolean;
  };
}

export interface AdminSettings {
  dashboardWidgets?: string[];
  reportSchedules?: ReportSchedule[];
  userManagement?: {
    itemsPerPage?: number;
    defaultFilters?: Record<string, any>;
  };
  listingManagement?: {
    approvalWorkflow?: 'manual' | 'auto';
    bulkModeration?: boolean;
  };
}

export interface ReportSchedule {
  id: string;
  type: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
}

export interface SuperAdminSettings {
  systemPreferences?: {
    maintenanceMode?: boolean;
  };
  auditPreferences?: {
    retentionDays?: number;
    exportFormat?: 'json' | 'csv' | 'xlsx';
  };
  databaseMaintenance?: {
    autoBackup?: boolean;
    backupSchedule?: 'daily' | 'weekly' | 'monthly';
  };
}

export interface UpdateSettingsDto {
  profile?: ProfileSettings;
  security?: SecuritySettings;
  notifications?: NotificationSettings;
  privacy?: PrivacySettings;
  language?: LanguageSettings;
  buyer?: BuyerSettings;
  seller?: SellerSettings;
  moderator?: ModeratorSettings;
  admin?: AdminSettings;
  superAdmin?: SuperAdminSettings;
}

