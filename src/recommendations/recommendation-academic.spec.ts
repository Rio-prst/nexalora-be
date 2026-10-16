import { describe, expect, it } from '@jest/globals';
import { academicReadiness } from './recommendation-academic.js';

describe('academicReadiness', () => {
  const prerequisites = ['Matematika', 'Fisika'];

  it('reports READY when every prerequisite has a grade', () => {
    expect(
      academicReadiness(['Matematika', 'Fisika', 'Informatika'], prerequisites),
    ).toBe('READY');
  });

  it('reports PARTIAL when only some prerequisites have grades', () => {
    expect(academicReadiness(['Matematika'], prerequisites)).toBe('PARTIAL');
  });

  it('reports INCOMPLETE when no prerequisite has a grade', () => {
    expect(academicReadiness(['Sejarah'], prerequisites)).toBe('INCOMPLETE');
    expect(academicReadiness([], prerequisites)).toBe('INCOMPLETE');
  });

  it('reports INCOMPLETE when the program declares no prerequisites', () => {
    expect(academicReadiness(['Matematika'], [])).toBe('INCOMPLETE');
  });

  it('matches subject names without regard to case or padding', () => {
    expect(academicReadiness(['  matematika ', 'FISIKA'], prerequisites)).toBe(
      'READY',
    );
  });
});
