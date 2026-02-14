import { ApiProperty } from '@nestjs/swagger';

export class SummarizeContentResponseDto {
  @ApiProperty({
    description:
      'UUID of the requested summary. Use with GET /summary/:uuid to retrieve the result when processing is complete (may take a few seconds).',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  uuid: string;
}
