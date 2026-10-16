-- AlterTable
ALTER TABLE "careers" ADD COLUMN     "certifications_json" JSONB,
ADD COLUMN     "challenges_json" JSONB,
ADD COLUMN     "industry" VARCHAR(120),
ADD COLUMN     "outlook" VARCHAR(60),
ADD COLUMN     "salary_range_max" INTEGER,
ADD COLUMN     "salary_range_min" INTEGER;

-- AlterTable
ALTER TABLE "missions" ADD COLUMN     "content_json" JSONB,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "estimated_minutes" INTEGER;

-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "passing_grade_snbt" DOUBLE PRECISION,
ADD COLUMN     "quota" INTEGER,
ADD COLUMN     "ukt_range_max" INTEGER,
ADD COLUMN     "ukt_range_min" INTEGER;

-- AlterTable
ALTER TABLE "universities" ADD COLUMN     "accreditation" TEXT,
ADD COLUMN     "institutionType" VARCHAR(20);

-- CreateTable
CREATE TABLE "interest_questions" (
    "id" SERIAL NOT NULL,
    "item_id" VARCHAR(40) NOT NULL,
    "dimension" VARCHAR(40) NOT NULL,
    "cluster" VARCHAR(60) NOT NULL,
    "category" VARCHAR(120) NOT NULL,
    "prompt" TEXT NOT NULL,
    "subtext" TEXT,
    "position" INTEGER NOT NULL,
    "instrument_version" VARCHAR(40) NOT NULL,

    CONSTRAINT "interest_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_submissions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "mission_id" VARCHAR(80) NOT NULL,
    "file_name" VARCHAR(200) NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "student_notes" TEXT,
    "checklist_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "review_status" VARCHAR(40),
    "rating_stars" INTEGER,
    "review_notes" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulation_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mini_course_passports" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "mission_id" VARCHAR(80) NOT NULL,
    "certificate_number" VARCHAR(60) NOT NULL,
    "completed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mini_course_passports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "interest_questions_item_id_key" ON "interest_questions"("item_id");

-- CreateIndex
CREATE INDEX "interest_questions_instrument_version_position_idx" ON "interest_questions"("instrument_version", "position");

-- CreateIndex
CREATE INDEX "simulation_submissions_user_id_created_at_idx" ON "simulation_submissions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "simulation_submissions_mission_id_idx" ON "simulation_submissions"("mission_id");

-- CreateIndex
CREATE UNIQUE INDEX "mini_course_passports_certificate_number_key" ON "mini_course_passports"("certificate_number");

-- CreateIndex
CREATE INDEX "mini_course_passports_user_id_completed_at_idx" ON "mini_course_passports"("user_id", "completed_at");

-- AddForeignKey
ALTER TABLE "simulation_submissions" ADD CONSTRAINT "simulation_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_submissions" ADD CONSTRAINT "simulation_submissions_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mini_course_passports" ADD CONSTRAINT "mini_course_passports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mini_course_passports" ADD CONSTRAINT "mini_course_passports_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
