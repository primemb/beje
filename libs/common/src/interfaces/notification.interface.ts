export interface NotificationMessage {
  type: 'email' | 'sms' | 'push';
  recipient: string;
  content: string;
  metadata?: any;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  metadata?: any;
}
