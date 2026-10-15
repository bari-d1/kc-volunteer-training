-- AlterTable: existing questions predate topics, so they get "general".
ALTER TABLE "QuizQuestion" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "group" TEXT,
ADD COLUMN     "topic" TEXT NOT NULL DEFAULT 'general';
ALTER TABLE "QuizQuestion" ALTER COLUMN "topic" DROP DEFAULT;

-- CreateTable
CREATE TABLE "QuizSection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "courseId" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizSection_pkey" PRIMARY KEY ("id")
);

-- Keep the Supabase Data API locked out, like every other table.
ALTER TABLE "QuizSection" ENABLE ROW LEVEL SECURITY;

-- CreateIndex
CREATE UNIQUE INDEX "QuizSection_courseId_topic_key" ON "QuizSection"("courseId", "topic");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestion_courseId_externalId_key" ON "QuizQuestion"("courseId", "externalId");

-- AddForeignKey
ALTER TABLE "QuizSection" ADD CONSTRAINT "QuizSection_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
