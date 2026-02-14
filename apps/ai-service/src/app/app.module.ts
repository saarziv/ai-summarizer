import {Logger, Module} from '@nestjs/common';
import { AiService } from './ai.service';
import {AppController} from "./app.controller";
import {ConfigModule, ConfigService} from "@nestjs/config";
import {ClientsModule, Transport} from "@nestjs/microservices";
import {PublisherService} from "../../../../libs/kafka/publisher.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes config accessible everywhere without importing again
      // envFilePath: 'apps/ai-service/.env',
    }),
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        imports:[ConfigModule],
        inject: [ConfigService],
        useFactory:(configService: ConfigService) => {
          const kafkaHost = configService.get<string>('KAFKA_HOST');
          const kafkaPort = configService.get<string>('KAFKA_PORT');
          console.log("@@ kafkaHost :",kafkaHost);
          return {
            transport: Transport.KAFKA,
            options: {
              client: {
                brokers: [`${kafkaHost}:${kafkaPort}`],
              },
              consumer: {
                groupId: 'summarizer-group',
              },
              subscribe: {
                fromBeginning: false, // do NOT replay old messages
              }
            }
          }
        }
      },
    ]),
  ],
  controllers: [AppController], // ✅ register the controller
  providers: [
    AiService,
    PublisherService,
    Logger
  ]
})
export class AppModule {}
