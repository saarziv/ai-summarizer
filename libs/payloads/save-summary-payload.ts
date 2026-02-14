import {OpenRouterSummaryDto} from "../dto/open-router-summary-dto";

export interface SaveSummaryPayload {
  openRouterSummaryDto: OpenRouterSummaryDto,
  text: string,
  uuid: string,
  isWithContext: boolean
}
