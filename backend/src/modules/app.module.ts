import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { UserModule } from "./user/user.module";
import { AuthModule } from "./auth/auth.module";
import { SharedModule } from "./shared/shared.module";
import { KPIModule } from "./kpi.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DATABASE_HOST || "localhost",
      port: parseInt(process.env.DATABASE_PORT || "5432", 10),
      username: process.env.DATABASE_USER || "postgres",
      password: process.env.DATABASE_PASSWORD || "6331",
      database: process.env.DATABASE_NAME || "kpi_db",
      autoLoadEntities: true,
      synchronize:
        String(process.env.TYPEORM_SYNCHRONIZE || "").toLowerCase() === "true",
    }),
    UserModule,
    AuthModule,
    SharedModule,
    KPIModule,
  ],
})
export class AppModule {}
