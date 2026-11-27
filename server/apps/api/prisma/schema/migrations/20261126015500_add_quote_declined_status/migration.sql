-- Add QUOTE_DECLINED status to CustomerFulfilmentStatus and AdminOperationalStatus
ALTER TYPE "CustomerFulfilmentStatus" ADD VALUE IF NOT EXISTS 'QUOTE_DECLINED';
ALTER TYPE "AdminOperationalStatus" ADD VALUE IF NOT EXISTS 'QUOTE_DECLINED';
