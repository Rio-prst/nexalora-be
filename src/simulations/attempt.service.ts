import { Inject, Injectable } from '@nestjs/common';
import { notFound, versionConflict } from '../common/errors/app-error.js';
import { checkDkvMenu, type DkvMenu } from './dkv-checker.js';
import type {
  CreateAttemptDto,
  RunAttemptDto,
  UpdateAttemptDto,
} from './dto/attempt.dto.js';
import { IAttemptRepository } from './interfaces/attempt.repository.interface.js';
import type {
  AttemptSnapshot,
  StoredMission,
} from './interfaces/attempt.repository.interface.js';
import type { IAttemptService } from './interfaces/attempt.service.interface.js';
import {
  INF_ORDER_GRAPH,
  indScenarioCapacity,
  isValidIndAllocation,
  runIndSimulation,
  runInfGraph,
  type IndAllocation,
  type InfInput,
} from './simulation-engines.js';

type RunOutcome = Record<string, unknown>;

@Injectable()
export class AttemptService implements IAttemptService {
  constructor(
    @Inject(IAttemptRepository) private readonly repository: IAttemptRepository,
  ) {}

  async create(
    userId: string,
    idempotencyKey: string,
    input: CreateAttemptDto,
  ): Promise<{ attempt: AttemptSnapshot; replayed: boolean }> {
    const replay = await this.repository.findByIdempotencyKey(
      userId,
      idempotencyKey,
    );

    if (replay) {
      return { attempt: replay, replayed: true };
    }

    const mission = await this.repository.findMission(input.missionId);

    if (!mission) {
      throw notFound('Mission not found');
    }

    const attempt = await this.repository.insert({
      userId,
      missionId: mission.id,
      missionVersion: mission.missionVersion,
      seed: input.seed,
      idempotencyKey,
      draftArtifact: input.draftArtifact ?? null,
    });

    return { attempt, replayed: false };
  }

  async get(userId: string, id: string): Promise<AttemptSnapshot> {
    const attempt = await this.repository.findOwned(userId, id);

    if (!attempt) {
      throw notFound('Attempt not found');
    }

    return attempt;
  }

  async saveDraft(
    userId: string,
    id: string,
    input: UpdateAttemptDto,
  ): Promise<AttemptSnapshot> {
    await this.get(userId, id);

    const updated = await this.repository.saveDraft(
      userId,
      id,
      input.expectedRevision,
      input.draftArtifact,
    );

    if (!updated) {
      const current = await this.get(userId, id);
      throw versionConflict(input.expectedRevision, current.revision);
    }

    return updated;
  }

  async run(
    userId: string,
    id: string,
    input: RunAttemptDto,
  ): Promise<AttemptSnapshot> {
    const attempt = await this.get(userId, id);

    if (attempt.revision !== input.expectedRevision) {
      throw versionConflict(input.expectedRevision, attempt.revision);
    }

    const mission = await this.repository.findMission(attempt.missionId);

    if (!mission) {
      throw notFound('Mission not found');
    }

    const outcome = this.execute(
      mission,
      attempt.draftArtifact,
      input.scenarioId,
    );

    const updated = await this.repository.saveResult(
      userId,
      id,
      input.expectedRevision,
      outcome,
    );

    if (!updated) {
      const current = await this.get(userId, id);
      throw versionConflict(input.expectedRevision, current.revision);
    }

    return updated;
  }

  private execute(
    mission: StoredMission,
    draftArtifact: unknown,
    scenarioId: string,
  ): RunOutcome {
    const config = this.asRecord(mission.config);
    const rawEngine = config['engine'];
    const engine =
      typeof rawEngine === 'string' ? rawEngine : mission.engineVersion;

    if (engine.startsWith('IND')) {
      const allocation = this.asAllocation(
        this.asRecord(draftArtifact)['workerAllocation'],
      );
      const capacity = indScenarioCapacity(scenarioId);

      if (capacity === null || !isValidIndAllocation(allocation, capacity)) {
        return {
          engine,
          scenarioId,
          outcome: 'REJECTED',
          reason: 'Allocation exceeds the scenario capacity',
        };
      }

      return {
        engine,
        scenarioId,
        outcome: 'COMPLETED',
        result: runIndSimulation(allocation, capacity),
      };
    }

    if (engine.startsWith('DKV')) {
      const menu = this.asRecord(draftArtifact)['menu'] as DkvMenu | undefined;

      if (!menu) {
        return {
          engine,
          scenarioId,
          outcome: 'REJECTED',
          reason: 'Draft artifact carries no menu',
        };
      }

      return {
        engine,
        scenarioId,
        outcome: 'COMPLETED',
        result: checkDkvMenu(menu),
      };
    }

    const input = this.asInfInput(this.asRecord(draftArtifact));

    return {
      engine,
      scenarioId,
      outcome: 'COMPLETED',
      result: runInfGraph(INF_ORDER_GRAPH, input),
    };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null) return {};
    return value as Record<string, unknown>;
  }

  private asAllocation(value: unknown): IndAllocation {
    if (!Array.isArray(value) || value.length !== 3) return [0, 0, 0];
    return value.map((entry) => (typeof entry === 'number' ? entry : 0)) as [
      number,
      number,
      number,
    ];
  }

  private asInfInput(value: Record<string, unknown>): InfInput {
    const stock = value['stock'];
    const quantity = value['quantity'];

    return {
      stock: typeof stock === 'number' ? stock : 0,
      quantity: typeof quantity === 'number' ? quantity : 0,
      paymentSuccess: value['paymentSuccess'] === true,
    };
  }
}
