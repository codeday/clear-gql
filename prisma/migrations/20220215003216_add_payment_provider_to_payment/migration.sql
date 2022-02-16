-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "paymentProvider" TEXT NOT NULL DEFAULT E'stripe';
