import {Logger, Module} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ClientsModule, Transport} from "@nestjs/microservices";
import {PublisherService} from "../../../../libs/kafka/publisher.service";
import {TypeOrmModule} from "@nestjs/typeorm";
import {Summary} from "../entities/summary.entity";
import {SummaryRepository} from "../repositories/summary.repository";
import {ConfigModule, ConfigService} from "@nestjs/config";
import { DocumentRepository } from '../repositories/document.repository';
import { Document } from '../entities/document';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes ConfigService available everywhere
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
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST'),
        port: +(configService.get<string>('POSTGRES_PORT') || "5432"),
        username: configService.get<string>('POSTGRES_USERNAME'),
        password: configService.get<string>('POSTGRES_PASSWORD'),
        database: configService.get<string>('POSTGRES_DATABASE'),
        entities: [Summary,Document],
        synchronize: true, // ⚠️ auto-creates tables (good for dev only)
      })
    }),
    TypeOrmModule.forFeature([Summary,Document])
  ],
  controllers: [AppController],
  providers: [AppService, PublisherService,SummaryRepository,DocumentRepository,Logger],
})
export class AppModule {}
