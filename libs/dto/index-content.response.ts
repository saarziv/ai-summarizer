import { ApiProperty } from '@nestjs/swagger';

export class IndexContentResponseDto {
  @ApiProperty({
    description: 'Success message confirming the document was indexed and is available for context-aware summarization.',
    example: 'Content indexed successfully',
  })
  message: string;
}
