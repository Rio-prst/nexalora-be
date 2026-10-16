import type { AcademicReadinessStatus } from './dto/recommendation-run.response.dto.js';

export function academicReadiness(
  recordedSubjects: readonly string[],
  prerequisites: readonly string[],
): AcademicReadinessStatus {
  if (prerequisites.length === 0) return 'INCOMPLETE';

  const recorded = new Set(
    recordedSubjects.map((subject) => subject.trim().toLowerCase()),
  );

  const matched = prerequisites.filter((subject) => {
    const needle = subject.trim().toLowerCase();
    if (needle.length === 0) return false;
    return recorded.has(needle);
  });

  if (matched.length === prerequisites.length) return 'READY';
  if (matched.length > 0) return 'PARTIAL';

  return 'INCOMPLETE';
}
