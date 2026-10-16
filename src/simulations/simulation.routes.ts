export const SIMULATION_ROUTES = {
  submissions: 'simulations/submissions',
  mySubmissions: 'simulations/submissions/me',
  detail: 'simulations/submissions/:id',
  downloadUrl: 'simulations/submissions/:id/download-url',
  review: 'simulations/submissions/:id/review',
  adminReview: 'admin/submissions/:id/review',
  passports: 'simulations/passports/me',
} as const;

export const REVIEW_STATUSES = ['lulus', 'belum_lulus'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
