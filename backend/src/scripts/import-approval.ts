import "reflect-metadata";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { Workbook } from "exceljs";
import AppDataSource from "../data-source";
import { User } from "../entities/user.entity";
import { ApprovalChain } from "../entities/approvalChain.entity";
import { UserImportLog } from "../entities/userImportLog.entity";
import { UsersService } from "../services/users.service";
import { ImportService } from "../services/import.service";

type ColumnInfo = {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: "YES" | "NO";
};

type ConstraintInfo = {
  conname: string;
  contype: "u" | "p" | "c";
  columns: string[];
};

async function verifyUsersTable(): Promise<void> {
  const cols: ColumnInfo[] = await AppDataSource.query(
    `SELECT column_name, data_type, udt_name, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'user_accounts'
     ORDER BY column_name`
  );
  const required = new Map<
    string,
    { type: string; udt?: string; nullable: boolean }
  >([
    ["id", { type: "uuid", udt: "uuid", nullable: false }],
    ["username", { type: "character varying", nullable: false }],
    ["email", { type: "character varying", nullable: false }],
    ["password_hash", { type: "character varying", nullable: true }],
    [
      "role",
      { type: "USER-DEFINED", udt: "user_accounts_role_enum", nullable: false },
    ],
    [
      "status",
      {
        type: "USER-DEFINED",
        udt: "user_accounts_status_enum",
        nullable: false,
      },
    ],
    ["email_verified", { type: "boolean", nullable: false }],
    ["created_at", { type: "timestamp without time zone", nullable: false }],
    ["updated_at", { type: "timestamp without time zone", nullable: false }],
  ]);
  const present = new Map(cols.map((c) => [c.column_name, c]));
  const missing: string[] = [];
  const typeMismatch: string[] = [];
  required.forEach((expect, name) => {
    const got = present.get(name);
    if (!got) {
      missing.push(name);
      return;
    }
    if (got.data_type !== expect.type)
      typeMismatch.push(`${name}: ${got.data_type} != ${expect.type}`);
    if (expect.udt && got.udt_name !== expect.udt)
      typeMismatch.push(`${name}: ${got.udt_name} != ${expect.udt}`);
    const nullable = got.is_nullable === "YES";
    if (nullable !== expect.nullable)
      typeMismatch.push(`${name}: nullable ${nullable} != ${expect.nullable}`);
  });
  const constraints: ConstraintInfo[] = await AppDataSource.query(
    `SELECT con.conname, con.contype, array_agg(att.attname) AS columns
     FROM pg_constraint con
     JOIN pg_class rel ON rel.oid = con.conrelid
     JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
     WHERE rel.relname = 'user_accounts' AND con.contype IN ('u','p')
     GROUP BY con.conname, con.contype`
  );
  const uniqUsername = constraints.find(
    (c) => c.contype === "u" && c.columns.includes("username")
  );
  const uniqEmail = constraints.find(
    (c) => c.contype === "u" && c.columns.includes("email")
  );
  const hasPk = constraints.find((c) => c.contype === "p");
  if (missing.length) {
    throw new Error(`Missing columns: ${missing.join(", ")}`);
  }
  if (typeMismatch.length) {
    throw new Error(`Type/nullable mismatches: ${typeMismatch.join("; ")}`);
  }
  if (!uniqUsername) {
    throw new Error(`Unique constraint on username not found`);
  }
  if (!uniqEmail) {
    throw new Error(`Unique constraint on email not found`);
  }
  if (!hasPk) {
    throw new Error(`Primary key constraint not found`);
  }
}

function parseArgs(): { file: string } {
  const idx = process.argv.indexOf("--file");
  const file =
    idx >= 0 && process.argv[idx + 1]
      ? process.argv[idx + 1]
      : "d:\\Pooya\\Project\\KPI-Pakchoob\\KPI-Data\\روال تاییدات kpi.xlsx";
  return { file };
}

async function main() {
  dotenv.config();
  const { file } = parseArgs();
  const start = Date.now();
  console.log(`Starting import: ${file}`);
  if (!fs.existsSync(file)) {
    throw new Error(`File not found: ${file}`);
  }
  await AppDataSource.initialize();
  console.log(`Connected to database`);
  await verifyUsersTable();
  console.log(`Users table verified`);
  const usersRepo = AppDataSource.getRepository(User);
  const importLogsRepo = AppDataSource.getRepository(UserImportLog);
  const approvalChainsRepo = AppDataSource.getRepository(ApprovalChain);
  const usersService = new UsersService(usersRepo as any);
  const importService = new ImportService(
    usersRepo as any,
    importLogsRepo as any,
    approvalChainsRepo as any,
    usersService
  );
  const preUsers = await usersRepo.count();
  const preChains = await approvalChainsRepo.count();
  const buffer = fs.readFileSync(file);
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer as any);
  const sheetNames = workbook.worksheets.map((ws) => ws.name);
  console.log(`Sheets: ${sheetNames.join(", ")}`);
  for (const ws of workbook.worksheets) {
    console.log(`Sheet ${ws.name}: ${ws.rowCount} rows`);
  }
  const result = await importService.importFromExcel(buffer, "system");
  const postUsers = await usersRepo.count();
  const postChains = await approvalChainsRepo.count();
  const report = {
    file,
    duration_ms: Date.now() - start,
    sheets: sheetNames,
    totals: {
      source_rows_estimate: workbook.worksheets.reduce(
        (sum, ws) => sum + Math.max(ws.rowCount - 1, 0),
        0
      ),
      users_before: preUsers,
      users_after: postUsers,
      chains_before: preChains,
      chains_after: postChains,
    },
    import_result: result,
    validation: {
      users_delta: postUsers - preUsers,
      chains_delta: postChains - preChains,
      success_equals_created: result.successful === result.createdUsers.length,
      chains_links_match:
        result.hierarchyLinksCreated === postChains - preChains,
    },
  };
  const outPath = "import-approval-report.json";
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), {
    encoding: "utf8",
  });
  console.log(
    `Import completed: ${result.successful} succeeded, ${result.failed} failed, total ${result.total}`
  );
  console.log(`Report saved to ${outPath}`);
}

main().catch(async (err) => {
  console.error(`Import failed: ${err.message}`);
  try {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  } catch {}
  process.exit(1);
});
