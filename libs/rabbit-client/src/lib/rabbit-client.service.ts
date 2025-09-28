import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { NOTIFICATION_SERVICE } from '@beje/common';

@Injectable()
export class RabbitClientService implements OnModuleInit {
  constructor(
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationClient: ClientProxy
  ) {}

  onModuleInit() {
    this.notificationClient.connect();
  }

  get notifClient(): ClientProxy {
    return this.notificationClient;
  }
}
