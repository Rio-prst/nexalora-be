import {
  MIN_PLAN_TASKS,
  PLAN_DURATION_DAYS,
  type PlanDraft,
  type PlanDraftTask,
  type TaskActionType,
} from './plan.constants.js';

const CATALOGUE: ReadonlyArray<{
  actionType: TaskActionType;
  title: string;
  minutes: number;
  offsetDays: number;
  prerequisiteIndex: number | null;
}> = [
  {
    actionType: 'READ_CURRICULUM',
    title: 'Baca kurikulum resmi dari satu jurusan',
    minutes: 45,
    offsetDays: 2,
    prerequisiteIndex: null,
  },
  {
    actionType: 'EXPLORE_MAJOR',
    title: 'Coba aktivitas belajar singkat pada bidang itu',
    minutes: 60,
    offsetDays: 7,
    prerequisiteIndex: 0,
  },
  {
    actionType: 'COMPARE_COSTS',
    title: 'Bandingkan biaya kuliah dan biaya hidup dua prodi',
    minutes: 40,
    offsetDays: 12,
    prerequisiteIndex: 1,
  },
  {
    actionType: 'CONTACT_SCHOOL',
    title: 'Hubungi bagian penerimaan mahasiswa untuk menanyakan jadwal',
    minutes: 30,
    offsetDays: 18,
    prerequisiteIndex: 2,
  },
  {
    actionType: 'TALK_TO_GUIDANCE',
    title: 'Bahas temuan dan pilihan ini bersama guru BK atau keluarga',
    minutes: 45,
    offsetDays: 24,
    prerequisiteIndex: 3,
  },
];

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function buildPlanDraft(
  startDate: Date,
  weeklyMinutes: number,
  goalIds: readonly string[],
): PlanDraft {
  const count = Math.min(
    CATALOGUE.length,
    Math.max(MIN_PLAN_TASKS, goalIds.length + MIN_PLAN_TASKS),
  );

  const tasks: PlanDraftTask[] = CATALOGUE.slice(0, count).map(
    (template, index) => ({
      key: `task-${index + 1}`,
      title: template.title,
      actionType: template.actionType,
      estimatedMinutes: Math.min(template.minutes, Math.max(10, weeklyMinutes)),
      dueDate: isoDate(addDays(startDate, template.offsetDays)),
      prerequisiteKey:
        template.prerequisiteIndex === null
          ? null
          : `task-${template.prerequisiteIndex + 1}`,
    }),
  );

  return {
    startDate: isoDate(startDate),
    endDate: isoDate(addDays(startDate, PLAN_DURATION_DAYS - 1)),
    weeklyMinutes,
    goalIds: [...goalIds],
    tasks,
  };
}

export function hasPrerequisiteCycle(tasks: readonly PlanDraftTask[]): boolean {
  const byKey = new Map(tasks.map((task) => [task.key, task] as const));

  const reachesStart = (start: PlanDraftTask): boolean => {
    const seen = new Set<string>();
    let current: PlanDraftTask | undefined = start;

    while (current?.prerequisiteKey) {
      if (seen.has(current.key)) return true;
      seen.add(current.key);
      current = byKey.get(current.prerequisiteKey);
    }

    return false;
  };

  return tasks.some(reachesStart);
}
