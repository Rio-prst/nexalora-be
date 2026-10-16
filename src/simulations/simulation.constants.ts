export const INF_MAX_EXECUTION_STEPS = 50;

export const IND_CUSTOMER_COUNT = 12;
export const IND_ARRIVAL_INTERVAL_SEC = 30;
export const IND_STAGE_DURATIONS_SEC = [20, 60, 10] as const;
export const IND_SIMULATION_HORIZON_SEC = 600;
export const IND_SCENARIO_CAPACITIES = {
  scenario_1: 4,
  scenario_2: 3,
} as const;

export const DKV_MIN_FONT_PT = 12;
export const DKV_MIN_CONTRAST_RATIO = 4.5;

export const SIMULATION_ROUTES = {
  base: 'attempts',
  detail: 'attempts/:id',
  run: 'attempts/:id/run',
} as const;
