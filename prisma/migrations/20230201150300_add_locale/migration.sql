-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT E'en-US';
ALTER TABLE "Person" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT E'en-US';
