// test/helpers/setup-env.ts
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'test-secret-key';
process.env.AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || 'test-bucket';

process.env.MAILGUN_API_KEY = process.env.MAILGUN_API_KEY || 'test-key';
process.env.MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'test-domain';

process.env.EMAIL_FROM = process.env.EMAIL_FROM || 'test-from';
process.env.REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || 'test-reply-to';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret';
process.env.CRON_SECRET = process.env.CRON_SECRET || 'test-cron-secret';

process.env.PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_eff211f46b96288df8bb2663b26eaad87142e8ac';

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '4a8fb008ac99a75788a473c7029bdf5b5b2a198c8dbc873b3efa637d08abfca8';
process.env.ENCRYPTION_IV_LENGTH = process.env.ENCRYPTION_IV_LENGTH || '16';

process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'test-frontend-url';
process.env.PM_APP_URL = process.env.PM_APP_URL || 'test-pm-app-url';
process.env.PAY_APP_URL = process.env.PAY_APP_URL || 'test-pay-app-url';
process.env.ADMIN_SITE_URL = process.env.ADMIN_SITE_URL || 'test-admin-site-url';
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || 'postgresql://test:test@localhost:5432/test';
process.env.CREDIT_CHEK_TEST = process.env.CREDIT_CHEK_TEST || 'true';
process.env.MOCK_EMAILS = process.env.MOCK_EMAILS || 'true';
process.env.VERIFICATION_ON = process.env.VERIFICATION_ON || 'false';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '140112142464-51ucis2aelijaue10qu49llnspf1d20u.apps.googleusercontent.com';

process.env.GA_PROPERTY_ID = process.env.GA_PROPERTY_ID || '528567914';
process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'test-GA_CRED';

process.env.API_URL = process.env.API_URL || 'http://localhost:4000';
process.env.TERMII_API_KEY = process.env.TERMII_API_KEY || 'test-term-ii-key';
process.env.TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || 'test-term-ii-sender-id';
process.env.WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || 'test-whatsapp';
process.env.WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'test-whatsapp';
process.env.WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || 'test-whatsapp';
process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || 'test-whatsapp';
process.env.REMOVE_TRANSACTION_FEE='true'