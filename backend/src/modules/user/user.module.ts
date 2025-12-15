import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../../entities/user.entity";
import { UserImportLog } from "../../entities/userImportLog.entity";
import { ApprovalChain } from "../../entities/approvalChain.entity";
import { UsersService } from "../../services/users.service";
import { ImportService } from "../../services/import.service";
import { UsersController } from "../../controllers/users.controller";

@Module({
  imports: [TypeOrmModule.forFeature([User, UserImportLog, ApprovalChain])],
  providers: [UsersService, ImportService],
  controllers: [UsersController],
  exports: [UsersService, ImportService],
})
export class UserModule {}
