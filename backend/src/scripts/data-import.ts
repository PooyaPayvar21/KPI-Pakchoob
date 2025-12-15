import "reflect-metadata";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { Workbook } from "exceljs";
import AppDataSource from "../data-source";
import { User } from "../entities/user.entity";
import { KPIDefinition, KPIPeriodSummary } from "../entities/kpi.entity";
import { ApprovalChain } from "../entities/approvalChain.entity";
import { UserImportLog } from "../entities/userImportLog.entity";
import { UsersService } from "../services/users.service";
import { ImportService } from "../services/import.service";
import { KPIImportService } from "../services/kpi-import.service";
import { KPICalculationEngine } from "../services/kpi-calculation.engine";

type FileReport = {
  file: string;
  exists: boolean;
  sheets?: string[];
  rows?: number[];
  result?: any;
  error?: string;
};

function deriveQuarterAndYear(path: string): {
  quarter: string;
  fiscalYear: number;
} {
  const name = path.split(/[\\/]/).pop() || "";
  const qMatch = name.match(/q\s*([1-4])/i) || name.match(/Q\s*([1-4])/);
  const yMatch = name.match(/(13|14)\d{2}/);
  const quarter = qMatch ? `Q${qMatch[1]}` : "Q2";
  const fiscalYear = yMatch ? parseInt(yMatch[0], 10) : 1404;
  return { quarter, fiscalYear };
}

async function pickCreatedByUserId(usersRepo: any): Promise<string> {
  const one = await usersRepo.find({ take: 1 });
  if (one && one.length && one[0].id) return one[0].id;
  const system = await usersRepo.save({
    username: `sys-${Date.now()}`,
    email: `system-${Date.now()}@company.local`,
    mustChangePassword: false,
    role: "EMPLOYEE",
    status: "ACTIVE",
  });
  return system.id;
}

function ensureIRNQ2Sheet(buffer: Buffer): Promise<Buffer> {
  return new Promise(async (resolve) => {
    const wb = new Workbook();
    await wb.xlsx.load(buffer as any);
    const target = wb.getWorksheet("IRNQ2");
    if (target) {
      resolve(buffer);
      return;
    }
    let source = wb.worksheets[0];
    const byName = wb.worksheets.find(
      (ws) =>
        /group/i.test(ws.name) ||
        /گروه/.test(ws.name) ||
        /irn/i.test(ws.name) ||
        /pmq/i.test(ws.name)
    );
    if (byName) source = byName;
    const byRows = wb.worksheets.reduce(
      (a, b) => (a.rowCount >= b.rowCount ? a : b),
      wb.worksheets[0]
    );
    if (byRows && byRows.rowCount > source.rowCount) source = byRows;
    const newWb = new Workbook();
    const newWs = newWb.addWorksheet("IRNQ2");
    for (let r = 1; r <= source.rowCount; r++) {
      const srcRow = source.getRow(r);
      const dstRow = newWs.getRow(r);
      dstRow.values = srcRow.values;
      dstRow.commit();
    }
    const out = await newWb.xlsx.writeBuffer();
    resolve(Buffer.from(out));
  });
}

async function main() {
  dotenv.config();
  const files = [
    "d:\\Pooya\\Project\\KPI-Pakchoob\\KPI-Data\\روال تاییدات kpi.xlsx",
    "d:\\Pooya\\Project\\KPI-Pakchoob\\KPI-Data\\q1-1404.xlsx",
    "d:\\Pooya\\Project\\KPI-Pakchoob\\KPI-Data\\q2-1404.xlsx",
    "d:\\Pooya\\Project\\KPI-Pakchoob\\KPI-Data\\Q3 KPI - 1404.xlsx",
  ];
  const start = Date.now();
  const reports: FileReport[] = [];
  await AppDataSource.initialize();
  const usersRepo = AppDataSource.getRepository(User);
  const importLogsRepo = AppDataSource.getRepository(UserImportLog);
  const approvalChainsRepo = AppDataSource.getRepository(ApprovalChain);
  const kpiRepo = AppDataSource.getRepository(KPIDefinition);
  const periodSummaryRepo = AppDataSource.getRepository(KPIPeriodSummary);
  const usersService = new UsersService(usersRepo as any);
  const importService = new ImportService(
    usersRepo as any,
    importLogsRepo as any,
    approvalChainsRepo as any,
    usersService
  );
  const calculationEngine = new KPICalculationEngine();
  const kpiImportService = new KPIImportService(
    kpiRepo as any,
    periodSummaryRepo as any,
    usersRepo as any,
    calculationEngine
  );
  const createdBy = await pickCreatedByUserId(usersRepo as any);
  for (const file of files) {
    const report: FileReport = { file, exists: fs.existsSync(file) };
    if (!report.exists) {
      report.error = "File not found";
      reports.push(report);
      continue;
    }
    try {
      const buffer = fs.readFileSync(file);
      const workbook = new Workbook();
      await workbook.xlsx.load(buffer as any);
      report.sheets = workbook.worksheets.map((ws) => ws.name);
      report.rows = workbook.worksheets.map((ws) => ws.rowCount);
      if (file.includes("روال تاییدات")) {
        report.result = await importService.importFromExcel(buffer, "system");
      } else {
        const fixedBuffer = await ensureIRNQ2Sheet(buffer);
        const result = await kpiImportService.importFromExcel(
          fixedBuffer,
          createdBy
        );
        const { quarter, fiscalYear } = deriveQuarterAndYear(file);
        await kpiImportService.calculatePeriodSummaries(quarter, fiscalYear);
        report.result = { quarter, fiscalYear, ...result };
      }
    } catch (err: any) {
      report.error = err?.message || String(err);
    }
    reports.push(report);
  }
  const out = {
    started_at: new Date(start).toISOString(),
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - start,
    files: reports,
    totals: {
      processed: reports.length,
      succeeded: reports.filter((r) => !r.error).length,
      failed: reports.filter((r) => r.error).length,
    },
  };
  fs.writeFileSync("data-import-report.json", JSON.stringify(out, null, 2), {
    encoding: "utf8",
  });
  console.log(
    `Data import done: ${out.totals.succeeded} succeeded, ${out.totals.failed} failed`
  );
  console.log("Report saved to data-import-report.json");
  await AppDataSource.destroy();
}

main().catch(async (err) => {
  console.error(err?.message || String(err));
  try {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  } catch {}
  process.exit(1);
});
