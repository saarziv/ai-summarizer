import {Summary} from "../entities/summary.entity";
import {SaveSummaryPayload} from "../../../../libs/payloads/save-summary-payload";

export const summaryTransformer = {

  summarizePayloadToSummaryModel(saveSummaryPayload: SaveSummaryPayload): Summary {
    const {text,uuid,openRouterSummaryDto} = saveSummaryPayload;
    return  {
      originalText: text,
      uuid,
      isWithContext: saveSummaryPayload.isWithContext,
      summary: openRouterSummaryDto.summary,
      category: openRouterSummaryDto.category,
      topics: openRouterSummaryDto.topics
    } as Summary
  }

}
