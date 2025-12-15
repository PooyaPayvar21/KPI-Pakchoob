import "reflect-metadata";
import * as dotenv from "dotenv";
import { DataSource } from "typeorm";
import { KPIDefinition, KPIStatus } from "../entities/kpi.entity";

dotenv.config();

const ds = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  username: process.env.DATABASE_USER || "postgres",
  password: process.env.DATABASE_PASSWORD || "6331",
  database: process.env.DATABASE_NAME || "kpi_db",
  entities: [KPIDefinition],
  synchronize: false,
});

async function run() {
  await ds.initialize();
  const repo = ds.getRepository(KPIDefinition);
  await repo
    .createQueryBuilder()
    .update(KPIDefinition)
    .set({ status: KPIStatus.SUBMITTED })
    .execute();
  await ds.destroy();
}

run().catch(async () => {
  try {
    await ds.destroy();
  } catch {}
  process.exit(1);
});
