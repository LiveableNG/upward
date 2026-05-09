import { Injectable } from '@nestjs/common';

@Injectable()
export class GenerateDocumentPdfUseCase {
  async execute(content: string): Promise<Buffer> {
    const htmlToPdf = require('html-pdf-node');
    const options = { 
      format: 'A4', 
      margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' },
      printBackground: true
    };
    const file = { content };
    
    return await htmlToPdf.generatePdf(file, options);
  }
}
