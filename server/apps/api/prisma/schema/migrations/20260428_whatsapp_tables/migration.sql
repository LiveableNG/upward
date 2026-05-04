-- CreateTable
CREATE TABLE "upward_whatsapp_sessions" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "phone" VARCHAR(255),
    "phoneHash" VARCHAR(255),
    "state" VARCHAR(255) NOT NULL DEFAULT 'NEW',
    "sessionData" JSONB,
    "lastMessageAt" TIMESTAMP(0),
    "expiresAt" TIMESTAMP(0),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_whatsapp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_whatsapp_transaction_pins" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "upwardUserUuid" UUID NOT NULL,
    "pinHash" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_whatsapp_transaction_pins_pkey" PRIMARY KEY ("id")
);


-- CreateIndex
CREATE UNIQUE INDEX "upward_whatsapp_sessions_uuid_unique" ON "upward_whatsapp_sessions"("uuid");

-- CreateIndex
CREATE INDEX "upward_whatsapp_sessions_expiresat_index" ON "upward_whatsapp_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "upward_whatsapp_sessions_lastmessageat_index" ON "upward_whatsapp_sessions"("lastMessageAt");

-- CreateIndex
CREATE INDEX "upward_whatsapp_sessions_phone_index" ON "upward_whatsapp_sessions"("phone");

-- CreateIndex
CREATE INDEX "upward_whatsapp_sessions_phonehash_index" ON "upward_whatsapp_sessions"("phoneHash");

-- CreateIndex
CREATE UNIQUE INDEX "upward_whatsapp_transaction_pins_uuid_unique" ON "upward_whatsapp_transaction_pins"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_whatsapp_transaction_pins_upwarduseruuid_unique" ON "upward_whatsapp_transaction_pins"("upwardUserUuid");

-- CreateIndex
CREATE INDEX "upward_whatsapp_transaction_pins_upwarduseruuid_index" ON "upward_whatsapp_transaction_pins"("upwardUserUuid");
