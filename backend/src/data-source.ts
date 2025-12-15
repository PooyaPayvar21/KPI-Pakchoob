import "reflect-metadata";
import * as dotenv from "dotenv";
import { DataSource } from "typeorm";
import { User } from "./entities/user.entity";
import { Role } from "./entities/role.entity";
import { Permission } from "./entities/permission.entity";
import { UserSession } from "./entities/userSession.entity";
import { ApprovalChain } from "./entities/approvalChain.entity";
import {
  KPIDefinition,
  KPIApprovalHistory,
  KPIPeriodSummary,
} from "./entities/kpi.entity";
import { UserImportLog } from "./entities/userImportLog.entity";
import { AuditLog } from "./entities/auditLog.entity";

dotenv.config();

const host = process.env.DATABASE_HOST || "localhost";
const port = parseInt(process.env.DATABASE_PORT || "5432", 10);
const username = process.env.DATABASE_USER || "postgres";
const password = process.env.DATABASE_PASSWORD || "6331";
const database = process.env.DATABASE_NAME || "kpi_db";

const AppDataSource = new DataSource({
  type: "postgres",
  host,
  port,
  username,
  password,
  database,
  entities: [
    User,
    Role,
    Permission,
    UserSession,
    ApprovalChain,
    KPIDefinition,
    KPIApprovalHistory,
    KPIPeriodSummary,
    UserImportLog,
    AuditLog,
  ],
  migrations: ["src/migrations/*.ts"],
  synchronize: false,
  logging: true,
});

export default AppDataSource;
