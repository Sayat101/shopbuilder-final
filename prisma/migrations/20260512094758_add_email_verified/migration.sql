-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingAddress" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false;
