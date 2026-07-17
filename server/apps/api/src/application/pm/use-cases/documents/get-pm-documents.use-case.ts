import { Inject, Injectable } from '@nestjs/common';
import { PM_DOCUMENT_REPOSITORY, IPmDocumentRepository } from '../../../../domains/pm/IPropertyRepository';
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service';

const DEFAULT_TEMPLATES = [
  {
    uuid: 'system-onboarding-1',
    name: 'Getting Started',
    subject: 'Welcome to Upward — A Better Rental Experience Starts Here',
    type: 'SYSTEM',
    content: `
      <div style="max-width: 680px; margin: auto; padding: 48px; font-family: Arial, Helvetica, sans-serif; color: #4B5563; font-size: 16px; line-height: 1.75;">

        <h1 style="font-size: 30px; font-weight: 700; color: #111827; margin-bottom: 30px;">
          Welcome to Upward
        </h1>

        <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.75;">
          Dear [TenantFirstName],
        </p>
        <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.75;">
          For most people, paying rent is something you simply have to do. But what if every rent payment could also work in your favour?
        </p>
        <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.75;">
          That's exactly what we're bringing to you. We're excited to welcome you to Upward&mdash;a new experience designed to make renting simpler, more rewarding, and more beneficial for you.
        </p>

        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 40px 0;">

        <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 18px;">
          What This Means For You
        </h2>

        <ul style="padding-left: 22px; margin: 0;">
          <li style="margin-bottom: 18px;">
            <strong style="color: #111827;">Build Your Rental Reputation</strong><br>
            Your consistent rent payments help create a verified rental history that demonstrates you're a reliable tenant.
          </li>
          <li style="margin-bottom: 18px;">
            <strong style="color: #111827;">Keep Your History When You Move</strong><br>
            You'll no longer lose your rental history. You'll have a record that shows your payment reliability and can strengthen future rental applications.
          </li>
          <li style="margin-bottom: 18px;">
            <strong style="color: #111827;">Access All Tenancy Records</strong><br>
            Everything you need about your tenancy will be in one place. Your rent records, receipts, and important tenancy information will always be available whenever you need them.
          </li>
          <li style="margin-bottom: 18px;">
            <strong style="color: #111827;">Simpler Payments</strong><br>
            Paying rent becomes simpler and more transparent. You'll always know what you've paid, when you paid it, and have a permanent record for your own reference.
          </li>
        </ul>

        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 40px 0;">

        <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 18px;">
          We've Already Given You a Head Start
        </h2>

        <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.75;">
          Because many of our residents have built an excellent record of paying rent responsibly, we don't want anyone to lose the value of that history.
        </p>

        <div style="background: #F8FAFC; border-left: 4px solid #2563EB; padding: 18px 22px; margin: 30px 0; border-radius: 6px;">
          <strong style="font-size: 16px; color: #111827;">Good News</strong>
          <p style="margin: 10px 0 0;">
            We'll automatically import your previous rent payment history into Upward so you don't start from scratch. If you've been a responsible tenant, your previous payment behaviour will help establish your rental profile from day one.
          </p>
        </div>

        <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.75;">
          Over the next few days, we'll introduce more ways Upward helps make renting easier and more rewarding. Thank you for being a valued resident. We look forward to bringing you a better rental experience.
        </p>

        <p style="margin: 30px 0 0; font-size: 16px; line-height: 1.75; color: #6B7280;">
          Regards,<br>
          [CompanyName]
        </p>
      </div>
    `,
    updatedAt: new Date().toISOString(),
    isSystem: true
  },
  {
    uuid: 'system-onboarding-2',
    name: 'Benefits',
    subject: 'Your Good Rental History Should Work for You',
    type: 'SYSTEM',
    content: `
      <div style="max-width: 680px; margin: auto; padding: 48px; font-family: Arial, Helvetica, sans-serif; color: #4B5563; font-size: 16px; line-height: 1.75;">

        <h1 style="font-size: 30px; font-weight: 700; color: #111827; margin-bottom: 30px;">
          Your Good Rental History Should Work for You
        </h1>

        <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.75;">
          Dear [TenantFirstName],
        </p>
        <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.75;">
          If you've been paying your rent on time, you've already done the hard part. The problem is that, until now, those years of responsible payments haven't always benefited you beyond satisfying your rent obligation.
        </p>
        <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.75;">
          We believe they should. That's why your previous rent payment history will be brought into Upward, allowing your good payment habits to become a lasting record that belongs to you.
        </p>

        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 40px 0;">

        <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 18px;">
          What This Means For You
        </h2>

        <ul style="padding-left: 22px; margin: 0;">
          <li style="margin-bottom: 18px;">
            <strong style="color: #111827;">Remembered Payments</strong><br>
            Your previous on-time and early rent payments won't be forgotten. They'll become part of your verified rental history.
          </li>
          <li style="margin-bottom: 18px;">
            <strong style="color: #111827;">An Established Profile</strong><br>
            You'll begin with an established profile instead of a blank slate. Your reputation as a responsible tenant should reflect the consistency you've already demonstrated.
          </li>
          <li style="margin-bottom: 18px;">
            <strong style="color: #111827;">Future Opportunities</strong><br>
            A stronger rental history can create future opportunities. Whether you're applying for another apartment or becoming eligible for exclusive resident benefits, your payment record can work in your favour.
          </li>
        </ul>

        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 40px 0;">

        <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 18px;">
          Questions You May Have
        </h2>

        <div style="border: 1px solid #E5E7EB; padding: 18px; margin-bottom: 14px; border-radius: 8px;">
          <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: 700; color: #111827;">
            Is my money safe?
          </h3>
          <p style="margin: 0; line-height: 1.7;">
            Yes. Your payments are processed through secure payment channels, giving you confidence that every payment is handled safely.
          </p>
        </div>

        <div style="border: 1px solid #E5E7EB; padding: 18px; margin-bottom: 14px; border-radius: 8px;">
          <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: 700; color: #111827;">
            Will I still receive proof of payment?
          </h3>
          <p style="margin: 0; line-height: 1.7;">
            Absolutely. Every successful payment automatically generates a receipt that is securely stored in your account, so you'll always have it when you need it.
          </p>
        </div>

        <div style="border: 1px solid #E5E7EB; padding: 18px; margin-bottom: 14px; border-radius: 8px;">
          <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: 700; color: #111827;">
            Can I still see payments I've made before?
          </h3>
          <p style="margin: 0; line-height: 1.7;">
            Yes. Your previous payment history will be added to your profile, giving you one complete record of your tenancy.
          </p>
        </div>

        <div style="border: 1px solid #E5E7EB; padding: 18px; margin-bottom: 14px; border-radius: 8px;">
          <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: 700; color: #111827;">
            Will paying rent become more complicated?
          </h3>
          <p style="margin: 0; line-height: 1.7;">
            Not at all. Upward is designed to make rent payments and tenancy management simpler by giving you one place to manage everything related to your tenancy.
          </p>
        </div>

        <p style="margin: 30px 0 18px; font-size: 16px; line-height: 1.75;">
          Your commitment to paying rent responsibly deserves to be recognised. We're excited to make your rental experience easier, more transparent, and more rewarding.
        </p>
        <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.75;">
          Welcome to a better rental experience.
        </p>

        <p style="margin: 30px 0 0; font-size: 16px; line-height: 1.75; color: #6B7280;">
          Regards,<br>
          [CompanyName]
        </p>
      </div>
    `,
    updatedAt: new Date().toISOString(),
    isSystem: true
  }
];

