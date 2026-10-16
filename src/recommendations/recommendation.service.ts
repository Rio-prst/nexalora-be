import { Inject, Injectable } from '@nestjs/common';
import { notFound, versionConflict } from '../common/errors/app-error.js';
import type { CreateRecommendationDto } from './dto/create-recommendation.dto.js';
import type {
  ExperienceStatus,
  MajorRecommendation,
  ProgramRecommendation,
  Reason,
  RecommendationRunPayload,
} from './dto/recommendation-run.response.dto.js';
import {
  CATALOG_VERSION,
  RECOMMENDATION_RULE_VERSION,
} from './recommendation.constants.js';
import { academicReadiness } from './recommendation-academic.js';
import {
  combinedScore,
  costFeasibility,
  interestScore,
  monthlyEquivalent,
  normalizeDimension,
  reflectionScore,
  upfrontMaximum,
} from './recommendation-calculator.js';
import { IRecommendationRepository } from './interfaces/recommendation.repository.interface.js';
import type {
  RecommendationInputs,
  StoredCatalogProgram,
} from './interfaces/recommendation.repository.interface.js';
import type { IRecommendationService } from './interfaces/recommendation.service.interface.js';

const NO_COVERAGE = {
  answeredDimensions: 0,
  availableDimensions: [] as string[],
  isSufficientForPersonalization: false,
};

@Injectable()
export class RecommendationService implements IRecommendationService {
  constructor(
    @Inject(IRecommendationRepository)
    private readonly repository: IRecommendationRepository,
  ) {}

  async create(
    userId: string,
    input: CreateRecommendationDto,
  ): Promise<RecommendationRunPayload> {
    const profile = await this.repository.findProfile(userId);

    if (!profile) {
      throw notFound('Profile not found');
    }

    if (profile.version !== input.profileVersion) {
      throw versionConflict(input.profileVersion, profile.version);
    }

    const [interest, majors, programs, reflections] = await Promise.all([
      this.repository.findLatestInterestSubmission(userId),
      this.repository.listPublishedMajors(),
      this.repository.listPublishedPrograms(profile.pinnedPrograms),
      this.repository.findActiveReflections(userId, input.activeReflectionIds),
    ]);

    const inputs: RecommendationInputs = {
      profile,
      interest,
      majors,
      programs,
      reflections,
    };

    const payload = this.buildPayload(inputs);
    const stored = await this.repository.insertRun({
      userId,
      profileVersion: profile.version,
      ruleVersion: RECOMMENDATION_RULE_VERSION,
      catalogVersion: CATALOG_VERSION,
      inputsSnapshot: {
        profileVersion: profile.version,
        expectedCatalogVersion: input.expectedCatalogVersion ?? null,
        interestSubmissionId: interest?.submissionId ?? null,
        reflectionIds: reflections.map((reflection) => reflection.id),
        programIds: programs.map((program) => program.id),
      },
      results: payload,
    });

    return { ...payload, runId: stored.id };
  }

  async latest(userId: string): Promise<RecommendationRunPayload> {
    const stored = await this.repository.findLatestRun(userId);

    if (!stored) {
      throw notFound('No recommendation has been computed yet');
    }

    return stored.results as RecommendationRunPayload;
  }

