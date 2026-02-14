import { Injectable, Logger } from '@nestjs/common';
import axios from "axios";
import {OpenRouterSummaryDto} from "../../../../libs/dto/open-router-summary-dto";
import { DocumentRepository } from '../repositories/document.repository';
import { Document } from 'typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  private readonly jinaEmbeddingsApi = 'https://api.jina.ai/v1/embeddings';
  constructor(private logger: Logger,
              private documentRepo: DocumentRepository,
              private configService: ConfigService
    ) {
  }

  /**
   * Generate embeddings using Jina API
   * @param text Text to embed
   * @returns embedding vector (array of floats)
   */
  //todo: Move this logic to ai service rest endpoint, cause it shouldn't be here...
  private async getEmbeddingFromJina(text: string): Promise<number[]> {
    console.log('@JINA_API_KEY:', process.env.JINA_API_KEY);
    const apiKey = this.configService.get<string>('JINA_API_KEY');

    if (!apiKey) throw new Error('Missing JINA_API_KEY in environment');

    try {
      const response = await axios.post(
        this.jinaEmbeddingsApi,
        {
          input: [text],                 // Can embed multiple texts at once
          model: 'jina-embeddings-v3',   // Recommended model
          task: 'retrieval.passage',     // Task type for document embedding
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      // The response contains embeddings in data.embeddings
      const embedding: number[] = response.data.data[0].embedding;
      console.log('Generated embedding length :', embedding.length);
      return embedding;
    } catch (error: any) {
      // Axios error handling
      console.error('Jina API error:', error.response?.data || error.message);
      throw new Error('Failed to get embedding from Jina');
    }
  }

  async getTopDocsContext(queryText: string): Promise<string[]> {
    this.logger.log('Fetching top docs for context-aware summary...');
    const queryEmbedding = await this.getEmbeddingFromJina(queryText);

    const vectorLiteral = `[${queryEmbedding.join(',')}]`;
    const topDocs = await this.documentRepo.query(
      `SELECT * FROM document ORDER BY embedding <#> $1 LIMIT 3`,
      [vectorLiteral]
    );
    return topDocs.map((d: any) => d.text);
    // return (topDocs as { text: string }[]).map(d => d.text).join('\n');
  }

  async indexText(text: string): Promise<Document> {
    const embedding = await this.getEmbeddingFromJina(text);
    console.log('Embedding length obtained from Jina :', embedding.length);
    const doc = this.documentRepo.create({ text, embedding });
    console.log(
      'Indexing document after creation :', doc
    )
    await this.documentRepo.save(doc);
    return doc;
  }

}
