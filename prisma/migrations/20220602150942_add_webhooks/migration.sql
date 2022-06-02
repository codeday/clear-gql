-- CreateEnum
CREATE TYPE "WebhookService" AS ENUM ('DISCORD', 'EMAIL');

-- CreateEnum
CREATE TYPE "WebhookType" AS ENUM ('ALL', 'DIGEST');

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "service" "WebhookService" NOT NULL,
    "type" "WebhookType" NOT NULL,
    "sink" TEXT NOT NULL,
    "eventId" TEXT,
    "eventGroupId" TEXT,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_eventGroupId_fkey" FOREIGN KEY ("eventGroupId") REFERENCES "EventGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
