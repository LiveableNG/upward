import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UnstructuredPipelineService {
  private readonly logger = new Logger(UnstructuredPipelineService.name);

  constructor(private readonly configService: ConfigService) {}

  async processDocument(fileBuffer: Buffer, mimeType: string, fileName: string): Promise<string | null> {
    const rawApiUrl = this.configService.get<string>('UNSTRUCTURED_API_URL', 'http://localhost:8000/general/v0/general');
    const apiKey = this.configService.get<string>('UNSTRUCTURED_API_KEY', '');

    try {
      if (rawApiUrl.includes('platform-api.transform.unstructured.io')) {
        return await this.processViaTransformJobsApi(rawApiUrl, apiKey, fileBuffer, mimeType, fileName);
      } else {
        return await this.processViaDirectApi(rawApiUrl, apiKey, fileBuffer, mimeType, fileName);
      }
    } catch (err: any) {
      this.logger.error(`Failed to parse document via Unstructured.io: ${err.message}`);
      return null;
    }
  }

  private async processViaTransformJobsApi(
    baseUrl: string,
    apiKey: string,
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<string | null> {
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const jobsUrl = cleanBaseUrl.endsWith('/jobs') ? cleanBaseUrl : `${cleanBaseUrl}/jobs/`;

    const formData = new FormData();
    const blob = new Blob([fileBuffer as any], { type: mimeType });
    formData.append('files', blob, fileName);

    const requestData = JSON.stringify({
      job_nodes: [
        {
          name: 'Partitioner',
          type: 'partition',
          subtype: 'vlm',
        },
      ],
    });
    formData.append('request_data', requestData);

    const headers: Record<string, string> = {};
    if (apiKey) headers['unstructured-api-key'] = apiKey;

    const response = await fetch(jobsUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Transform API job creation failed (${response.status}): ${await response.text()}`);
    }

    const job = (await response.json()) as { id: string };
    const jobId = job.id;
    this.logger.log(`Created Unstructured Transform Job: ${jobId}. Polling status...`);

    const statusUrl = `${cleanBaseUrl}/jobs/${jobId}`;
    const startTime = Date.now();

    while (Date.now() - startTime < 45000) {
      await new Promise((res) => setTimeout(res, 2000));

      const statusRes = await fetch(statusUrl, { headers });
      if (!statusRes.ok) continue;

      const statusData = (await statusRes.json()) as { status: string };
      if (statusData.status === 'COMPLETED') {
        this.logger.log(`Unstructured Transform Job ${jobId} completed successfully.`);
        // Return null so self-healing fallback allows Gemini to parse the original PDF directly
        return null;
      } else if (statusData.status === 'FAILED') {
        throw new Error(`Unstructured Transform Job ${jobId} failed.`);
      }
    }

    throw new Error(`Unstructured Transform Job ${jobId} timed out.`);
  }

  private async processViaDirectApi(
    apiUrl: string,
    apiKey: string,
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<string | null> {
    let fullUrl = apiUrl;
    if (!fullUrl.endsWith('/general/v0/general')) {
      fullUrl = `${fullUrl.replace(/\/+$/, '')}/general/v0/general`;
    }

    const formData = new FormData();
    const blob = new Blob([fileBuffer as any], { type: mimeType });
    formData.append('files', blob, fileName);
    formData.append('strategy', 'hi_res');
    formData.append('coordinates', 'false');

    const headers: Record<string, string> = {};
    if (apiKey) headers['unstructured-api-key'] = apiKey;

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Unstructured API returned status ${response.status}: ${await response.text()}`);
    }

    const elements = (await response.json()) as any[];
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
  }
}

