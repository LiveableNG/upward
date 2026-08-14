import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UnstructuredPipelineService {
  private readonly logger = new Logger(UnstructuredPipelineService.name);

  constructor(private readonly configService: ConfigService) {}

  async processDocument(fileBuffer: Buffer, mimeType: string, fileName: string): Promise<string> {
    const apiUrl = this.configService.get<string>('UNSTRUCTURED_API_URL', 'http://localhost:8000/general/v0/general');
    const apiKey = this.configService.get<string>('UNSTRUCTURED_API_KEY', '');

    try {
      const formData = new FormData();
      const blob = new Blob([fileBuffer as any], { type: mimeType });
      formData.append('files', blob, fileName);
      formData.append('strategy', 'hi_res');
      formData.append('coordinates', 'false');

      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['unstructured-api-key'] = apiKey;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Unstructured API returned status ${response.status}: ${await response.text()}`);
      }

      const elements = await response.json() as any[];
      let extractedContent = '';

      for (const el of elements) {
        if (el.type === 'Table') {
          if (el.metadata?.text_as_html) {
            extractedContent += `\n[TABLE]\n${el.metadata.text_as_html}\n[/TABLE]\n`;
          } else {
            extractedContent += `\n| ${el.text.replace(/\n/g, ' | ')} |\n`;
          }
        } else if (el.type === 'Title') {
          extractedContent += `\n## ${el.text}\n`;
        } else {
          extractedContent += `\n${el.text}\n`;
        }
      }

      return extractedContent;
    } catch (err: any) {
      this.logger.error(`Failed to parse document via Unstructured.io: ${err.message}`);
      return fileBuffer.toString('utf-8');
    }
  }
}
