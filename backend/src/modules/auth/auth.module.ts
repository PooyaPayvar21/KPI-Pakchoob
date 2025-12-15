import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../../entities/user.entity";
import { UserSession } from "../../entities/userSession.entity";
import { ApprovalChain } from "../../entities/approvalChain.entity";
import { AuthService } from "../../services/auth.service";
import { AuthController } from "../../controllers/auth.controller";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "changeme",
      signOptions: { expiresIn: process.env.JWT_EXPIRATION || "3600s" },
    }),
    TypeOrmModule.forFeature([User, UserSession, ApprovalChain]),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
