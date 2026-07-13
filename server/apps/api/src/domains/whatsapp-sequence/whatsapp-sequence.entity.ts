export class WhatsappSequenceLogEntity {
  constructor(
    public readonly id: number,
    public readonly uuid: string,
    public readonly userId: number,
    public readonly phoneEncrypted: string | null,
    public readonly phoneHash: string | null,
    public readonly stage: string,
    public readonly status: string,
    public readonly scheduledFor: Date,
    public readonly sentAt: Date | null,
    public readonly errorReason: string | null,
    public readonly templateName: string,
    public readonly templateData: any,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
