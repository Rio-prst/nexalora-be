import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { HousingMode } from '../../src/generated/prisma/enums.js';
import { SEED_ACADEMIC_YEAR, SOURCE_IDS } from './config.js';

/**
 * Declared as a type alias rather than an interface on purpose.
 * Prisma's `InputJsonObject` is a mapped type with an index signature, and
 * TypeScript only infers an implicit index signature for type aliases, not for
 * interfaces. An `interface CostRange` fails to satisfy it.
 */
type CostRange = {
  min: number | null;
  max: number | null;
};

type CostComponents = {
  tuitionPerSemester: CostRange;
  livingCostMonthly: CostRange;
  recurringSupportMonthly: CostRange;
  upfrontCost: CostRange;
};

function fixed(value: number): CostRange {
  return { min: value, max: value };
}

function range(min: number, max: number): CostRange {
  return { min, max };
}

/**
 * Unknown values MUST stay `null` and never become `0` (AC-03B / R3).
 * The `ugm-inf-s1` RENT profile below deliberately keeps `livingCostMonthly`
 * null so the `INSUFFICIENT_DATA` path has a fixture to test against (`T04`).
 */
function buildComponents(parts: CostComponents): CostComponents {
  return {
    tuitionPerSemester: parts.tuitionPerSemester,
    livingCostMonthly: parts.livingCostMonthly,
    recurringSupportMonthly: parts.recurringSupportMonthly,
    upfrontCost: parts.upfrontCost,
  };
}

const COST_PROFILES = [
  {
    programId: 'ugm-inf-s1',
    housingMode: HousingMode.FAMILY,
    sourceId: SOURCE_IDS.UGM,
    version: 'seed-family',
    componentsJson: buildComponents({
      tuitionPerSemester: fixed(9_000_000),
      livingCostMonthly: range(1_800_000, 2_400_000),
      recurringSupportMonthly: range(500_000, 900_000),
      upfrontCost: range(2_000_000, 2_500_000),
    }),
  },
  {
    programId: 'itb-inf-s1',
    housingMode: HousingMode.FAMILY,
    sourceId: SOURCE_IDS.ITB,
    version: 'seed-family',
    componentsJson: buildComponents({
      tuitionPerSemester: fixed(10_000_000),
      livingCostMonthly: range(2_000_000, 2_600_000),
      recurringSupportMonthly: range(600_000, 1_000_000),
      upfrontCost: range(2_200_000, 2_800_000),
    }),
  },
  {
    programId: 'ugm-ind-s1',
    housingMode: HousingMode.FAMILY,
    sourceId: SOURCE_IDS.UGM,
    version: 'seed-family',
    componentsJson: buildComponents({
      tuitionPerSemester: fixed(9_000_000),
      livingCostMonthly: range(1_800_000, 2_400_000),
      recurringSupportMonthly: range(500_000, 900_000),
      upfrontCost: range(2_000_000, 2_500_000),
    }),
  },
  {
    programId: 'itb-ind-s1',
    housingMode: HousingMode.FAMILY,
    sourceId: SOURCE_IDS.ITB,
    version: 'seed-family',
    componentsJson: buildComponents({
      tuitionPerSemester: fixed(10_000_000),
      livingCostMonthly: range(2_000_000, 2_600_000),
      recurringSupportMonthly: range(600_000, 1_000_000),
      upfrontCost: range(2_200_000, 2_800_000),
    }),
  },
  {
    programId: 'itb-dkv-s1',
    housingMode: HousingMode.FAMILY,
    sourceId: SOURCE_IDS.ITB,
    version: 'seed-family',
    componentsJson: buildComponents({
      tuitionPerSemester: fixed(11_000_000),
      livingCostMonthly: range(2_200_000, 2_800_000),
      recurringSupportMonthly: range(700_000, 1_200_000),
      upfrontCost: range(2_500_000, 3_200_000),
    }),
  },
  {
    programId: 'ugm-dkv-s1',
    housingMode: HousingMode.FAMILY,
    sourceId: SOURCE_IDS.UGM,
    version: 'seed-family',
    componentsJson: buildComponents({
      tuitionPerSemester: fixed(9_000_000),
      livingCostMonthly: range(1_800_000, 2_400_000),
      recurringSupportMonthly: range(500_000, 900_000),
      upfrontCost: range(2_000_000, 2_500_000),
    }),
  },
  {
    // Fixture for T04: tuition is known but living cost is not. The API must
    // answer INSUFFICIENT_DATA, never WITHIN_BUDGET and never Rp0.
    programId: 'ugm-inf-s1',
    housingMode: HousingMode.RENT,
    sourceId: SOURCE_IDS.UGM,
    version: 'seed-rent',
    componentsJson: buildComponents({
      tuitionPerSemester: fixed(9_000_000),
      livingCostMonthly: { min: null, max: null },
      recurringSupportMonthly: range(500_000, 900_000),
      upfrontCost: range(2_000_000, 2_500_000),
    }),
  },
];

export async function seedCostProfiles(prisma: PrismaClient): Promise<void> {
  for (const profile of COST_PROFILES) {
    await prisma.costProfile.upsert({
      where: {
        programId_academicYear_admissionTrack_housingMode_version: {
          programId: profile.programId,
          academicYear: SEED_ACADEMIC_YEAR,
          admissionTrack: 'SNBP',
          housingMode: profile.housingMode,
          version: profile.version,
        },
      },
      create: {
        ...profile,
        academicYear: SEED_ACADEMIC_YEAR,
        admissionTrack: 'SNBP',
      },
      update: {
        sourceId: profile.sourceId,
        componentsJson: profile.componentsJson,
      },
    });
  }
}
