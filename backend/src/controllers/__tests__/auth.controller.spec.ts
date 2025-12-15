import { Test } from '@nestjs/testing';
import { AuthController } from '../../controllers/auth.controller';
import { AuthService } from '../../services/auth.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        JwtService,
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn().mockResolvedValue({ id: 'u1', username: 'x', role: 'EMPLOYEE' }),
            login: jest.fn().mockResolvedValue({ access_token: 'a', refresh_token: 'r', user: { id: 'u1' } }),
            changePassword: jest.fn().mockResolvedValue({ success: true }),
            refreshToken: jest.fn().mockResolvedValue({ access_token: 'a2', refresh_token: 'r2' }),
            logoutByToken: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    }).compile();
    controller = moduleRef.get(AuthController);
    authService = moduleRef.get(AuthService);
    jwtService = moduleRef.get(JwtService);
    (jwtService as any).verify = jest.fn().mockReturnValue({ sub: 'u1' });
  });

  it('login returns tokens', async () => {
    const res = await controller.login({ username: 'x', password: 'y' } as any, { ip: '127.0.0.1', headers: { 'user-agent': 'UA' } } as any);
    expect(res.access_token).toBe('a');
  });

  it('changePassword requires Bearer', async () => {
    const res = await controller.changePassword({ new_password: 'abcd' } as any, { Authorization: 'Bearer t' } as any);
    expect(res.success).toBe(true);
  });

  it('logout returns success', async () => {
    const res = await controller.logout({}, { Authorization: 'Bearer t' } as any);
    expect(res.success).toBe(true);
  });
});
