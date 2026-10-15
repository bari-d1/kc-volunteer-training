-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "optionOrder" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "answers" SET DEFAULT '{}',
ALTER COLUMN "score" DROP NOT NULL,
ALTER COLUMN "passed" SET DEFAULT false,
ALTER COLUMN "submittedAt" DROP NOT NULL,
ALTER COLUMN "submittedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "QuizAttempt_profileId_courseId_idx" ON "QuizAttempt"("profileId", "courseId");

