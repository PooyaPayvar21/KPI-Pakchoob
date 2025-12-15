import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from '../entities/auditLog.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogsRepo: Repository<AuditLog>
  ) {}

  async log(
    action: AuditAction,
    userId?: string,
    resourceType?: string,
    resourceId?: string,
    description?: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    const log = this.auditLogsRepo.create({
      action,
      userId,
      resourceType,
      resourceId,
      description,
      metadata,
      ipAddress,
      userAgent
    });
    return this.auditLogsRepo.save(log);
  }

  async getByUser(userId: string, limit = 100) {
    return this.auditLogsRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  async getByAction(action: AuditAction, limit = 100) {
    return this.auditLogsRepo.find({
      where: { action },
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  async getAll(limit = 500) {
    return this.auditLogsRepo.find({
      order: { createdAt: 'DESC' },
      take: limit
    });
  }
}
