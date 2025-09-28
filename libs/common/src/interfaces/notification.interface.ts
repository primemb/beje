export interface NotificationMessage {
  type: 'email' | 'sms' | 'push';
  notificationOptions: NotificationOptions;
}

export interface NotificationOptions {
  type: 'create' | 'update' | 'cancel' | 'reject';
  to: string;
  subject: string;
  text?: string;
  html?: string;
  metadata?: any;
}