@Injectable()
export class GetPmDocumentsUseCase {
  constructor(
    @Inject(PM_DOCUMENT_REPOSITORY)
    private readonly documentRepo: IPmDocumentRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(pmId: number) {
    const [templates, history] = await Promise.all([
      this.documentRepo.findTemplatesByPmId(pmId),
      this.documentRepo.findSentDocumentsByPmId(pmId),
    ]);

    const [resolvedTemplates, resolvedHistory] = await Promise.all([
      Promise.all(templates.map(async (t) => {
        if (t.content && t.content.startsWith('pm-docs/')) {
          try {
            const actualContent = await this.s3Service.getFileContent(t.content);
            return { ...t, content: actualContent };
          } catch (error) {
            console.error(`Failed to fetch S3 content for template ${t.uuid}:`, error);
            return t;
          }
        }
        return t;
      })),
      Promise.all(history.map(async (h) => {
        if (h.content && h.content.startsWith('pm-docs/')) {
          try {
            const actualContent = await this.s3Service.getFileContent(h.content);
            return { ...h, content: actualContent };
          } catch (error) {
            console.error(`Failed to fetch S3 content for history ${h.uuid}:`, error);
            return h;
          }
        }
        return h;
      }))
    ]);

    return {
      templates: [...DEFAULT_TEMPLATES, ...resolvedTemplates],
      history: resolvedHistory,
    };
  }
}
