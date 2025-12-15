import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { User, UserRole, UserStatus } from "../entities/user.entity";
import { UserSession } from "../entities/userSession.entity";
import { ApprovalChain } from "../entities/approvalChain.entity";
import { randomBytes } from "crypto";

@Injectable()
export class AuthService {
  private readonly PASSWORD_RESET_TOKEN_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly PASSWORD_POLICY_MIN_LENGTH = 4;

  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(UserSession)
    private sessionsRepo: Repository<UserSession>,
    @InjectRepository(ApprovalChain)
    private approvalRepo: Repository<ApprovalChain>,
    private jwtService: JwtService
  ) {}

  async validateUser(usernameOrEmail: string, pass?: string): Promise<any> {
    const user = await this.usersRepo.findOne({
      where: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });
    if (!user) return null;
    if (user.status !== UserStatus.ACTIVE) return null;

    if (!user.lastLogin) {
      user.mustChangePassword = true;
      await this.usersRepo.save(user);
      const { passwordHash, ...result } = user as any;
      return result;
    }

    if (!user.passwordHash) return null;

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      throw new UnauthorizedException(
        "Account is temporarily locked. Try again later."
      );
    }

    if (!pass || !user.passwordHash) return null;
    const match = await bcrypt.compare(pass, user.passwordHash);
    if (!match) {
      // Increment login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 min
      }
      await this.usersRepo.save(user);
      return null;
    }

    // Reset login attempts on successful auth
    user.loginAttempts = 0;
    user.lastLogin = new Date();
    await this.usersRepo.save(user);
    const { passwordHash, ...result } = user as any;
    return result;
  }

  async login(user: any, ipAddress?: string, userAgent?: string) {
    // Superadmin bypass: allow login even if approval chain is missing
    let department = 'Group';
    if (user.role !== UserRole.SUPER_ADMIN) {
      const chain = await this.approvalRepo.find({
        where: { employeeId: user.username },
        order: { sequenceLevel: 'ASC' },
        take: 1,
      });
      if (!chain || chain.length === 0) {
        throw new UnauthorizedException('No matching employeeId in approval_chains');
      }
      department = (chain[0]?.department || '').trim();
      if (!department) {
        throw new BadRequestException('Department information is missing or invalid');
      }
    }
    const payload = { username: user.username, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_REFRESH_EXPIRATION || "7d",
    });

    // Create session record
    const session = this.sessionsRepo.create({
      userId: user.id,
      sessionToken: accessToken,
      refreshToken,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      isActive: true,
    });
    await this.sessionsRepo.save(session);

    return {
      accessToken: accessToken,
      access_token: accessToken,
      refreshToken: refreshToken,
      refresh_token: refreshToken,
      expiresIn: 3600,
      expires_in: 3600,
      tokenType: "Bearer",
      token_type: "Bearer",
      mustResetPassword: !!user.mustChangePassword,
      department,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      success: true,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken);
      const user = await this.usersRepo.findOne({ where: { id: decoded.sub } });
      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException("User not found or inactive");
      }

      const session = await this.sessionsRepo.findOne({
        where: { refreshToken, userId: decoded.sub, isActive: true },
      });
      if (!session) {
        throw new UnauthorizedException("Invalid session");
      }

      // Issue new tokens
      const payload = {
        username: user.username,
        sub: user.id,
        role: user.role,
      };
      const newAccessToken = this.jwtService.sign(payload);
      const newRefreshToken = this.jwtService.sign(payload, {
        expiresIn: process.env.JWT_REFRESH_EXPIRATION || "7d",
      });

      // Rotate tokens: update session
      session.sessionToken = newAccessToken;
      session.refreshToken = newRefreshToken;
      session.lastActivity = new Date();
      await this.sessionsRepo.save(session);

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: 3600,
        token_type: "Bearer",
      };
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async logout(userId: string, sessionId?: string) {
    if (sessionId) {
      await this.sessionsRepo.update(
        { id: sessionId },
        { isActive: false, logoutAt: new Date() }
      );
    } else {
      // Logout all sessions
      await this.sessionsRepo.update(
        { userId, isActive: true },
        { isActive: false, logoutAt: new Date() }
      );
    }
    return { success: true, message: "Logged out successfully" };
  }

  async logoutByToken(token: string, sessionId?: string) {
    if (sessionId) {
      await this.sessionsRepo.update(
        { id: sessionId },
        { isActive: false, logoutAt: new Date() }
      );
      return { success: true };
    }
    const session = await this.sessionsRepo.findOne({ where: { sessionToken: token, isActive: true } });
    if (session) {
      await this.sessionsRepo.update(
        { id: session.id },
        { isActive: false, logoutAt: new Date() }
      );
    }
    return { success: true };
  }

  async forgotPassword(email: string) {
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if user exists for security
      return {
        success: true,
        message:
          "If an account with that email exists, a reset link has been sent.",
      };
    }

    // Generate reset token (32-byte hex)
    const resetToken = randomBytes(32).toString("hex");
    user.passwordResetToken = await bcrypt.hash(resetToken, 10);
    user.passwordResetExpires = new Date(
      Date.now() + this.PASSWORD_RESET_TOKEN_EXPIRATION
    );
    await this.usersRepo.save(user);

    // In production, send email with reset link
    // For now, return token (remember to change in production)
    console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);

    return {
      success: true,
      message:
        "If an account with that email exists, a reset link has been sent.",
    };
  }

  async resetPassword(token: string, newPassword: string) {
    // Validate password policy
    const validation = this.validatePasswordPolicy(newPassword);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors.join(", "));
    }

    // Find user by checking all reset tokens (expensive, could index)
    const users = await this.usersRepo.find();
    let user: User | null = null;
    for (const u of users) {
      if (
        u.passwordResetToken &&
        u.passwordResetExpires &&
        new Date() < u.passwordResetExpires
      ) {
        const match = await bcrypt.compare(token, u.passwordResetToken);
        if (match) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      throw new UnauthorizedException("Invalid or expired reset token");
    }

    // Hash new password and clear reset token
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    await this.usersRepo.save(user);

    return { success: true, message: "Password reset successfully" };
  }

  async changePassword(
    userId: string,
    oldPassword: string | undefined,
    newPassword: string
  ) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      if (!user) {
        throw new UnauthorizedException("User not found");
      }
    }

    if (user.lastLogin) {
      if (!oldPassword) {
        throw new UnauthorizedException("Current password is required");
      }
      const match = await bcrypt.compare(oldPassword, user.passwordHash!);
      if (!match) {
        throw new UnauthorizedException("Current password is incorrect");
      }
    }

    // Validate password policy
    const validation = this.validatePasswordPolicy(newPassword);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors.join(", "));
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    if (!user.lastLogin) {
      user.lastLogin = new Date();
      user.loginAttempts = 0;
    }
    await this.usersRepo.save(user);

    return { success: true, message: "Password changed successfully" };
  }

  private validatePasswordPolicy(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < this.PASSWORD_POLICY_MIN_LENGTH) {
      errors.push(
        `Password must be at least ${this.PASSWORD_POLICY_MIN_LENGTH} characters`
      );
    }
    // if (!/[A-Z]/.test(password)) {
    //   errors.push("Password must contain at least one uppercase letter");
    // }
    // if (!/[a-z]/.test(password)) {
    //   errors.push("Password must contain at least one lowercase letter");
    // }
    // if (!/[0-9]/.test(password)) {
    //   errors.push("Password must contain at least one digit");
    // }
    // if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    //   errors.push("Password must contain at least one special character");
    // }

    return { valid: errors.length === 0, errors };
  }
}
