import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export class AdminGrantVoucherDto {
  /**
   * Arbitrary voucher amount in Naira (e.g. 500, 1000, 2750, etc.)
   */
  @IsNumber()
  @Min(1)
  @Max(10000000)
  amountNaira!: number

  /**
   * Credit classification: GAMING_REWARD or ADMIN_GRANT
   */
  @IsOptional()
  @IsIn(['CREDIT_GAMING_REWARD', 'CREDIT_ADMIN_GRANT'])
  entryType?: 'CREDIT_GAMING_REWARD' | 'CREDIT_ADMIN_GRANT'

  /**
   * Optional campaign code if linking to an existing campaign; otherwise standalone arbitrary reward
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  campaignCode?: string

  /**
   * Short reason or game/event label (e.g. "Game Night Trivia Winner")
   */
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string

  /**
   * Whether to send the congratulatory email to the user (defaults to true)
   */
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean

  /**
   * Custom email subject override
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  emailSubject?: string

  /**
   * Custom congratulatory email message body
   */
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  customMessage?: string

  /**
   * Client-supplied idempotency key to prevent duplicate grants on retries/double-clicks
   */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string
}
