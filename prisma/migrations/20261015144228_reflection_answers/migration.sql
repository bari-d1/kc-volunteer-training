-- CreateTable
CREATE TABLE "ReflectionAnswer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profileId" UUID NOT NULL,
    "blockId" UUID,
    "moduleId" UUID NOT NULL,
    "prompt" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReflectionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReflectionAnswer_blockId_idx" ON "ReflectionAnswer"("blockId");

-- CreateIndex
CREATE INDEX "ReflectionAnswer_moduleId_idx" ON "ReflectionAnswer"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ReflectionAnswer_profileId_blockId_key" ON "ReflectionAnswer"("profileId", "blockId");

-- AddForeignKey
ALTER TABLE "ReflectionAnswer" ADD CONSTRAINT "ReflectionAnswer_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReflectionAnswer" ADD CONSTRAINT "ReflectionAnswer_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReflectionAnswer" ADD CONSTRAINT "ReflectionAnswer_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Keep the Supabase Data API locked out, like every other table.
ALTER TABLE "ReflectionAnswer" ENABLE ROW LEVEL SECURITY;
