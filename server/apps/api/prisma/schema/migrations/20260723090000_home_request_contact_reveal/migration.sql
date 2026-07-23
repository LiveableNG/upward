-- Track which PMs revealed prospect contact on a home request.
CREATE TABLE "upward_home_request_contact_reveal" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "homeRequestId" INTEGER NOT NULL,
    "pmId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_home_request_contact_reveal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "upward_home_request_contact_reveal_uuid_key" ON "upward_home_request_contact_reveal"("uuid");
CREATE UNIQUE INDEX "upward_home_request_contact_reveal_homeRequestId_pmId_key" ON "upward_home_request_contact_reveal"("homeRequestId", "pmId");
CREATE INDEX "upward_home_request_contact_reveal_pmId_idx" ON "upward_home_request_contact_reveal"("pmId");
CREATE INDEX "upward_home_request_contact_reveal_createdAt_idx" ON "upward_home_request_contact_reveal"("createdAt");

ALTER TABLE "upward_home_request_contact_reveal"
  ADD CONSTRAINT "upward_home_request_contact_reveal_homeRequestId_fkey"
  FOREIGN KEY ("homeRequestId") REFERENCES "upward_home_request"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
