import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from '../services/users.service';
import { ImportService } from '../services/import.service';
import { UserStatus, UserRole } from '../entities/user.entity';
import { CreateUserDto, UpdateUserDto, AssignRoleDto, SetAccessLevelsDto, SetPermissionsDto, DeactivateUserDto, ResetPasswordDto } from '../dto/user.dto';
import { BulkImportResponseDto } from '../dto/import.dto';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private importService: ImportService,
  ) {}

  @Get()
  async list(@Query('status') status?: UserStatus, @Query('role') role?: UserRole) {
    return this.usersService.list({ status, role });
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(200)
  async deactivate(@Param('id') id: string, @Body() deactivateDto: DeactivateUserDto) {
    return this.usersService.deactivate(id, undefined, deactivateDto.reason);
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string) {
    return this.usersService.reactivate(id);
  }

  @Post(':id/assign-role')
  async assignRole(@Param('id') id: string, @Body() assignRoleDto: AssignRoleDto) {
    return this.usersService.assignRole(id, assignRoleDto.role);
  }

  @Post(':id/set-access-levels')
  async setAccessLevels(@Param('id') id: string, @Body() setAccessLevelsDto: SetAccessLevelsDto) {
    return this.usersService.setAccessLevels(id, setAccessLevelsDto.accessLevels);
  }

  @Post(':id/set-permissions')
  async setPermissions(@Param('id') id: string, @Body() setPermissionsDto: SetPermissionsDto) {
    return this.usersService.setPermissions(id, setPermissionsDto.permissions);
  }

  @Post(':id/lock')
  async lock(@Param('id') id: string) {
    return this.usersService.lock(id);
  }

  @Post(':id/unlock')
  async unlock(@Param('id') id: string) {
    return this.usersService.unlock(id);
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body() resetPasswordDto: ResetPasswordDto) {
    return this.usersService.resetPassword(id, resetPasswordDto.password);
  }

  @Post('import/excel')
  @UseInterceptors(FileInterceptor('file'))
  async importFromExcel(
    @UploadedFile() file: any,
  ): Promise<BulkImportResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Accept various Excel mimetypes
    const validMimetypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/excel',
      'application/x-excel',
      'application/x-msexcel',
      'application/octet-stream', // Some servers return this
    ];

    if (!validMimetypes.some(mt => file.mimetype.includes(mt)) && !file.originalname.endsWith('.xlsx')) {
      throw new BadRequestException(
        `File must be an Excel file (.xlsx). Received: ${file.mimetype}`,
      );
    }

    // TODO: Get userId from authenticated request context
    const userId = 'system'; // Placeholder for authenticated user
    return this.importService.importFromExcel(file.buffer, userId);
  }

  @Get('import/history')
  async getImportHistory(): Promise<any> {
    // TODO: Get userId from authenticated request context
    const userId = 'system'; // Placeholder for authenticated user
    return this.importService.getImportHistory(userId);
  }

  @Get('import/stats')
  async getImportStats(): Promise<any> {
    return this.importService.getImportStats();
  }

  @Get('approval-chain/:employeeId')
  async getApprovalChain(@Param('employeeId') employeeId: string): Promise<any> {
    return this.importService.getApprovalChain(employeeId);
  }

  @Get('branch/:branchName')
  async getEmployeesByBranch(@Param('branchName') branchName: string): Promise<any> {
    return this.importService.getEmployeesByBranch(branchName);
  }

  @Get('departments/summary')
  async getDepartmentsSummary(): Promise<any> {
    return this.importService.getDepartmentsSummary();
  }
}
