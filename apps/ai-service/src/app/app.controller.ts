import {Controller, Logger} from '@nestjs/common';
import { AiService } from './ai.service';
import {Ctx, KafkaContext, MessagePattern, Payload} from "@nestjs/microservices";
import {PublisherService} from "../../../../libs/kafka/publisher.service";
import {TOPICS} from "../../../../libs/topics";
import {OpenRouterSummaryDto} from "../../../../libs/dto/open-router-summary-dto";
import {InitSummaryPayload} from "../../../../libs/payloads/init-summary-payload";
import {SaveSummaryPayload} from "../../../../libs/payloads/save-summary-payload";
import {SummaryWithContextPayload} from "../../../../libs/payloads/summary-with-context-payload";

@Controller()
export class AppController {
  constructor(private readonly aiService: AiService,
              private publisherService: PublisherService,
              private logger: Logger
  ) {
  }

  @MessagePattern(TOPICS.SUMMARIZE)
  async handleMessage(@Payload() initSummaryPayload: InitSummaryPayload, @Ctx() context: KafkaContext): Promise<void> {
    this.logger.log(`AI service received: ${TOPICS.SUMMARIZE}, message: ${initSummaryPayload}`);
    const openRouterSummaryDto: OpenRouterSummaryDto = await this.aiService.summarizeContent(initSummaryPayload.text);
    const saveSummaryPayload: SaveSummaryPayload = {
      openRouterSummaryDto,
      ...initSummaryPayload,
      isWithContext: false
    }
    await this.publisherService.sendMessage(saveSummaryPayload,TOPICS.SAVE);
  }

  @MessagePattern(TOPICS.SUMMARIZE_WITH_CONTEXT)
  async handleContextSummary(@Payload() payload: SummaryWithContextPayload, @Ctx() context: KafkaContext): Promise<void> {
    this.logger.log('AI received context-aware summary request:', payload);
    const summary = await this.aiService.summarizeWithContext(payload.text,payload.contextTexts);
    const {contextTexts,text} = payload;
    const saveSummaryPayload: SaveSummaryPayload = {
      openRouterSummaryDto: summary,
      text,
      uuid: payload.uuid,
      isWithContext: contextTexts.length > 0
    }
    await this.publisherService.sendMessage(saveSummaryPayload, TOPICS.SAVE);
  }

}



