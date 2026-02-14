import {Injectable, Logger} from '@nestjs/common';
import axios from 'axios';
import {ConfigService} from "@nestjs/config";
import {OpenRouterSummaryDto} from "../../../../libs/dto/open-router-summary-dto";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openRouterApi = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly jinaEmbeddingsApi = 'https://api.jina.ai/v1/embeddings';

  constructor(private configService: ConfigService) {
  }
  async summarizeContent(content: string): Promise<OpenRouterSummaryDto> {
    const apiKey = this.configService.get<string>('OPEN_ROUTER_API_KEY');
    try {
      const userPrompt = `You will be given a message.
                          1. Summarize it in 1-2 sentences.
                          2. Extract the top 3 key topics.
                          3. Classify the message as one of: "news", "blog", "support", "other".
                          Message: ${content}.
                          Respond in this JSON format:
                          {
                            "summary": "...",
                            "topics": ["...", "...", "..."],
                            "category": "..."
                          }`;

      const response = await axios.post(
        this.openRouterApi,
        {
          model: 'mistralai/mistral-7b-instruct',
          messages: [
            {
              role: 'system',
              content: 'You are an assistant that summarizes text and extracts key insights.',
            },
            {
              role: 'user',
              content: userPrompt
            },
          ],
          response_format: {
            type: 'json_object'
          }
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      let result = response.data?.choices?.[0]?.message?.content;
      if(result == ' ') {
        throw new Error("No summary returned");
      }
      result = JSON.parse(result);
      return result as OpenRouterSummaryDto;
    } catch (error: any) {
      this.logger.error('AI summarization failed', error.response?.data || error.message);
      throw error;
    }
  }

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
      console.log('@Jina API response:', response.data);
      console.log("@Res: ",response.data.data[0]);
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

  /**
   * Summarize with context: embed query, retrieve top docs, call LLM
   * @param text Query text
   */
  async summarizeWithContext(text: string,contextTexts: string[]): Promise<OpenRouterSummaryDto> {
    console.log('Context text for LLM:', contextTexts);
    let allContextText = contextTexts.join('.\n'); // Limit to top 3 contexts
    console.log("All context text:", allContextText);
    const openRouterApiKey = this.configService.get<string>('OPEN_ROUTER_API_KEY');

    // Step 3: Build prompt for LLM
    const prompt = `
You are a helpful summarization assistant.
Use the context below to improve your summary.
1. Summarize it in 1-5 sentences using the context below to improve your summary or answer questions.
2. Extract the top 3 key topics.
3. Classify the message as one of: "news", "blog", "support", "other".

Note the context is prefixed by CONTEXT:
And the text to summarize is prefixed by TEXT TO SUMMARIZE:

Respond in this JSON format:
{
  "summary": "...",
  "topics": ["...", "...", "..."],
  "category": "..."
}

CONTEXT:
${allContextText}

TEXT TO SUMMARIZE:
${text}
`;

    // Step 4: Call OpenRouter (or any LLM API)
    const llmResponse = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );
    let summary = llmResponse.data.choices?.[0]?.message?.content ?? 'No summary returned';
    if(summary == ' ') {
      throw new Error("No summary returned");
    }
    summary = JSON.parse(summary);
    console.log('LLM summary response:', summary);
    return summary as OpenRouterSummaryDto;
  }

}
