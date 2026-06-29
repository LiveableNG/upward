
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { 
  IPmDocumentRepository, 
  DocumentTemplateEntity, 
  SentDocumentEntity 
} from '../../../../domains/pm/IPropertyRepository';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class PrismaPmDocumentRepository implements IPmDocumentRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async findTemplatesByPmId(pmId: number): Promise<DocumentTemplateEntity[]> {
    const templates = await this.prisma.upward_pm_document_template.findMany({
      where: { pmId },
      orderBy: { updatedAt: 'desc' },
    });
    return templates.map(t => this.mapTemplate(t));
  }

  async findTemplateByUuid(uuid: string): Promise<DocumentTemplateEntity | null> {
    const template = await this.prisma.upward_pm_document_template.findUnique({
      where: { uuid },
    });
    return template ? this.mapTemplate(template) : null;
  }

  async saveTemplate(data: any): Promise<DocumentTemplateEntity> {
    const { uuid, ...rest } = data;
    
    const template = await this.prisma.upward_pm_document_template.upsert({
      where: { uuid: uuid || 'new' },
      update: rest,
      create: {
        ...rest,
        // If uuid is a system one, we want a new real uuid, but if it's a real one we're re-creating, keep it
        uuid: (uuid && !uuid.startsWith('system-')) ? uuid : undefined 
      },
    });
    
    return this.mapTemplate(template);
  }

  async deleteTemplate(uuid: string): Promise<boolean> {
    await this.prisma.upward_pm_document_template.delete({
      where: { uuid },
    });
    return true;
  }

  async findSentDocumentsByPmId(pmId: number): Promise<SentDocumentEntity[]> {
    const documents = await this.prisma.upward_pm_sent_document.findMany({
      where: { pmId, isVaultDocument: false },
      include: { tenant: true, unit: { include: { property: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return documents.map(d => this.mapSentDocument(d));
  }

  async findSentDocumentByUuid(uuid: string): Promise<SentDocumentEntity | null> {
    const document = await this.prisma.upward_pm_sent_document.findUnique({
      where: { uuid },
      include: { tenant: true, unit: { include: { property: true } } },
    });
    return document ? this.mapSentDocument(document) : null;
  }

  async saveSentDocument(data: any): Promise<SentDocumentEntity> {
    const document = await this.prisma.upward_pm_sent_document.create({
      data,
      include: { tenant: true, unit: { include: { property: true } } },
    });
    return this.mapSentDocument(document);
  }

  private mapTemplate(t: any): DocumentTemplateEntity {
    return {
      id: t.id,
      uuid: t.uuid,
      pmId: t.pmId,
      name: t.name,
      content: t.content,
      type: t.type,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  private mapSentDocument(d: any): SentDocumentEntity {
    return {
      id: d.id,
      uuid: d.uuid,
      pmId: d.pmId,
      tenantId: d.tenantId,
      unitId: d.unitId,
      subject: d.subject,
      content: d.content,
      documentType: d.documentType,
      recipientName: d.recipientName,
      recipientEmail: d.recipientEmail,
      status: d.status,
      includeLetterhead: d.includeLetterhead,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      tenant: d.tenant ? {
        uuid: d.tenant.uuid,
        firstName: d.tenant.firstNameSearch, // Approximation for simple entity
        lastName: d.tenant.lastNameSearch,
        email: d.tenant.emailHash,
        phone: d.tenant.phoneEncrypted ? this.encryption.decrypt(d.tenant.phoneEncrypted) : null,
      } : undefined,
      unit: d.unit ? {
        uuid: d.unit.uuid,
        unitName: d.unit.unitName,
        property: d.unit.property ? { name: d.unit.property.name } : undefined,
      } : undefined,
    } as any;
  }
}
