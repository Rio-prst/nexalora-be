export const RECOMMENDATION_RULE_VERSION = 'heuristic-v1';

export const WEIGHT_INITIAL_INTEREST = 0.7;
export const WEIGHT_REFLECTION = 0.3;

export const SEMESTER_MONTHS_DEFAULT = 6;

export const MIN_AVAILABLE_DIMENSIONS = 3;

export const CATALOG_VERSION =
  process.env['CATALOG_VERSION']?.trim() || 'pilot-v1';

export const MAX_REASON_CODES = 4;

export const RECOMMENDATION_HISTORY_LIMIT = 20;
