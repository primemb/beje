import { registerAs } from '@nestjs/config';
import { RmqOptions, Transport } from '@nestjs/microservices';
import { NOTIFICATION_QUEUE } from '@beje/common';

export const RABBITMQ_CONFIG_NAME = 'rabbitmq';

export const RABBITMQ_CONFIG = registerAs(
  RABBITMQ_CONFIG_NAME,
  (): RmqOptions => ({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: NOTIFICATION_QUEUE,
      queueOptions: {
        durable: true,
      },
    },
  })
);
