import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettings } from '../../entities/user-settings.entity';
import { User } from '../../entities/user.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { PermissionService } from '../rbac/permission.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(UserSettings)
    private readonly settingsRepository: Repository<UserSettings>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * Get user settings, creating default if not exists
   */
  // Trong packages/server/src/modules/settings/settings.service.ts

  async getUserSettings(userId: string): Promise<UserSettings> {
    try {
      // 1. Thử tìm settings hiện có
      let settings = await this.settingsRepository.findOne({
        where: { userId },
      });

      // 2. Nếu chưa có, tiến hành tạo mới
      if (!settings) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
          throw new NotFoundException('User not found');
        }

        const defaultSettings = await this.getDefaultSettings(userId);
        const newSettings = this.settingsRepository.create({
          userId,
          settings: defaultSettings,
        });

        try {
          // Cố gắng lưu
          settings = await this.settingsRepository.save(newSettings);
          this.logger.log(`Created default settings for user ${userId}`);
        } catch (saveError: any) {
          // 3. XỬ LÝ LỖI TRÙNG LẶP (Race condition fix)
          // Mã lỗi 23505 là unique_violation trong PostgreSQL
          if (saveError.code === '23505') {
            this.logger.warn(`Race condition detected for user ${userId}, fetching existing settings.`);
            settings = await this.settingsRepository.findOne({ where: { userId } });
            
            if (!settings) {
              throw new Error('Unexpected error: Could not fetch settings after duplicate key violation');
            }
          } else {
            // Nếu là lỗi khác thì ném ra bình thường
            throw saveError;
          }
        }
      }

      return settings;
    } catch (error: any) {
      this.logger.error(`Error getting user settings for ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user settings
   */
  async updateUserSettings(
    userId: string,
    updateDto: UpdateSettingsDto,
  ): Promise<UserSettings> {
    let settings = await this.settingsRepository.findOne({
      where: { userId },
    });

    if (!settings) {
      // Create with defaults if not exists
      const defaultSettings = await this.getDefaultSettings(userId);
      settings = this.settingsRepository.create({
        userId,
        settings: defaultSettings,
      });
    }

    // Merge new settings with existing ones
    const currentSettings = settings.settings || {};
    const updatedSettings = {
      ...currentSettings,
      ...updateDto,
    };

    // Validate settings structure
    this.validateSettings(updatedSettings);

    settings.settings = updatedSettings;
    settings = await this.settingsRepository.save(settings);
    this.logger.log(`Updated settings for user ${userId}`);

    return settings;
  }

  /**
   * Get default settings based on user roles
   */
  async getDefaultSettings(userId: string): Promise<Record<string, any>> {
    let roleNames: string[] = [];
    try {
      const userRoles = await this.permissionService.getUserRoles(userId);
      roleNames = userRoles.map((r: any) => r.name);
    } catch (error) {
      this.logger.warn(`Failed to get user roles for ${userId}, using default buyer role: ${error}`);
      // Default to buyer role if roles can't be fetched
      roleNames = ['buyer'];
    }

    const defaults: Record<string, any> = {
      profile: {},
      security: {
        oauthConnections: {
          google: false,
          facebook: false,
        },
        loginHistory: [],
      },
      notifications: {},
      privacy: {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
        showListings: true,
      },
      language: {
        locale: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        dateFormat: 'DD/MM/YYYY',
      },
    };

    // Buyer-specific defaults
    if (roleNames.includes('buyer')) {
      defaults.buyer = {
        savedSearches: [],
        favoriteNotifications: true,
        showPurchaseHistory: true,
      };
    }

    // Seller-specific defaults
    if (roleNames.includes('seller')) {
      defaults.seller = {
        autoApprove: false,
        defaultListingTemplate: {},
        promotionPreferences: {
          autoPromote: false,
        },
      };
    }

    // Moderator-specific defaults
    if (roleNames.includes('moderator')) {
      defaults.moderator = {
        queuePreferences: {
          itemsPerPage: 20,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        },
        autoAssignment: false,
        contentFilters: {
          keywords: [],
          autoModeration: false,
        },
      };
    }

    // Admin-specific defaults
    if (roleNames.includes('admin')) {
      defaults.admin = {
        dashboardWidgets: ['stats', 'recentActivity', 'pendingListings'],
        reportSchedules: [],
        userManagement: {
          itemsPerPage: 50,
          defaultFilters: {},
        },
        listingManagement: {
          approvalWorkflow: 'manual',
          bulkModeration: false,
        },
      };
    }

    // Super Admin-specific defaults
    if (roleNames.includes('super_admin')) {
      defaults.superAdmin = {
        systemPreferences: {
          maintenanceMode: false,
        },
        auditPreferences: {
          retentionDays: 90,
          exportFormat: 'json',
        },
        databaseMaintenance: {
          autoBackup: true,
          backupSchedule: 'daily',
        },
      };
    }

    return defaults;
  }

  /**
   * Validate settings structure
   */
  private validateSettings(settings: Record<string, any>): void {
    // Validate privacy settings
    if (settings.privacy) {
      const validVisibilities = ['public', 'private', 'friends'];
      if (
        settings.privacy.profileVisibility &&
        !validVisibilities.includes(settings.privacy.profileVisibility)
      ) {
        throw new BadRequestException(
          `Invalid profileVisibility. Must be one of: ${validVisibilities.join(', ')}`,
        );
      }
    }

    // Validate language settings
    if (settings.language) {
      const validLocales = ['vi', 'en'];
      if (
        settings.language.locale &&
        !validLocales.includes(settings.language.locale)
      ) {
        throw new BadRequestException(
          `Invalid locale. Must be one of: ${validLocales.join(', ')}`,
        );
      }
    }

    // Validate moderator settings
    if (settings.moderator?.queuePreferences) {
      const validSortBy = ['createdAt', 'updatedAt', 'priority'];
      if (
        settings.moderator.queuePreferences.sortBy &&
        !validSortBy.includes(settings.moderator.queuePreferences.sortBy)
      ) {
        throw new BadRequestException(
          `Invalid sortBy. Must be one of: ${validSortBy.join(', ')}`,
        );
      }

      const validSortOrder = ['ASC', 'DESC'];
      if (
        settings.moderator.queuePreferences.sortOrder &&
        !validSortOrder.includes(settings.moderator.queuePreferences.sortOrder)
      ) {
        throw new BadRequestException(
          `Invalid sortOrder. Must be one of: ${validSortOrder.join(', ')}`,
        );
      }
    }
  }

  /**
   * Get default settings for a specific role (without user context)
   */
  async getDefaultSettingsForRole(role: string): Promise<Record<string, any>> {
    // Create a mock user ID to get defaults
    // This is used when we want to preview defaults for a role
    const defaults: Record<string, any> = {
      profile: {},
      security: {
        oauthConnections: {
          google: false,
          facebook: false,
        },
        loginHistory: [],
      },
      notifications: {},
      privacy: {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
        showListings: true,
      },
      language: {
        locale: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        dateFormat: 'DD/MM/YYYY',
      },
    };

    switch (role) {
      case 'buyer':
        defaults.buyer = {
          savedSearches: [],
          favoriteNotifications: true,
          showPurchaseHistory: true,
        };
        break;
      case 'seller':
        defaults.seller = {
          autoApprove: false,
          defaultListingTemplate: {},
          promotionPreferences: {
            autoPromote: false,
          },
        };
        break;
      case 'moderator':
        defaults.moderator = {
          queuePreferences: {
            itemsPerPage: 20,
            sortBy: 'createdAt',
            sortOrder: 'DESC',
          },
          autoAssignment: false,
          contentFilters: {
            keywords: [],
            autoModeration: false,
          },
        };
        break;
      case 'admin':
        defaults.admin = {
          dashboardWidgets: ['stats', 'recentActivity', 'pendingListings'],
          reportSchedules: [],
          userManagement: {
            itemsPerPage: 50,
            defaultFilters: {},
          },
          listingManagement: {
            approvalWorkflow: 'manual',
            bulkModeration: false,
          },
        };
        break;
      case 'super_admin':
        defaults.superAdmin = {
          systemPreferences: {
            maintenanceMode: false,
          },
          auditPreferences: {
            retentionDays: 90,
            exportFormat: 'json',
          },
          databaseMaintenance: {
            autoBackup: true,
            backupSchedule: 'daily',
          },
        };
        break;
    }

    return defaults;
  }
}

