-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CommandReceiptStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "OutboxDeliveryStatus" AS ENUM ('PENDING', 'LEASED', 'ENQUEUED', 'ACKED', 'DEAD');

-- CreateEnum
CREATE TYPE "ConsumerInboxStatus" AS ENUM ('PROCESSING', 'RETRYABLE', 'COMPLETED', 'DEAD');

-- CreateTable
CREATE TABLE "command_receipt" (
    "id" UUID NOT NULL,
    "commandType" VARCHAR(120) NOT NULL,
    "idempotencyKey" VARCHAR(200) NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "status" "CommandReceiptStatus" NOT NULL DEFAULT 'PROCESSING',
    "result" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "command_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_event" (
    "id" UUID NOT NULL,
    "eventName" VARCHAR(120) NOT NULL,
    "eventVersion" SMALLINT NOT NULL,
    "aggregateType" VARCHAR(64) NOT NULL,
    "aggregateId" VARCHAR(128) NOT NULL,
    "aggregateSequence" BIGINT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadHash" CHAR(64) NOT NULL,
    "correlationId" VARCHAR(128),
    "causationId" VARCHAR(128),
    "actorId" VARCHAR(128),
    "traceparent" VARCHAR(256),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_delivery" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "consumerKey" VARCHAR(120) NOT NULL,
    "queueName" VARCHAR(120) NOT NULL,
    "jobName" VARCHAR(120) NOT NULL,
    "status" "OutboxDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "dispatchAttempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseOwner" VARCHAR(128),
    "leaseExpiresAt" TIMESTAMPTZ(3),
    "bullmqJobId" VARCHAR(200),
    "enqueuedAt" TIMESTAMPTZ(3),
    "acknowledgedAt" TIMESTAMPTZ(3),
    "deadLetteredAt" TIMESTAMPTZ(3),
    "lastErrorKind" VARCHAR(64),
    "lastErrorCode" VARCHAR(64),
    "lastErrorSummary" VARCHAR(500),
    "lastErrorAt" TIMESTAMPTZ(3),
    "replayCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "outbox_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_inbox" (
    "consumerKey" VARCHAR(120) NOT NULL,
    "eventId" UUID NOT NULL,
    "deliveryId" UUID NOT NULL,
    "payloadHash" CHAR(64) NOT NULL,
    "status" "ConsumerInboxStatus" NOT NULL DEFAULT 'PROCESSING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "leaseOwner" VARCHAR(128),
    "leaseExpiresAt" TIMESTAMPTZ(3),
    "aggregateType" VARCHAR(64),
    "aggregateId" VARCHAR(128),
    "aggregateSequence" BIGINT,
    "firstReceivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReceivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "lastErrorKind" VARCHAR(64),
    "lastErrorCode" VARCHAR(64),
    "lastErrorSummary" VARCHAR(500),
    "lastErrorAt" TIMESTAMPTZ(3),

    CONSTRAINT "consumer_inbox_pkey" PRIMARY KEY ("consumerKey","eventId")
);

-- CreateIndex
CREATE INDEX "command_receipt_status_created_idx" ON "command_receipt"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "command_receipt_type_key_uq" ON "command_receipt"("commandType", "idempotencyKey");

-- CreateIndex
CREATE INDEX "outbox_event_aggregate_idx" ON "outbox_event"("aggregateType", "aggregateId", "aggregateSequence");

-- CreateIndex
CREATE INDEX "outbox_event_correlation_idx" ON "outbox_event"("correlationId", "createdAt");

-- CreateIndex
CREATE INDEX "outbox_event_created_idx" ON "outbox_event"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_event_dedupe_uq" ON "outbox_event"("aggregateType", "aggregateId", "aggregateSequence", "eventName");

-- CreateIndex
CREATE INDEX "outbox_delivery_claim_idx" ON "outbox_delivery"("status", "nextAttemptAt", "createdAt", "id");

-- CreateIndex
CREATE INDEX "outbox_delivery_lease_idx" ON "outbox_delivery"("status", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX "outbox_delivery_unacked_idx" ON "outbox_delivery"("status", "enqueuedAt");

-- CreateIndex
CREATE INDEX "outbox_delivery_dead_idx" ON "outbox_delivery"("status", "deadLetteredAt");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_delivery_event_consumer_uq" ON "outbox_delivery"("eventId", "consumerKey");

-- CreateIndex
CREATE INDEX "consumer_inbox_lease_idx" ON "consumer_inbox"("status", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX "consumer_inbox_aggregate_idx" ON "consumer_inbox"("aggregateType", "aggregateId", "aggregateSequence");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_inbox_delivery_uq" ON "consumer_inbox"("consumerKey", "deliveryId");

-- AddForeignKey
ALTER TABLE "outbox_delivery" ADD CONSTRAINT "outbox_delivery_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "outbox_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
