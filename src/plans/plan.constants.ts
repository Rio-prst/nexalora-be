export const PLAN_DURATION_DAYS = 30;
export const MIN_PLAN_TASKS = 3;
export const PLAN_TIMEZONE = 'Asia/Jakarta';

export const PLAN_ROUTES = {
  preview: 'plans/preview',
  base: 'plans',
  active: 'plans/active',
  task: 'tasks/:id',
} as const;

export const TASK_ACTION_TYPES = [
  'EXPLORE_MAJOR',
  'READ_CURRICULUM',
  'ATTEND_INFO_SESSION',
  'CONTACT_SCHOOL',
  'COMPARE_COSTS',
  'TALK_TO_GUIDANCE',
  'SAVE_EVIDENCE',
] as const;

export type TaskActionType = (typeof TASK_ACTION_TYPES)[number];

export const TASK_STATUSES = ['TODO', 'DOING', 'DONE', 'SKIPPED'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export type PlanDraftTask = {
  key: string;
  title: string;
  actionType: TaskActionType;
  estimatedMinutes: number;
  dueDate: string;
  prerequisiteKey: string | null;
};

export type PlanDraft = {
  startDate: string;
  endDate: string;
  weeklyMinutes: number;
  goalIds: string[];
  tasks: PlanDraftTask[];
};
