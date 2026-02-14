import { Injectable } from '@nestjs/common';
import {DataSource, Repository} from 'typeorm';
import {Summary} from "../entities/summary.entity";

@Injectable()
export class SummaryRepository extends Repository<Summary>{

  constructor(private dataSource: DataSource) {
    super(Summary, dataSource.createEntityManager());
  }

}
