import {
  Controller,
  Post,
  Body,
  Req,
  Headers,
  HttpCode,
  UnauthorizedException,
  Get,
  UseGuards,
  HttpException,
} from "@nestjs/common";
import { AuthService } from "../services/auth.service";
import {
  LoginDto,
  ChangePasswordAuthDto,
  RefreshTokenDto,
  LogoutDto,
} from "../dto/auth.dto";
import { JwtService } from "@nestjs/jwt";
import { AuthGuard } from "@nestjs/passport";

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService
  ) {}
  private readonly rateLimits = new Map<
    string,
    { count: number; resetAt: number }
  >();

  private checkRateLimit(
    ip: string,
    key: string,
    max: number,
    windowMs: number
  ) {
    const k = `${key}:${ip}`;
    const now = Date.now();
    const entry = this.rateLimits.get(k);
    if (!entry || now > entry.resetAt) {
      this.rateLimits.set(k, { count: 1, resetAt: now + windowMs });
      return;
    }
    entry.count += 1;
    if (entry.count > max) {
      throw new HttpException("Too many requests, please try again later", 429);
    }
    this.rateLimits.set(k, entry);
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const ip = req?.ip || "";
    const ua = req?.headers?.["user-agent"] || "";
    this.checkRateLimit(ip || "unknown", "auth_login", 10, 60 * 1000);
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password
    );
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.authService.login(user, ip, ua);
  }

  @Post("change-password")
  async changePassword(
    @Body() dto: ChangePasswordAuthDto,
    @Headers() headers: Record<string, string>
  ) {
    const authHeader = headers["authorization"] || headers["Authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing authorization token");
    }
    const token = authHeader.replace(/^Bearer\s+/, "");
    let userId: string;
    try {
      const decoded: any = this.jwtService.verify(token);
      userId = decoded?.sub;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
    return this.authService.changePassword(
      userId,
      dto.old_password,
      dto.new_password
    );
  }

  @Post("refresh-token")
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refresh_token);
  }

  @Post("logout")
  async logout(
    @Body() dto: LogoutDto,
    @Headers() headers: Record<string, string>
  ) {
    const authHeader = headers["authorization"] || headers["Authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing authorization token");
    }
    const token = authHeader.replace(/^Bearer\s+/, "");
    return this.authService.logoutByToken(token, dto.session_id);
  }

  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  async me(@Req() req: any) {
    const user = req.user;
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      mustResetPassword: !!user.mustChangePassword,
    };
  }
}