  private buildPayload(inputs: RecommendationInputs): RecommendationRunPayload {
    const coverage = inputs.interest?.coverage ?? NO_COVERAGE;
    const personalised = coverage.isSufficientForPersonalization;

    const scores = this.dimensionScores(inputs);
    const experience = this.experienceByMajor(inputs);

    const majors: MajorRecommendation[] = inputs.majors.map((major) => {
      const interest = personalised
        ? interestScore(major.weights, scores)
        : null;
      const reflection = reflectionScore(
        this.continueInterestFor(inputs, major.id),
      );

      const reasons: Reason[] = [];

      if (personalised && interest !== null && inputs.interest) {
        reasons.push({
          code: 'ACTIVITY_INTEREST',
          evidenceId: inputs.interest.submissionId,
        });
      }

      if (reflection !== null) {
        reasons.push({
          code: 'REFLECTION_CONTINUE',
          evidenceId: this.activeReflectionIdFor(inputs, major.id) ?? 'unknown',
        });
      }

      if (reasons.length === 0) {
        reasons.push({
          code: 'GENERAL_CATALOGUE',
          evidenceId: major.id,
        });
      }

      return {
        majorId: major.id,
        experienceStatus: experience[major.id] ?? 'NOT_TRIED',
        reasons,
      };
    });

    const majorsById = new Map(
      inputs.majors.map((major) => [major.id, major] as const),
    );

    const scored = inputs.programs.map((program) => {
      const major = majorsById.get(program.majorId);
      const interest =
        personalised && major ? interestScore(major.weights, scores) : null;
      const reflection = reflectionScore(
        this.continueInterestFor(inputs, program.majorId),
      );
      const combined = combinedScore(interest, reflection);

      return { program, combined };
    });

    scored.sort((left, right) => {
      if (left.program.pinnedByStudent !== right.program.pinnedByStudent) {
        return left.program.pinnedByStudent ? -1 : 1;
      }

      const leftScore = left.combined ?? -1;
      const rightScore = right.combined ?? -1;

      if (leftScore !== rightScore) return rightScore - leftScore;

      return left.program.id.localeCompare(right.program.id);
    });

    const items: ProgramRecommendation[] = scored.map(({ program, combined }) =>
      this.toItem(inputs, program, combined),
    );

    return {
      runId: 'pending',
      ruleVersion: RECOMMENDATION_RULE_VERSION,
      catalogVersion: CATALOG_VERSION,
      profileVersion: inputs.profile.version,
      coverage: {
        answeredDimensions: coverage.answeredDimensions,
        isSufficientForPersonalization: coverage.isSufficientForPersonalization,
      },
      majors,
      items,
    };
  }

  private toItem(
    inputs: RecommendationInputs,
    program: StoredCatalogProgram,
    combined: number | null,
  ): ProgramRecommendation {
    const budget = inputs.profile.monthlyBudgetMax;
    const profile = program.costProfiles[0];

    const costStatus =
      profile === undefined
        ? ('INSUFFICIENT_DATA' as const)
        : costFeasibility(budget, profile.components);

    const equivalent =
      profile === undefined ? null : monthlyEquivalent(profile.components);

    const reasons: Reason[] = [];

    if (program.pinnedByStudent) {
      reasons.push({ code: 'PINNED_BY_STUDENT', evidenceId: program.id });
    }

    if (
      inputs.interest &&
      inputs.interest.coverage.isSufficientForPersonalization &&
      combined !== null
    ) {
      reasons.push({
        code: 'ACTIVITY_INTEREST',
        evidenceId: inputs.interest.submissionId,
      });
    }

    if (reasons.length === 0) {
      reasons.push({ code: 'GENERAL_CATALOGUE', evidenceId: program.id });
    }

    const major = inputs.majors.find((entry) => entry.id === program.majorId);

    const academicStatus = academicReadiness(
      inputs.profile.recordedSubjects,
      major?.prepSubjects ?? [],
    );

    return {
      programId: program.id,
      isPinned: program.pinnedByStudent,
      reasons,
      academicStatus,
      costStatus,
      costBreakdown:
        profile === undefined
          ? null
          : {
              monthlyEquivalentMin: equivalent?.min ?? null,
              monthlyEquivalentMax: equivalent?.max ?? null,
              upfrontMax: upfrontMaximum(profile.components),
              sourceYear: profile.sourceYear,
            },
      admissionProbability: null,
    };
  }

  private dimensionScores(
    inputs: RecommendationInputs,
  ): Record<string, number> {
    const scores: Record<string, number> = {};

    for (const [dimension, values] of Object.entries(
      inputs.interest?.numericByDimension ?? {},
    )) {
      const normalized = normalizeDimension(values);
      if (normalized !== null) scores[dimension] = normalized;
    }

    return scores;
  }

  private experienceByMajor(
    inputs: RecommendationInputs,
  ): Record<string, ExperienceStatus> {
    const experience: Record<string, ExperienceStatus> = {};

    for (const reflection of inputs.reflections) {
      experience[reflection.majorId] = 'TRIED';
    }

    return experience;
  }

  private continueInterestFor(
    inputs: RecommendationInputs,
    majorId: string,
  ): number | null {
    const match = inputs.reflections.find(
      (reflection) => reflection.majorId === majorId,
    );
    return match?.continueInterest ?? null;
  }

  private activeReflectionIdFor(
    inputs: RecommendationInputs,
    majorId: string,
  ): string | null {
    const match = inputs.reflections.find(
      (reflection) => reflection.majorId === majorId,
    );
    return match?.id ?? null;
  }
}
