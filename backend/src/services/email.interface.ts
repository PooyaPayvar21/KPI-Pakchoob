export interface EmailTemplate {
  to: string;
  subject: string;
  template: string;
  variables?: { [key: string]: any };
}

export interface EmailService {
  sendPasswordReset(email: string, resetLink: string, userName: string): Promise<void>;
  sendAccountCreated(email: string, userName: string, activationLink: string): Promise<void>;
  sendApprovalNotification(email: string, kpiName: string): Promise<void>;
  sendGeneric(to: string, subject: string, body: string): Promise<void>;
}
