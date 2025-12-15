import "reflect-metadata";
import * as dotenv from "dotenv";
import { DataSource } from "typeorm";
import * as bcrypt from "bcrypt";
import { User, UserRole, UserStatus } from "../entities/user.entity";
import { ApprovalChain } from "../entities/approvalChain.entity";

dotenv.config();

const ds = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  username: process.env.DATABASE_USER || "postgres",
  password: process.env.DATABASE_PASSWORD || "6331",
  database: process.env.DATABASE_NAME || "kpi_db",
  entities: [User, ApprovalChain],
  synchronize: false,
});

async function run() {
  await ds.initialize();
  const repo = ds.getRepository(User);

  const args = process.argv.slice(2);
  const usernameArg = args[0] || "3192";
  const passwordArg = args[1] || usernameArg;
  const emailArg = args[2] || `${String(usernameArg)}@company.local`;
  const accounts: Array<{ username: string; password: string; email: string }> =
    [{ username: usernameArg, password: passwordArg, email: emailArg }];

  for (const acc of accounts) {
    let user: User | null = await repo.findOne({
      where: { username: acc.username },
    });
    if (!user) {
      user = await repo.findOne({ where: { email: acc.email } });
    }

    const passwordHash = await bcrypt.hash(acc.password, 10);
    const fullAccessPermissions = {
      scope: "all",
      resources: "*",
      actions: "*",
    };
    const fullAccessLevels = {
      departments: "all",
      tables: "all",
      branches: "all",
    };

    if (!user) {
      const newUser = repo.create({
        username: acc.username,
        email: acc.email,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        permissions: fullAccessPermissions,
        accessLevels: fullAccessLevels,
      } as Partial<User>);
      const saved = await repo.save(newUser);
      console.log("Superadmin user created:", {
        id: saved.id,
        username: saved.username,
        email: saved.email,
      });
      user = saved;
    } else {
      user.passwordHash = passwordHash;
      user.role = UserRole.SUPER_ADMIN;
      user.status = UserStatus.ACTIVE;
      user.emailVerified = true;
      user.permissions = fullAccessPermissions;
      user.accessLevels = fullAccessLevels;
      await repo.save(user);
      console.log("Superadmin user updated:", {
        id: user.id,
        username: user.username,
        email: user.email,
      });
    }

    // Ensure superadmin is appended to top of every approval chain
    if (user && user.id) {
      const approvalRepo = ds.getRepository(ApprovalChain);
      // Ensure self chain exists for superadmin user (employeeId = username)
      const selfChain = await approvalRepo.find({
        where: { employeeId: String(user.username) },
        order: { sequenceLevel: "ASC" },
      });
      if (!selfChain || selfChain.length === 0) {
        const newSelf = approvalRepo.create({
          employeeId: String(user.username),
          employeeName: String(user.username),
          department: "SuperAdmin",
          sequenceLevel: 1,
          managerId: String(user.username),
          managerName: String(user.username),
          managerUser: user,
          branch: "Group",
        } as Partial<ApprovalChain>);
        await approvalRepo.save(newSelf);
        console.log(
          `Created self approval chain for superadmin ${user.username}`
        );
      }
      // Get distinct employee IDs with any chain
      const distinctEmployees = await approvalRepo
        .createQueryBuilder("ac")
        .select("DISTINCT ac.employeeId", "employeeId")
        .getRawMany();

      for (const row of distinctEmployees) {
        const employeeId = String(row.employeeId);
        if (!employeeId) continue;
        const links = await approvalRepo.find({
          where: { employeeId },
          order: { sequenceLevel: "ASC" },
          relations: ["managerUser"],
        });
        const alreadyHas =
          links.find(
            (l) =>
              (l.managerUser && l.managerUser.id === user!.id) ||
              String(l.managerId).trim() === String(user!.username).trim()
          ) !== undefined;
        if (alreadyHas) {
          continue;
        }
        const base = links[links.length - 1] || links[0];
        const nextLevel = (links[links.length - 1]?.sequenceLevel || 0) + 1;
        const newLink = approvalRepo.create({
          employeeId,
          employeeName: String(base?.employeeName || ""),
          department: base?.department || null,
          sequenceLevel: nextLevel,
          managerId: String(user.username),
          managerName: String(user.username),
          managerUser: user,
          branch: String(base?.branch || "Group"),
        } as Partial<ApprovalChain>);
        await approvalRepo.save(newLink);
      }
      console.log(
        `Superadmin ${user.username} ensured as top-level approver in approval chains`
      );
    }
  }

  await ds.destroy();
}

run().catch(async (err) => {
  console.error("Failed to create superadmin:", err);
  try {
    await ds.destroy();
  } catch {}
  process.exit(1);
});
