import {Inject, Injectable, OnModuleInit} from '@nestjs/common';
import {ClientKafka} from "@nestjs/microservices";

@Injectable()
export class PublisherService implements OnModuleInit {

    constructor(@Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka) {
    }

    // Ensure subscriptions are registered
    async onModuleInit() {
        // console.log("Init connect to topic...");
        // this.kafkaClient.subscribeToResponseOf('test-topic');
        await this.kafkaClient.connect();
        console.log("connected publisher service kafka client");
    }

    sendMessage(data: any,topic: string) {
      this.kafkaClient.emit(topic, {
        key: 'some-key', // optional, but good practice
        value: data,     // this is critical
      });
    }
}
