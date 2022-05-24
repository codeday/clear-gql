-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "adultWaiverId" TEXT,
ADD COLUMN     "minorWaiverId" TEXT;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "waiverSignedId" TEXT,
ADD COLUMN     "waiverTrackingId" TEXT,
ADD COLUMN     "waiverUrl" TEXT;
