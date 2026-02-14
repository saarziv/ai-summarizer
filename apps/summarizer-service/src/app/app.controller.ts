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
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import {PublisherService} from "../../../../libs/kafka/publisher.service";
import {Ctx, KafkaContext, MessagePattern, Payload} from "@nestjs/microservices";
import {TOPICS} from "../../../../libs/topics";
import {SummaryRepository} from "../repositories/summary.repository";
import {summaryTransformer} from "../transformers/summary-transformer";
import { v4 as uuidv4 } from 'uuid';
import { SaveSummaryPayload } from '../../../../libs/payloads/save-summary-payload';
import { SummarizeContentResponseDto } from '../../../../libs/dto/summarize-content.response';
import { IndexContentResponseDto } from '../../../../libs/dto/index-content.response';
import { Summary } from '../entities/summary.entity';
import { AppService } from './app.service';
import { ContentDto } from '../../../../libs/dto/content.dto';
import { SummaryDto } from '../../../../libs/dto/summary.dto';


@Controller()
export class AppController {

  constructor(
              private publisherService: PublisherService,
              private summaryRepository: SummaryRepository,
              private logger: Logger,
              private appService: AppService,
  ) {}

  @Post('summarize-async')
  @ApiOperation({
    summary: 'Request an AI summary (async)',
    description:
      'Sends the given text to be summarized by AI. Returns immediately with a UUID. Use GET /summary/:uuid to fetch the result once processing is done (may take a few seconds).',
  })
  @ApiOkResponse({
    type: SummarizeContentResponseDto,
    description: 'Contains the UUID to use with GET /summary/:uuid to retrieve the summary when ready.',
  })
  summarizeContentAsync(@Body() contentDto: ContentDto): SummarizeContentResponseDto {
    this.logger.log("Publishing content for summary... ", contentDto);
    const uuidForSummary = uuidv4();
    const initSummaryPayload = {
      text: contentDto.text,
      uuid: uuidForSummary
    };
    this.publisherService.sendMessage(initSummaryPayload, TOPICS.SUMMARIZE);
    return { uuid: uuidForSummary };
  }


  @Post('add-docs')
  @ApiOperation({
    summary: 'Index a document for context-aware summarization',
    description:
      'Stores the text as an indexed document (with embeddings). Indexed docs are used as context when calling POST /summarize-by-docs-async, so summaries can be grounded in your content.',
  })
  @ApiBody({ type: ContentDto })
  @ApiOkResponse({
    type: IndexContentResponseDto,
    description: 'Confirmation that the document was indexed successfully.',
  })
  async indexContent(@Body() docDto: ContentDto): Promise<IndexContentResponseDto> {
    this.logger.log("Indexing content...", docDto);
    await this.appService.indexText(docDto.text);
    return { message: 'Content indexed successfully' };
  }

  @Post('summarize-by-docs-async')
  @ApiOperation({
    summary: 'Request a context-aware AI summary (async)',
    description:
      'Uses your indexed documents (from POST /add-docs) as context to summarize the given text. Returns immediately with a UUID. Use GET /summary/:uuid to fetch the result when ready.',
  })
  @ApiBody({ type: ContentDto })
  @ApiOkResponse({
    type: SummarizeContentResponseDto,
    description: 'Contains the UUID to use with GET /summary/:uuid to retrieve the context-aware summary when ready.',
  })
  async summarizeByDocsAsync(@Body() contentDto: ContentDto): Promise<SummarizeContentResponseDto> {
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
    console.log("Context-aware summary contextText length: ", contextTexts.length);
    this.publisherService.sendMessage(payload, TOPICS.SUMMARIZE_WITH_CONTEXT);

    return { uuid: uuidForSummary };
  }

  @Get('summary/:uuid')
  @ApiOperation({
    summary: 'Get a summary by UUID',
    description:
      'Returns the summary record for the given UUID. Use the UUID returned from POST /summarize-async or POST /summarize-by-docs-async. Returns 404 if not found or not yet ready.',
  })
  @ApiParam({ name: 'uuid', description: 'UUID returned from a summarize endpoint', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiOkResponse({ type: SummaryDto, description: 'The full summary record (original text, summary, topics, etc.).' })
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
