-- AlterTable
ALTER TABLE "Block" ADD COLUMN     "draftContent" JSONB,
ADD COLUMN     "draftDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "draftOrder" INTEGER;

