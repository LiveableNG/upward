import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator'

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  SUPPORT = 'SUPPORT',
  PAYMENT = 'PAYMENT',
}

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  userId!: string

  @IsString()
  @IsNotEmpty()
  title!: string

  @IsString()
  @IsNotEmpty()
  message!: string

  @IsEnum(NotificationType)
  @IsOptional()
  type: NotificationType = NotificationType.SYSTEM
}
