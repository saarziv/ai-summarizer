import { Test, TestingModule } from '@nestjs/testing';
import {INestApplication, Logger} from '@nestjs/common';
import request from 'supertest';
import {AppController} from "./app.controller";
import {PublisherService} from "../../../../libs/kafka/publisher.service";
import {SummaryRepository} from "../repositories/summary.repository";
import {KafkaContext} from "@nestjs/microservices";

describe('Summarizer API (integration)', () => {
  let app: INestApplication;
  let publisherServiceMock: { };
  let summaryRepositoryMock: { save: jest.Mock };
  let loggerMock: { log: jest.Mock };
  const mockSummaryText: string = "Under the bright sun, a stray dog followed a wandering musician through empty streets. His guitar hummed softly, echoing off the cobblestones. When he stopped to rest, the cat climbed onto his lap, purring in rhythm. Together, they played a song no one would hear but the night itself, weaving warmth into the quiet darkness.Under the pale moonlight, a small village slept beside a whispering river. A curious child slipped outside, chasing a flickering blue firefly that seemed to know her name. It led her deep into the woods, where an old oak opened its roots to reveal a glowing door. Smiling, she stepped inside, leaving behind her ordinary world.";
  const mockSummaryUUID: string = "748e398a-e580-46f3-a704-eb9162307f39";
  const mockSummaryOpenRouterDto = {
    "category": "other",
    "summary": "A stray dog accompanies a musician through empty streets, while a child follows a firefly into a magical world, both finding unique connections in their solitude.",
    "topics": [
      "stray dog",
      "musician",
      "magical world"
    ],
  }
  const mockSummary = {
    "id": 5,
    "uuid": mockSummaryUUID,
    "originalText": mockSummaryText,
    "createdAt": "2025-10-19T08:23:01.742Z",
    ...mockSummaryOpenRouterDto
  }


  beforeAll(async () => {
    publisherServiceMock = {};
    summaryRepositoryMock = { save: jest.fn().mockResolvedValue(mockSummary)};
    loggerMock = {log: jest.fn()};

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: PublisherService, useValue: publisherServiceMock },
        { provide: SummaryRepository, useValue: summaryRepositoryMock },
        { provide: Logger, useValue: loggerMock}
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Save summary should call save function on DB correctly', async () => {
    const mockSaveSummaryPayload = {
      openRouterSummaryDto: mockSummaryOpenRouterDto,
      text: mockSummaryText,
      uuid: mockSummaryUUID,
    }
    const appController = app.get(AppController);
    await appController.handleMessage(mockSaveSummaryPayload,{} as KafkaContext);
    await expect(summaryRepositoryMock.save.mock.results[0].value).resolves.toEqual(mockSummary)
  });

});
