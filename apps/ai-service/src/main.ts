import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import {AppModule} from "./app/app.module";
import {ConfigService} from "@nestjs/config";


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  //@ts-ignore
  const kafkaHost = configService.get<string>(`KAFKA_HOST`);
  //@ts-ignore
  const kafkaPort = configService.get<string>('KAFKA_PORT');
  const microservice = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [`${kafkaHost}:${kafkaPort}`],
        retry: {
          retries: 10,
          initialRetryTime: 3000,
        }
      },
      consumer: {
        groupId: 'ai-group',
      },
    },
  });
  await microservice.listen();
  console.log('AI microservice listening to Kafka...');
}
bootstrap();
