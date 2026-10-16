export const INTEREST_DIMENSIONS = [
  'LOGIC_SYSTEM',
  'PROCESS_DATA',
  'VISUAL_COMM',
  'EXPLORATION_COLLAB',
] as const;

export type InterestDimension = (typeof INTEREST_DIMENSIONS)[number];

export const MIN_ITEMS_PER_DIMENSION = 2;
export const MIN_AVAILABLE_DIMENSIONS = 3;
export const MAX_ITEMS_PER_DIMENSION = 3;
export const MAX_ANSWERS = 12;
