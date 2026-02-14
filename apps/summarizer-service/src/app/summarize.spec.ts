import { Test, TestingModule } from '@nestjs/testing';
import {INestApplication, Logger} from '@nestjs/common';
import request from 'supertest';
import {AppController} from "./app.controller";
import {PublisherService} from "../../../../libs/kafka/publisher.service";
import {SummaryRepository} from "../repositories/summary.repository";
import {TOPICS} from "../../../../libs/topics";

describe('Summarizer API (integration)', () => {
  let app: INestApplication;
  let publisherServiceMock: { sendMessage: jest.Mock };
  let summaryRepositoryMock: {  };
  let loggerMock: { log: jest.Mock };

  beforeAll(async () => {
    publisherServiceMock = { sendMessage: jest.fn() };
    summaryRepositoryMock = {};
    loggerMock = {log: jest.fn()}

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

  it('POST /summarize should return a uuid and call publish to kafka', async () => {
    //test receiving a UUID
    const textToSummarize = 'Hello world, summarize me please.';
    const res = await request(app.getHttpServer())
      .post('/summarize')
      .send({ text: textToSummarize })
      .expect(201);
    expect(res.body.uuid).toBeDefined();

    //Test published to kafka correctly
    expect(publisherServiceMock.sendMessage).toHaveBeenCalledWith({
      text: textToSummarize,
      uuid: res.body.uuid
    },TOPICS.SUMMARIZE)
  });

});
