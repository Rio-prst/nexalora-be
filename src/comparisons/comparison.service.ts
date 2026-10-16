import { Inject, Injectable } from '@nestjs/common';
import { notFound, versionConflict } from '../common/errors/app-error.js';
import {
  costFeasibility,
  monthlyEquivalent,
  upfrontMaximum,
} from '../recommendations/recommendation-calculator.js';
import type { CreateScenarioDto, SaveShortlistDto } from './comparison.dto.js';
import { IComparisonRepository } from './interfaces/comparison.repository.interface.js';
import type {
  ScenarioProgramResult,
  ScenarioResult,
  ShortlistSnapshot,
} from './interfaces/comparison.repository.interface.js';
import type { IComparisonService } from './interfaces/comparison.service.interface.js';

@Injectable()
export class ComparisonService implements IComparisonService {
  constructor(
    @Inject(IComparisonRepository)
    private readonly repository: IComparisonRepository,
  ) {}

  async getShortlist(userId: string): Promise<ShortlistSnapshot> {
    const stored = await this.repository.findShortlist(userId);

    return (
      stored ?? {
        programIds: [],
        baseVersion: 0,
        updatedAt: new Date(0).toISOString(),
      }
    );
  }

  async saveShortlist(
    userId: string,
    input: SaveShortlistDto,
  ): Promise<ShortlistSnapshot> {
    const baseline = await this.repository.findBaseline(userId);

    if (!baseline) {
      throw notFound('Profile not found');
    }

    if (
      input.expectedProfileVersion !== undefined &&
      baseline.profileVersion !== input.expectedProfileVersion
    ) {
      throw versionConflict(
        input.expectedProfileVersion,
        baseline.profileVersion,
      );
    }

    return this.repository.saveShortlist(
      userId,
      input.programIds,
      baseline.profileVersion,
    );
  }

  async createScenario(
    userId: string,
    input: CreateScenarioDto,
  ): Promise<ScenarioResult> {
    const baseline = await this.repository.findBaseline(userId);

    if (!baseline) {
      throw notFound('Profile not found');
    }

    const costs = await this.repository.listPublishedCosts(input.programIds);

    const scenarioBudget =
      input.overrides.monthlyBudgetMax !== undefined
        ? input.overrides.monthlyBudgetMax
        : baseline.monthlyBudgetMax;

    const programResults: ScenarioProgramResult[] = costs.map((cost) => {
      const equivalent = monthlyEquivalent(cost.components);

      return {
        programId: cost.programId,
        baseline: costFeasibility(baseline.monthlyBudgetMax, cost.components),
        scenario: costFeasibility(scenarioBudget, cost.components),
        monthlyEquivalentMin: equivalent.min,
        monthlyEquivalentMax: equivalent.max,
        upfrontMax: upfrontMaximum(cost.components),
        sourceYear: cost.sourceYear,
      };
    });

    const results: ScenarioResult = {
      id: 'pending',
      baseProfileVersion: baseline.profileVersion,
      overrides: input.overrides,
      programResults,
      persistedToProfile: false,
    };

    const stored = await this.repository.insertScenario({
      userId,
      baseProfileVersion: baseline.profileVersion,
      overrides: input.overrides,
      results,
    });

    return { ...results, id: stored.id };
  }
}
