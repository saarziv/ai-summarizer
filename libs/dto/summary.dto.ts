import { ApiProperty } from '@nestjs/swagger';

export class SummaryDto {
  @ApiProperty({ description: 'Internal numeric ID (database primary key).' })
  id: number;

  @ApiProperty({
    description: 'Public UUID; use this in GET /summary/:uuid to fetch the same summary again.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  uuid: string;

  @ApiProperty({ description: 'The original text that was sent for summarization.' })
  originalText: string;

  @ApiProperty({ description: 'Category label assigned to the summary by the AI.' })
  category: string;

  @ApiProperty({ description: 'The generated summary text.' })
  summary: string;

  @ApiProperty({
    type: [String],
    description: 'List of topics extracted from the content by the AI.',
  })
  topics: string[];

  @ApiProperty({
    description: 'True if this summary was created via summarize-by-docs-async (used indexed docs as context).',
  })
  isWithContext: boolean;

  @ApiProperty({ description: 'Timestamp when the summary was saved (ISO 8601).' })
  createdAt: Date;
}
