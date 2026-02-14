import { ApiProperty } from '@nestjs/swagger';

export class ContentDto {
  @ApiProperty({
    description:
      'Text content. Meaning depends on endpoint: for summarize-async / summarize-by-docs-async it is the text to summarize; for add-docs it is the document text to index for context.',
    example: 'The quick brown fox jumps over the lazy dog.',
  })
  text: string;
}