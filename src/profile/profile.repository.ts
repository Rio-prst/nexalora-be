import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
// Must be a value import: emitDecoratorMetadata needs the runtime class token
// for Nest to inject PrismaService. `import type` erases it and DI fails at
// bootstrap with "Nest can't resolve dependencies of the ProfileRepository".
import { PrismaService } from '../infra/prisma/prisma.service.js';
import type {
  IProfileRepository,
  ProfileAggregate,
  UpdateProfileInput,
} from './interfaces/profile.repository.interface.js';

/**
 * Relation names here are the Prisma ones. `academic_records` is exposed as
 * `schoolSubjects` in the API, so the mapper below performs that rename rather
 * than leaking the storage name into the contract.
 */
const PROFILE_INCLUDE = {
  academicRecords: {
    orderBy: [{ semester: 'asc' as const }, { subject: 'asc' as const }],
  },
  consents: { orderBy: { consentedAt: 'desc' as const } },
};

type ProfileRow = Prisma.ProfileGetPayload<{ include: typeof PROFILE_INCLUDE }>;

/**
 * Postgres returns `jsonb` as dynamically shaped values, so every read of a
 * JSON column goes through this. A malformed column degrades to an empty array
 * rather than throwing halfway through building a response.
 */
function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function toAggregate(row: ProfileRow): ProfileAggregate {
  return {
    userId: row.userId,
    version: row.version,
    displayName: row.displayName,
    gradeLevel: row.gradeLevel,
    graduationYear: row.graduationYear,
    cityCode: row.cityCode,
    provinceCode: row.provinceCode,
    relocationMode: row.relocationMode,
    preferredRegions: toStringArray(row.preferredRegionsJson),
    preferredMajors: toStringArray(row.preferredMajorsJson),
    monthlyBudgetMin: row.monthlyBudgetMin,
    monthlyBudgetMax: row.monthlyBudgetMax,
    upfrontBudgetMax: row.upfrontBudgetMax,
    housingMode: row.housingMode,
    pinnedPrograms: toStringArray(row.pinnedProgramsJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    schoolSubjects: row.academicRecords.map((record) => ({
      subject: record.subject,
      semester: record.semester,
      score: record.score,
      scale: record.scale,
    })),
    consents: row.consents.map((consent) => ({
      purposeVersion: consent.purposeVersion,
      isAccepted: consent.isAccepted,
      consentedAt: consent.consentedAt.toISOString(),
    })),
  };
}

@Injectable()
export class ProfileRepository implements IProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async ensureExists(userId: string): Promise<void> {
    await this.prisma.profile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async findByUserId(userId: string): Promise<ProfileAggregate | null> {
    const row = await this.prisma.profile.findUnique({
      where: { userId },
      include: PROFILE_INCLUDE,
    });

    return row === null ? null : toAggregate(row);
  }

  async updateWithVersion(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<ProfileAggregate | null> {
    const {
      expectedVersion,
      consent,
      schoolSubjects,
      pinnedPrograms,
      preferredRegions,
      preferredMajors,
      ...scalars
    } = input;

    const applied = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // The version guard lives in the WHERE clause, so two tabs racing on the
        // same expectedVersion can never both succeed: the loser matches zero rows.
        const { count } = await tx.profile.updateMany({
          where: { userId, version: expectedVersion },
          data: {
            ...scalars,
            ...(pinnedPrograms === undefined
              ? {}
              : { pinnedProgramsJson: pinnedPrograms }),
            ...(preferredRegions === undefined
              ? {}
              : { preferredRegionsJson: preferredRegions }),
            ...(preferredMajors === undefined
              ? {}
              : { preferredMajorsJson: preferredMajors }),
            version: { increment: 1 },
          },
        });

        if (count === 0) {
          return false;
        }

        if (schoolSubjects !== undefined) {
          await tx.academicRecord.deleteMany({ where: { userId } });

          if (schoolSubjects.length > 0) {
            await tx.academicRecord.createMany({
              data: schoolSubjects.map((record) => ({ ...record, userId })),
            });
          }
        }

        if (consent !== undefined) {
          await tx.consent.create({
            data: {
              userId,
              purposeVersion: consent.purposeVersion,
              isAccepted: consent.isAccepted,
              consentedAt: new Date(),
            },
          });
        }

        return true;
      },
    );

    if (!applied) {
      return null;
    }

    return this.findByUserId(userId);
  }

  async deleteAccountData(userId: string): Promise<boolean> {
    // Every private table cascades from profiles.user_id, so deleting the root
    // row removes the account's data in one statement. The transaction makes
    // that explicit and gives the audit write a place to live.
    const removed = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const { count } = await tx.profile.deleteMany({ where: { userId } });
        return count > 0;
      },
    );

    return removed;
  }
}
