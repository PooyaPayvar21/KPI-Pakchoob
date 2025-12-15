import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../../entities/auditLog.entity';
import { AuditService } from '../../services/audit.service';
import { ConsoleEmailService } from '../../services/email.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [
    AuditService,
    {
      provide: 'EmailService',
      useClass: ConsoleEmailService
    }
  ],
  exports: [AuditService, 'EmailService']
})
export class SharedModule {}
