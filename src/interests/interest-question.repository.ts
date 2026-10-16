import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infra/prisma/prisma.service.js';
import type { InterestDimension } from './interests.constants.js';

export type InterestQuestion = {
  itemId: string;
  dimension: string;
  cluster: string;
  category: string;
  prompt: string;
  subtext: string | null;
  position: number;
};

export type InterestInstrument = {
  instrumentVersion: string;
  scale: {
    answered: { min: number; max: number };
    states: string[];
  };
  questions: InterestQuestion[];
};

export interface IInterestQuestionRepository {
  listQuestions(): Promise<InterestInstrument | null>;
}

export const IInterestQuestionRepository = Symbol(
  'IInterestQuestionRepository',
);

const KNOWN_DIMENSIONS: ReadonlySet<string> = new Set<InterestDimension>([
  'LOGIC_SYSTEM',
  'PROCESS_DATA',
  'VISUAL_COMM',
  'EXPLORATION_COLLAB',
]);

export function unknownDimensions(
  questions: readonly { dimension: string }[],
): string[] {
  return [
    ...new Set(
      questions
        .map((question) => question.dimension)
        .filter((dimension) => !KNOWN_DIMENSIONS.has(dimension)),
    ),
  ].sort();
}

@Injectable()
export class InterestQuestionRepository implements IInterestQuestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listQuestions(): Promise<InterestInstrument | null> {
    const rows = await this.prisma.interestQuestion.findMany({
      orderBy: { position: 'asc' },
      select: {
        itemId: true,
        dimension: true,
        cluster: true,
        category: true,
        prompt: true,
        subtext: true,
        position: true,
        instrumentVersion: true,
      },
    });

    if (rows.length === 0) return null;

    const versions = new Set(rows.map((row) => row.instrumentVersion));

    if (versions.size > 1) {
      throw new Error(
        'Mixed instrument versions in interest_questions: ' +
          [...versions].sort().join(', '),
      );
    }

    return {
      instrumentVersion: rows[0]?.instrumentVersion ?? 'v0.1',
      scale: {
        answered: { min: 1, max: 5 },
        states: ['ANSWERED', 'UNKNOWN', 'SKIPPED'],
      },
      questions: rows.map((row) => ({
        itemId: row.itemId,
        dimension: row.dimension,
        cluster: row.cluster,
        category: row.category,
        prompt: row.prompt,
        subtext: row.subtext,
        position: row.position,
      })),
    };
  }
}
