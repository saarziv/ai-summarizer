import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  Post
} from '@nestjs/common';
import {ApiOperation} from "@nestjs/swagger";
import {PublisherService} from "../../../../libs/kafka/publisher.service";
import {Ctx, KafkaContext, MessagePattern, Payload} from "@nestjs/microservices";
import {TOPICS} from "../../../../libs/topics";
import {SummaryRepository} from "../repositories/summary.repository";
import {summaryTransformer} from "../transformers/summary-transformer";
import { v4 as uuidv4 } from 'uuid';
import {SaveSummaryPayload} from "../../../../libs/payloads/save-summary-payload";
import {SummarizeContentResponse} from "../../../../libs/dto/summarize-content.response";
import {Summary} from "../entities/summary.entity";
import {AppService} from "./app.service";
import { ContentDto } from "../../../../libs/dto/content-dto";
import { DocDto } from '../../../../libs/dto/doc-dto';

@Controller()
export class AppController {

  constructor(
              private publisherService: PublisherService,
              private summaryRepository: SummaryRepository,
              private logger: Logger,
              private appService: AppService,
  ) {}

  @Post('summarize')
  @ApiOperation({ summary: 'Summarizes the content sent using AI, and returns the summary uuid for later retrieval' })
  summarizeContent(@Body() contentDto: ContentDto): SummarizeContentResponse {
    this.logger.log("Publishing content for summary... ",contentDto);
    const uuidForSummary = uuidv4();
    const initSummaryPayload = {
      text: contentDto.text,
      uuid: uuidForSummary
    }
    this.publisherService.sendMessage(initSummaryPayload,TOPICS.SUMMARIZE);
    return {
      uuid: uuidForSummary
    }
  }


  @Post('add-docs')
  @ApiOperation({ summary: 'Indexes the content sent using AI embeddings for later retrieval' })
  async indexContent(@Body() docDto: DocDto): Promise<{ message: string }> {
    this.logger.log("Indexing content...", docDto);
    await this.appService.indexText(docDto.text);
    return { message: 'Content indexed successfully' };
  }

  @Post('summarize-by-docs')
  @ApiOperation({ summary: 'Summarizes content using indexed documents (context-aware), returns UUID' })
  async summarizeByDocs(@Body() contentDto: ContentDto): Promise<SummarizeContentResponse> {
    this.logger.log("Preparing context-aware summary...", contentDto);

    const uuidForSummary = uuidv4();

    // Step 1: Fetch top docs / context from AppService
    const contextTexts = await this.appService.getTopDocsContext(contentDto.text);

    // Step 2: Publish to Kafka including context
    const payload = {
      text: contentDto.text,
      contextTexts: contextTexts,
      uuid: uuidForSummary
    };
    console.log("Context-aware summary contextText length: ",contextTexts.length);
    this.publisherService.sendMessage(payload, TOPICS.SUMMARIZE_WITH_CONTEXT);

    return { uuid: uuidForSummary };
}

  @Get('summary/:uuid')
  @ApiOperation({ summary: 'Fetches the summary by its uuid' })
  async getSummaryByUUID(@Param('uuid') uuid: string): Promise<Summary> {
    const summary = await this.summaryRepository.findOneBy({
      uuid
    });
    this.logger.log('Summary found: ',summary);
    if(summary == null) {
      throw new NotFoundException('Summary not found, probably an issue while processing it');
    }
    return summary;
  }

  @MessagePattern(TOPICS.SAVE)
  async handleMessage(@Payload() saveSummaryPayload: SaveSummaryPayload, @Ctx() context: KafkaContext): Promise<void> {
    try {
      this.logger.log("Save summary payload: ",saveSummaryPayload);
      if(typeof saveSummaryPayload == 'string') {
        throw new InternalServerErrorException("Return summarized data as string")
      }
      const summaryModel = summaryTransformer.summarizePayloadToSummaryModel(saveSummaryPayload)
      this.logger.log("Summary to be saved: ",summaryModel);
      const savedSummary = await this.summaryRepository.save(summaryModel);
      this.logger.log("Saved summary: ",savedSummary);
    } catch (e: any) {
      this.logger.error('Failed to handle SAVE message', {
        payload: saveSummaryPayload,
        error: e.message,
        stack: e.stack,
      });
      // Re-throw to ensure Kafka knows this failed
      throw e;
    }
  }
}
