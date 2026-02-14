import {Test, TestingModule} from '@nestjs/testing';
import { AiService } from './ai.service';
import {PublisherService} from "../../../../libs/kafka/publisher.service";
import {INestApplication, Logger} from "@nestjs/common";
import {KafkaContext} from "@nestjs/microservices";
import {AppController} from "./app.controller";
import {InitSummaryPayload} from "../../../../libs/payloads/init-summary-payload";
import {TOPICS} from "../../../../libs/topics";
import * as axios from "axios";
import {ConfigService} from "@nestjs/config";

jest.mock('axios'); // Replace axios with Jest’s mock version

describe('AppService', () => {
  let app: INestApplication;
  let service: AiService;
  let publisherServiceMock: { sendMessage: jest.Mock };
  const mockSummaryText: string = "testing the summary";
  const mockSummaryUUID: string = "748e398a-e580-46f3-a704-eb9162307f39";
  let initSummaryPayloadMock: InitSummaryPayload = {text: mockSummaryText,uuid: mockSummaryUUID}

  beforeAll(async () => {
    let loggerMock = {log: jest.fn()};
    publisherServiceMock = {sendMessage: jest.fn()}

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        ConfigService,
        AiService,
        { provide: PublisherService, useValue: publisherServiceMock },
        { provide: Logger, useValue: loggerMock}
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  describe('Test handling summarize call', () => {

    it('Should summarize content and publish to kafka', async () => {
      const appController = app.get(AppController);
      const configService = app.get(ConfigService);
      const mockOpenRouterResponse = `{
        "summary": "The message is a simple test phrase with no substantial content.",
        "topics": ["test", "summary", "simple"],
        "category": "other"
      }`;

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          choices: [{
            message: {
              content: mockOpenRouterResponse
            }
          }]
        }
      })
      await appController.handleMessage(initSummaryPayloadMock,{} as KafkaContext);

      const expectedSaveSummaryPayload = {
        openRouterSummaryDto: JSON.parse(mockOpenRouterResponse),
        ...initSummaryPayloadMock
      }
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('https://'), // or aiService.API_URL if public
        expect.objectContaining({
          model: 'mistralai/mistral-7b-instruct',
          messages: expect.any(Array),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Bearer'),
          }),
        }),
      );
      expect(publisherServiceMock.sendMessage).toHaveBeenCalledWith(expectedSaveSummaryPayload,TOPICS.SAVE);
    });

    it("Should handle axios error correctly ", async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('OpenRouter failed'));

      await expect(
        app.get(AppController).handleMessage(initSummaryPayloadMock, {} as KafkaContext)
      ).rejects.toThrow('OpenRouter failed');
    });
  });

});
