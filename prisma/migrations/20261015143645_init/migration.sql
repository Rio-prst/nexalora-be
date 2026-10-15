-- CreateEnum
CREATE TYPE "GradeLevel" AS ENUM ('XI', 'XII', 'OTHER');

-- CreateEnum
CREATE TYPE "RelocationMode" AS ENUM ('STAY', 'OPEN', 'SELECTED');

-- CreateEnum
CREATE TYPE "HousingMode" AS ENUM ('FAMILY', 'RENT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ScholarshipStatus" AS ENUM ('UPCOMING', 'OPEN', 'CLOSED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('DRAFT', 'RUNNING', 'RESULT_READY', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'REVIEWED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'DOING', 'DONE', 'SKIPPED');

-- CreateTable
CREATE TABLE "sources" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "publisher" VARCHAR(160) NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "applicable_year" INTEGER NOT NULL,
    "checked_at" TIMESTAMPTZ(6) NOT NULL,
    "review_status" VARCHAR(40) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "majors" (
    "id" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "summary" TEXT NOT NULL,
    "heuristic_weights_json" JSONB NOT NULL,
    "prep_subjects_json" JSONB NOT NULL,
    "publication_status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "majors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "universities" (
    "id" VARCHAR(40) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "city_code" VARCHAR(40) NOT NULL,
    "province_code" VARCHAR(40) NOT NULL,
    "official_website" TEXT NOT NULL,

    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" VARCHAR(80) NOT NULL,
    "major_id" VARCHAR(40) NOT NULL,
    "university_id" VARCHAR(40) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "campus_location" VARCHAR(160) NOT NULL,
    "degree" VARCHAR(60) NOT NULL,
    "admission_paths_json" JSONB NOT NULL,
    "source_id" UUID NOT NULL,
    "publication_status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_profiles" (
    "id" UUID NOT NULL,
    "program_id" VARCHAR(80) NOT NULL,
    "academic_year" INTEGER NOT NULL,
    "admission_track" VARCHAR(60) NOT NULL,
    "housing_mode" "HousingMode" NOT NULL,
    "version" VARCHAR(40) NOT NULL,
    "components_json" JSONB NOT NULL,
    "source_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curricula" (
    "id" UUID NOT NULL,
    "program_id" VARCHAR(80) NOT NULL,
    "curriculum_year" INTEGER NOT NULL,
    "version" VARCHAR(40) NOT NULL,
    "rules_json" JSONB NOT NULL,
    "source_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scholarships" (
    "id" VARCHAR(80) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "organizer" VARCHAR(160) NOT NULL,
    "aid_type" VARCHAR(60) NOT NULL,
    "scope_json" JSONB NOT NULL,
    "benefits_json" JSONB NOT NULL,
    "dates_json" JSONB NOT NULL,
    "status" "ScholarshipStatus" NOT NULL DEFAULT 'UNKNOWN',
    "source_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scholarships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missions" (
    "id" VARCHAR(80) NOT NULL,
    "mission_version" VARCHAR(40) NOT NULL,
    "engine_version" VARCHAR(40) NOT NULL,
    "major_id" VARCHAR(40) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "config_json" JSONB NOT NULL,
    "reviewer_name" VARCHAR(120) NOT NULL,
    "publication_status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "careers" (
    "id" VARCHAR(80) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "summary" TEXT NOT NULL,
    "activities_json" JSONB NOT NULL,
    "reviewed_by" VARCHAR(120) NOT NULL,
    "source_ids_json" JSONB NOT NULL,
    "publication_status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "careers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_majors" (
    "career_id" VARCHAR(80) NOT NULL,
    "major_id" VARCHAR(40) NOT NULL,
    "mapping_reason" TEXT NOT NULL,

    CONSTRAINT "career_majors_pkey" PRIMARY KEY ("career_id","major_id")
);

-- CreateTable
CREATE TABLE "career_skills" (
    "career_id" VARCHAR(80) NOT NULL,
    "skill_id" VARCHAR(80) NOT NULL,

    CONSTRAINT "career_skills_pkey" PRIMARY KEY ("career_id","skill_id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "user_id" UUID NOT NULL,
    "display_name" VARCHAR(120),
    "grade_level" "GradeLevel",
    "graduation_year" INTEGER,
    "city_code" VARCHAR(40),
    "province_code" VARCHAR(40),
    "relocation_mode" "RelocationMode",
    "preferred_regions_json" JSONB,
    "preferred_majors_json" JSONB,
    "monthly_budget_min" INTEGER,
    "monthly_budget_max" INTEGER,
    "upfront_budget_max" INTEGER,
    "housing_mode" "HousingMode",
    "pinned_programs_json" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose_version" VARCHAR(40) NOT NULL,
    "is_accepted" BOOLEAN NOT NULL,
    "consented_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subject" VARCHAR(100) NOT NULL,
    "semester" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "scale" VARCHAR(20) NOT NULL DEFAULT '0-100',

    CONSTRAINT "academic_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interest_submissions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "instrument_version" VARCHAR(40) NOT NULL,
    "answers_json" JSONB NOT NULL,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interest_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_runs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "profile_version" INTEGER NOT NULL,
    "rule_version" VARCHAR(40) NOT NULL,
    "catalog_version" VARCHAR(40) NOT NULL,
    "inputs_snapshot_json" JSONB NOT NULL,
    "results_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "mission_id" VARCHAR(80) NOT NULL,
    "mission_version" VARCHAR(40) NOT NULL,
    "seed" VARCHAR(64) NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'DRAFT',
    "artifact_json" JSONB,
    "result_json" JSONB,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "last_run_revision" INTEGER,
    "idempotency_key" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reflections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "responses_json" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reflections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortlists" (
    "user_id" UUID NOT NULL,
    "program_ids_json" JSONB NOT NULL,
    "base_version" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shortlists_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "scenarios" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "base_profile_version" INTEGER NOT NULL,
    "overrides_json" JSONB NOT NULL,
    "results_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "goal_ids_json" JSONB NOT NULL,
    "weekly_minutes" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "idempotency_key" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "prerequisite_task_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "action_type" VARCHAR(60) NOT NULL,
    "estimated_minutes" INTEGER NOT NULL,
    "due_date" DATE NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "evidence_note" TEXT,
    "evidence_url" TEXT,
    "source_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passports" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "redactions_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "event_name" VARCHAR(120) NOT NULL,
    "request_id" VARCHAR(80),
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sources_publisher_idx" ON "sources"("publisher");

-- CreateIndex
CREATE INDEX "programs_major_id_publication_status_idx" ON "programs"("major_id", "publication_status");

-- CreateIndex
CREATE INDEX "programs_university_id_idx" ON "programs"("university_id");

-- CreateIndex
CREATE INDEX "cost_profiles_program_id_idx" ON "cost_profiles"("program_id");

-- CreateIndex
CREATE UNIQUE INDEX "cost_profiles_program_id_academic_year_admission_track_hous_key" ON "cost_profiles"("program_id", "academic_year", "admission_track", "housing_mode", "version");

-- CreateIndex
CREATE INDEX "curricula_program_id_idx" ON "curricula"("program_id");

-- CreateIndex
CREATE UNIQUE INDEX "curricula_program_id_curriculum_year_version_key" ON "curricula"("program_id", "curriculum_year", "version");

-- CreateIndex
CREATE INDEX "scholarships_status_idx" ON "scholarships"("status");

-- CreateIndex
CREATE INDEX "missions_major_id_idx" ON "missions"("major_id");

-- CreateIndex
CREATE INDEX "career_majors_major_id_idx" ON "career_majors"("major_id");

-- CreateIndex
CREATE INDEX "career_skills_skill_id_idx" ON "career_skills"("skill_id");

-- CreateIndex
CREATE INDEX "consents_user_id_idx" ON "consents"("user_id");

-- CreateIndex
CREATE INDEX "academic_records_user_id_idx" ON "academic_records"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "academic_records_user_id_subject_semester_key" ON "academic_records"("user_id", "subject", "semester");

-- CreateIndex
CREATE INDEX "interest_submissions_user_id_submitted_at_idx" ON "interest_submissions"("user_id", "submitted_at");

-- CreateIndex
CREATE INDEX "recommendation_runs_user_id_created_at_idx" ON "recommendation_runs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "attempts_user_id_created_at_idx" ON "attempts"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "attempts_user_id_idempotency_key_key" ON "attempts"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "reflections_user_id_is_active_idx" ON "reflections"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "reflections_attempt_id_revision_key" ON "reflections"("attempt_id", "revision");

-- CreateIndex
CREATE INDEX "scenarios_user_id_created_at_idx" ON "scenarios"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "plans_user_id_status_idx" ON "plans"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "plans_user_id_idempotency_key_key" ON "plans"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "tasks_plan_id_idx" ON "tasks"("plan_id");

-- CreateIndex
CREATE INDEX "tasks_prerequisite_task_id_idx" ON "tasks"("prerequisite_task_id");

-- CreateIndex
CREATE INDEX "passports_owner_id_created_at_idx" ON "passports"("owner_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_event_name_created_at_idx" ON "audit_logs"("event_name", "created_at");

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_profiles" ADD CONSTRAINT "cost_profiles_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_profiles" ADD CONSTRAINT "cost_profiles_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curricula" ADD CONSTRAINT "curricula_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curricula" ADD CONSTRAINT "curricula_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_majors" ADD CONSTRAINT "career_majors_career_id_fkey" FOREIGN KEY ("career_id") REFERENCES "careers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_majors" ADD CONSTRAINT "career_majors_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_skills" ADD CONSTRAINT "career_skills_career_id_fkey" FOREIGN KEY ("career_id") REFERENCES "careers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_skills" ADD CONSTRAINT "career_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_records" ADD CONSTRAINT "academic_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interest_submissions" ADD CONSTRAINT "interest_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_runs" ADD CONSTRAINT "recommendation_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reflections" ADD CONSTRAINT "reflections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reflections" ADD CONSTRAINT "reflections_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlists" ADD CONSTRAINT "shortlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_prerequisite_task_id_fkey" FOREIGN KEY ("prerequisite_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passports" ADD CONSTRAINT "passports_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
