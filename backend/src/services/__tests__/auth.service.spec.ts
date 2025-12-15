import { AuthService } from "../../services/auth.service";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { User, UserStatus, UserRole } from "../../entities/user.entity";
import { UserSession } from "../../entities/userSession.entity";
import { ApprovalChain } from "../../entities/approvalChain.entity";

function createRepoMock<T = any>() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  } as unknown as Repository<any>;
}

describe("AuthService", () => {
  let usersRepo: Repository<User>;
  let sessionsRepo: Repository<UserSession>;
  let jwtService: JwtService;
  let approvalRepo: Repository<ApprovalChain>;
  let service: AuthService;

  beforeEach(() => {
    usersRepo = createRepoMock<User>();
    sessionsRepo = createRepoMock<UserSession>();
    approvalRepo = createRepoMock<ApprovalChain>();
    jwtService = new JwtService({
      secret: "test",
      signOptions: { expiresIn: "1h" },
    });
    service = new AuthService(usersRepo, sessionsRepo, approvalRepo, jwtService);
  });

  it("validatePasswordPolicy enforces minimum length", () => {
    const res = (service as any).validatePasswordPolicy("123");
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it("login issues tokens and creates session", async () => {
    const user: any = {
      id: "u1",
      username: "test",
      email: "t@e.c",
      role: UserRole.EMPLOYEE,
    };
    (sessionsRepo.create as any).mockImplementation((x: any) => x);
    (sessionsRepo.save as any).mockResolvedValue({});
    (approvalRepo.find as any).mockResolvedValue([{ department: "PM", sequenceLevel: 1 }]);
    const res = await service.login(user, "127.0.0.1", "UA");
    expect(res.access_token).toBeDefined();
    expect(res.refresh_token).toBeDefined();
    expect(res.user.username).toBe("test");
    expect(res.department).toBe("PM");
  });

  it("logoutByToken deactivates matching session", async () => {
    (sessionsRepo.findOne as any).mockResolvedValue({ id: "s1" });
    (sessionsRepo.update as any).mockResolvedValue({});
    const res = await service.logoutByToken("tok");
    expect(res.success).toBe(true);
    expect(sessionsRepo.update as any).toHaveBeenCalled();
  });
});
