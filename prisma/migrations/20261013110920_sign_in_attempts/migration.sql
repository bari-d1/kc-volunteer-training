-- CreateTable
CREATE TABLE "SignInAttempt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "emailHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignInAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SignInAttempt_emailHash_createdAt_idx" ON "SignInAttempt"("emailHash", "createdAt");

-- CreateIndex
CREATE INDEX "SignInAttempt_createdAt_idx" ON "SignInAttempt"("createdAt");


-- Keep the Supabase Data API out (see lock_down_supabase_api).
ALTER TABLE "SignInAttempt" ENABLE ROW LEVEL SECURITY;
