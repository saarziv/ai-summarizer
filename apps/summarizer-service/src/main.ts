import { NestFactory } from '@nestjs/core';
import {Logger} from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import {MicroserviceOptions, Transport} from "@nestjs/microservices";
import {AppModule} from "./app/app.module";
import {ConfigService} from "@nestjs/config";


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,      // strip unknown props
    forbidNonWhitelisted: true, // throw error on unknown props
    transform: true,      // transform payloads to DTO instances
  }));

  const configService = app.get(ConfigService);
  //@ts-ignore
  const kafkaHost = configService.get<string>(`KAFKA_HOST`);
  //@ts-ignore
  const kafkaPort = configService.get<string>('KAFKA_PORT');

  app.connectMicroservice<MicroserviceOptions>({
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
        groupId: 'summarizer-group-2', // unique per service
      },
    },
  });

  const config = new DocumentBuilder()
    .setTitle('AI Summarizer API')
    .setDescription(
      'REST API for AI-powered summarization. Submit text to be summarized (async), index documents for context-aware summaries, and retrieve results by UUID. Processing is asynchronous via Kafka.',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  const logger = new Logger('Bootstrap');

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000,() => {
    logger.log(`Nest server listening on port: ${process.env.PORT ?? 3000}...`);
  });
}
bootstrap();
