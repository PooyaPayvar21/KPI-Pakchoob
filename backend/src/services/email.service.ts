import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.interface';

/**
 * Console-based email service for development.
 * In production, swap this with a real SMTP or SendGrid implementation.
 */
@Injectable()
export class ConsoleEmailService implements EmailService {
  private logger = new Logger('EmailService');

  async sendPasswordReset(email: string, resetLink: string, userName: string): Promise<void> {
    const message = `
[EMAIL] Password Reset
To: ${email}
Subject: Password Reset Request

Dear ${userName},

Please use this link to reset your password:
${resetLink}

This link expires in 24 hours.
    `;
    this.logger.log(message);
  }

  async sendAccountCreated(email: string, userName: string, temporaryPassword: string): Promise<void> {
    const message = `
[EMAIL] Account Created
To: ${email}
Subject: Welcome to KPI Management System

Dear ${userName},

Your account has been created and is now active. Please use the following credentials to log in:

Username: ${userName}
Temporary Password: ${temporaryPassword}

Please change your password after first login.
    `;
    this.logger.log(message);
  }

  async sendApprovalNotification(email: string, kpiName: string): Promise<void> {
    const message = `
[EMAIL] KPI Approval Notification
To: ${email}
Subject: KPI Requires Your Approval

Dear Approver,

The following KPI requires your approval:
${kpiName}

Please log in to the system to review and approve or reject.
    `;
    this.logger.log(message);
  }

  async sendGeneric(to: string, subject: string, body: string): Promise<void> {
    const message = `
[EMAIL] Generic
To: ${to}
Subject: ${subject}

${body}
    `;
    this.logger.log(message);
  }
}
