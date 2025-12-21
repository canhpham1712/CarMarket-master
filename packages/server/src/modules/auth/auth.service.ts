import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, OAuthProvider } from '../../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthResponse } from './interfaces/auth-response.interface';
import { PermissionService } from '../rbac/permission.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly permissionService: PermissionService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, firstName, lastName, phoneNumber, wantsToSell } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const userData = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      ...(phoneNumber ? { phoneNumber } : {}),
    } as const;

    const user = this.userRepository.create(userData);

    const savedUser = await this.userRepository.save(user);

    // Assign default 'buyer' role to new user
    await this.assignDefaultRole(savedUser.id);

    // If user wants to sell, also assign seller role
    if (wantsToSell === true) {
      await this.assignSellerRole(savedUser.id);
    }

    // Get RBAC roles and permissions for JWT payload
    const userRoles = await this.permissionService.getUserRoles(savedUser.id);
    const roleNames = userRoles.map(r => r.name);
    const userPermissions = await this.permissionService.getUserPermissions(savedUser.id);
    const permissionNames = userPermissions.map(p => p.name);

    // Generate JWT token
    const payload: JwtPayload = {
      sub: savedUser.id,
      email: savedUser.email,
      roles: roleNames, // RBAC roles
      permissions: permissionNames, // RBAC permissions
    };

    const accessToken = this.jwtService.sign(payload);

    // Remove password from response
    delete savedUser.password;

    return {
      user: savedUser,
      accessToken,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get RBAC roles and permissions for JWT payload
    const userRoles = await this.permissionService.getUserRoles(user.id);
    const roleNames = userRoles.map(r => r.name);
    const userPermissions = await this.permissionService.getUserPermissions(user.id);
    const permissionNames = userPermissions.map(p => p.name);

    // Generate JWT token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: roleNames, // RBAC roles
      permissions: permissionNames, // RBAC permissions
    };

    const accessToken = this.jwtService.sign(payload);

    // Remove password from response
    delete user.password;

    return {
      user,
      accessToken,
    };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (
      user &&
      user.password &&
      (await bcrypt.compare(password, user.password))
    ) {
      delete user.password;
      return user;
    }

    return null;
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      // Don't reveal whether the email exists or not
      return {
        message:
          'If your email is registered, you will receive a password reset link',
      };
    }

    // Generate reset token
    const resetToken = this.generateResetToken();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // Token expires in 1 hour

    // Save reset token to user
    await this.userRepository.update(user.id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    });

    // TODO: Send email with reset token
    // For now, we'll just log it (in production, implement email service)

    return {
      message:
        'If your email is registered, you will receive a password reset link',
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.userRepository.findOne({
      where: {
        passwordResetToken: token,
      },
    });

    if (
      !user ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password and clear reset token
    await this.userRepository.update(user.id, {
      password: hashedPassword,
      passwordResetToken: null as any,
      passwordResetExpires: null as any,
    });

    return { message: 'Password has been reset successfully' };
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    delete user.password;
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  async validateOAuthUser(profile: any, provider: OAuthProvider): Promise<AuthResponse> {
    const { providerId, email, firstName, lastName, profileImage } = profile;

    // Check if user exists with this provider
    // Use query builder to explicitly reference the database column names (provider_id)
    let user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.provider_id = :providerId', { providerId })
      .andWhere('user.provider = :provider', { provider })
      .getOne();

    if (!user) {
      // Check if user exists with this email but different provider
      const existingUser = await this.userRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        // Link OAuth account to existing user
        existingUser.providerId = providerId;
        existingUser.provider = provider;
        existingUser.isActive = true; // Ensure user is active when linking OAuth
        existingUser.isEmailVerified = true; // OAuth users are considered email verified
        if (profileImage && !existingUser.profileImage) {
          existingUser.profileImage = profileImage;
        }
        user = await this.userRepository.save(existingUser);
      } else {
        // Create new user with random password (OAuth users don't use this)
        const randomPassword = this.generateRandomPassword();
        const hashedPassword = await bcrypt.hash(randomPassword, 12);
        
        user = this.userRepository.create({
          providerId,
          email,
          password: hashedPassword, // Required field, but OAuth users won't use it
          firstName,
          lastName,
          profileImage,
          provider,
          isActive: true,
          isEmailVerified: true, // OAuth users are considered email verified
        });
        user = await this.userRepository.save(user);
        
        // Assign default 'buyer' role to new OAuth user
        await this.assignDefaultRole(user.id);
      }
    } else {
      // User exists with this provider, ensure they are active
      if (!user.isActive) {
        user.isActive = true;
        user.isEmailVerified = true; // OAuth users are considered email verified
        user = await this.userRepository.save(user);
      }
    }

    // Get RBAC roles and permissions for JWT payload
    const userRoles = await this.permissionService.getUserRoles(user.id);
    const roleNames = userRoles.map(r => r.name);
    const userPermissions = await this.permissionService.getUserPermissions(user.id);
    const permissionNames = userPermissions.map(p => p.name);

    // Generate JWT token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: roleNames, // RBAC roles
      permissions: permissionNames, // RBAC permissions
    };

    const accessToken = this.jwtService.sign(payload);

    // Remove password from response
    delete user.password;

    return {
      user,
      accessToken,
    };
  }

  private generateResetToken(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  private generateRandomPassword(): string {
    // Generate a secure random password that OAuth users will never use
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 32; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Assign default 'buyer' role to a new user
   */
  private async assignDefaultRole(userId: string): Promise<void> {
    try {
      // Check if user already has roles
      const existingRoles = await this.permissionService.getUserRoles(userId);
      if (existingRoles.length > 0) {
        return; // User already has roles
      }

      // Get 'buyer' role
      const allRoles = await this.permissionService.getAllRoles();
      const buyerRole = allRoles.find(r => r.name === 'buyer');

      if (!buyerRole) {
        console.warn('Buyer role not found, skipping default role assignment');
        return;
      }

      // Assign buyer role (using system user ID or null for assignedBy)
      await this.permissionService.assignRole(
        userId,
        buyerRole.id,
        userId, // Self-assigned for new users
      );
    } catch (error) {
      // Don't fail registration if role assignment fails
      console.error('Failed to assign default role to user:', error);
    }
  }

  /**
   * Assign 'seller' role to a user
   */
  private async assignSellerRole(userId: string): Promise<void> {
    try {
      // Get 'seller' role
      const allRoles = await this.permissionService.getAllRoles();
      const sellerRole = allRoles.find(r => r.name === 'seller');

      if (!sellerRole) {
        console.warn('Seller role not found, skipping seller role assignment');
        return;
      }

      // Check if user already has seller role
      const existingRoles = await this.permissionService.getUserRoles(userId);
      const hasSellerRole = existingRoles.some(r => r.name === 'seller');

      if (hasSellerRole) {
        return; // User already has seller role
      }

      // Assign seller role (self-assigned)
      await this.permissionService.assignRole(
        userId,
        sellerRole.id,
        userId, // Self-assigned
      );
    } catch (error) {
      // Don't fail registration if role assignment fails
      console.error('Failed to assign seller role to user:', error);
    }
  }

  /**
   * Allow user to become a seller (self-service upgrade)
   */
  async becomeSeller(userId: string): Promise<AuthResponse> {
    // Check if user exists
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Assign seller role
    await this.assignSellerRole(userId);

    // Get updated RBAC roles and permissions for JWT payload
    const userRoles = await this.permissionService.getUserRoles(userId);
    const roleNames = userRoles.map(r => r.name);
    const userPermissions = await this.permissionService.getUserPermissions(userId);
    const permissionNames = userPermissions.map(p => p.name);

    // Generate new JWT token with updated roles/permissions
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: roleNames, // RBAC roles
      permissions: permissionNames, // RBAC permissions
    };

    const accessToken = this.jwtService.sign(payload);

    // Remove password from response
    delete user.password;

    return {
      user,
      accessToken,
    };
  }

  /**
   * Check if user session is still valid by comparing JWT roles with database roles
   */
  async checkSessionValidity(
    userId: string,
    token?: string,
  ): Promise<{
    valid: boolean;
    requiresRefresh: boolean;
    reason?: string;
  }> {
    try {
      // Get current roles from database
      const dbRoles = await this.permissionService.getUserRoles(userId);
      const dbRoleNames = dbRoles.map((r: any) => r.name).sort();

      // Get roles from JWT token if provided
      if (token) {
        const payload = this.jwtService.decode(token) as any;
        const jwtRoleNames = (payload?.roles || []).sort();

        // Compare roles
        const rolesMatch =
          dbRoleNames.length === jwtRoleNames.length &&
          dbRoleNames.every((role, index) => role === jwtRoleNames[index]);

        if (!rolesMatch) {
          return {
            valid: false,
            requiresRefresh: true,
            reason: 'Your roles have changed. Please login again to receive updated permissions.',
          };
        }
      }

      return {
        valid: true,
        requiresRefresh: false,
      };
    } catch (error: any) {
      return {
        valid: false,
        requiresRefresh: true,
        reason: 'Unable to verify session. Please login again.',
      };
    }
  }
}
