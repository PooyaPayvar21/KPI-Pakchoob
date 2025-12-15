import "reflect-metadata";
import * as dotenv from "dotenv";
import AppDataSource from "../data-source";

dotenv.config();

async function main() {
  await AppDataSource.initialize();

  const tables: Array<{ table_name: string }> = await AppDataSource.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `
  );

  for (const { table_name } of tables) {
    const columns: Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }> = await AppDataSource.query(
      `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `,
      [table_name]
    );

    const [{ count }] = await AppDataSource.query(
      `SELECT COUNT(*)::int AS count FROM "${table_name}"`
    );

    console.log(`TABLE: ${table_name}`);
    console.log(`  Columns (${columns.length}):`);
    for (const col of columns) {
      console.log(
        `    - ${col.column_name} :: ${col.data_type} ${col.is_nullable === "YES" ? "(nullable)" : ""}`
      );
    }
    console.log(`  Row count: ${count}`);

    const sampleRows = await AppDataSource.query(
      `SELECT * FROM "${table_name}" LIMIT 3`
    );
    if (sampleRows.length > 0) {
      console.log(`  Sample rows (${sampleRows.length}):`);
      for (const r of sampleRows) {
        console.log(`    ${JSON.stringify(r)}`);
      }
    } else {
      console.log(`  Sample rows: none`);
    }
    console.log("");
  }

  await AppDataSource.destroy();
}

main().catch(async (err) => {
  console.error("Failed to dump database:", err);
  try {
    await AppDataSource.destroy();
  } catch {}
  process.exit(1);
});

