-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "cutoffs" (
    "id" SERIAL NOT NULL,
    "counselling_type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "institute_name" TEXT NOT NULL,
    "institute_type" TEXT NOT NULL,
    "branch_name" TEXT NOT NULL,
    "quota" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "opening_rank" INTEGER NOT NULL,
    "closing_rank" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cutoffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_counselling_type" ON "cutoffs"("counselling_type");

-- CreateIndex
CREATE INDEX "idx_year" ON "cutoffs"("year");

-- CreateIndex
CREATE INDEX "idx_round" ON "cutoffs"("round");

-- CreateIndex
CREATE INDEX "idx_category" ON "cutoffs"("category");

-- CreateIndex
CREATE INDEX "idx_gender" ON "cutoffs"("gender");

-- CreateIndex
CREATE INDEX "idx_quota" ON "cutoffs"("quota");

-- CreateIndex
CREATE INDEX "idx_closing_rank" ON "cutoffs"("closing_rank");

-- CreateIndex
CREATE INDEX "idx_composite_main" ON "cutoffs"("counselling_type", "year", "category", "gender");

