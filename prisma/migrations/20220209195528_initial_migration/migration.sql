-- CreateEnum
CREATE TYPE "MetadataVisibility" AS ENUM ('PUBLIC', 'INTERNAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('STUDENT', 'TEACHER', 'VIP', 'MENTOR', 'JUDGE', 'STAFF');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('SUBTRACT', 'PERCENT');

-- CreateEnum
CREATE TYPE "EmailWhenFrom" AS ENUM ('REGISTER', 'EVENTSTART', 'EVENTEND');

-- CreateTable
CREATE TABLE "EventGroup" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "ticketPrice" DOUBLE PRECISION NOT NULL,
    "earlyBirdPrice" DOUBLE PRECISION NOT NULL,
    "earlyBirdCutoff" TIMESTAMP(3) NOT NULL,
    "registrationCutoff" TIMESTAMP(3) NOT NULL,
    "showcaseId" TEXT,

    CONSTRAINT "EventGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "ticketPrice" DOUBLE PRECISION NOT NULL,
    "earlyBirdPrice" DOUBLE PRECISION NOT NULL,
    "earlyBirdCutoff" TIMESTAMP(3) NOT NULL,
    "registrationCutoff" TIMESTAMP(3) NOT NULL,
    "managers" TEXT[],
    "registrationsOpen" BOOLEAN NOT NULL DEFAULT false,
    "contentfulWebname" TEXT,
    "showcaseId" TEXT,
    "timezone" TEXT,
    "majorityAge" INTEGER NOT NULL DEFAULT 18,
    "eventGroupId" TEXT NOT NULL,
    "venueId" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "address" TEXT,
    "mapLink" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "name" TEXT NOT NULL,
    "link" TEXT,
    "logoImageUri" TEXT,
    "description" TEXT,
    "perks" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "eventId" TEXT,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "age" INTEGER,
    "username" TEXT,
    "pronouns" TEXT,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "age" INTEGER,
    "waiverSigned" BOOLEAN NOT NULL DEFAULT false,
    "couponCode" TEXT,
    "type" "TicketType" NOT NULL DEFAULT E'STUDENT',
    "eventId" TEXT NOT NULL,
    "personId" TEXT,
    "promoCodeId" TEXT,
    "paymentId" TEXT,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "stripePaymentIntentId" TEXT NOT NULL,
    "complete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "type" TEXT NOT NULL DEFAULT E'Event',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "link" TEXT,
    "hostName" TEXT,
    "hostEmail" TEXT,
    "hostPronoun" TEXT,
    "organizerName" TEXT,
    "organizerEmail" TEXT,
    "organizerPhone" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3),
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "eventId" TEXT,
    "eventGroupId" TEXT,

    CONSTRAINT "ScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "code" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "uses" INTEGER,
    "eventGroupId" TEXT,
    "eventId" TEXT,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailingListMember" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "email" TEXT NOT NULL,
    "lastEmailed" TIMESTAMP(3),

    CONSTRAINT "MailingListMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "name" TEXT NOT NULL,
    "automatic" BOOLEAN NOT NULL DEFAULT false,
    "fromName" TEXT NOT NULL DEFAULT E'John Peter',
    "fromEmail" TEXT NOT NULL DEFAULT E'team@codeday.org',
    "replyTo" TEXT NOT NULL DEFAULT E'team@codeday.org',
    "subject" TEXT NOT NULL,
    "sendTo" "TicketType" NOT NULL,
    "when" TEXT NOT NULL,
    "whenFrom" "EmailWhenFrom" NOT NULL,
    "sendLate" BOOLEAN NOT NULL DEFAULT false,
    "sendInWorkHours" BOOLEAN NOT NULL DEFAULT false,
    "sendAfterEvent" BOOLEAN NOT NULL DEFAULT false,
    "sendParent" BOOLEAN NOT NULL DEFAULT false,
    "template" TEXT NOT NULL,
    "marketing" BOOLEAN NOT NULL DEFAULT false,
    "extraFilters" JSONB,
    "sendText" BOOLEAN NOT NULL DEFAULT false,
    "textMsg" TEXT,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRestriction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "name" TEXT NOT NULL,
    "iconUri" TEXT,
    "title" TEXT NOT NULL,
    "details" TEXT,

    CONSTRAINT "EventRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EventToEventRestriction" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_EventToMailingListMember" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_EmailTemplateToTicket" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "MailingListMember_email_key" ON "MailingListMember"("email");

-- CreateIndex
CREATE UNIQUE INDEX "_EventToEventRestriction_AB_unique" ON "_EventToEventRestriction"("A", "B");

-- CreateIndex
CREATE INDEX "_EventToEventRestriction_B_index" ON "_EventToEventRestriction"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_EventToMailingListMember_AB_unique" ON "_EventToMailingListMember"("A", "B");

-- CreateIndex
CREATE INDEX "_EventToMailingListMember_B_index" ON "_EventToMailingListMember"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_EmailTemplateToTicket_AB_unique" ON "_EmailTemplateToTicket"("A", "B");

-- CreateIndex
CREATE INDEX "_EmailTemplateToTicket_B_index" ON "_EmailTemplateToTicket"("B");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_eventGroupId_fkey" FOREIGN KEY ("eventGroupId") REFERENCES "EventGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_eventGroupId_fkey" FOREIGN KEY ("eventGroupId") REFERENCES "EventGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_eventGroupId_fkey" FOREIGN KEY ("eventGroupId") REFERENCES "EventGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToEventRestriction" ADD FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToEventRestriction" ADD FOREIGN KEY ("B") REFERENCES "EventRestriction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToMailingListMember" ADD FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToMailingListMember" ADD FOREIGN KEY ("B") REFERENCES "MailingListMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmailTemplateToTicket" ADD FOREIGN KEY ("A") REFERENCES "EmailTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmailTemplateToTicket" ADD FOREIGN KEY ("B") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
