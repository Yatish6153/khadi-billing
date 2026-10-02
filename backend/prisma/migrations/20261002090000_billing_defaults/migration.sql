-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "defaultDiscountPercent" DECIMAL(5,2) NOT NULL DEFAULT 50,
ADD COLUMN     "defaultGstRate" DECIMAL(5,2) NOT NULL DEFAULT 5;

