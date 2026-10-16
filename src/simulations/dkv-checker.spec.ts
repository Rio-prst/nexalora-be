import { describe, expect, it } from '@jest/globals';
import { checkDkvMenu, contrastRatio, type DkvMenu } from './dkv-checker.js';
import { DKV_MIN_CONTRAST_RATIO } from './simulation.constants.js';

function menu(overrides: Partial<DkvMenu> = {}): DkvMenu {
  return {
    title: 'Kantin Sekolah',
    categories: [
      {
        name: 'Makanan',
        items: [
          { name: 'Nasi goreng', price: 12000 },
          { name: 'Es teh', price: 4000 },
        ],
      },
    ],
    bodyFontPt: 14,
    palette: { backgroundHex: '#FFFFFF', textHex: '#111111' },
    overflowItemIds: [],
    budgetGroupingRespected: true,
    ...overrides,
  };
}

describe('DKV mission (R6)', () => {
  it('passes a well formed menu', () => {
    const result = checkDkvMenu(menu());

    expect(result.passedCount).toBe(result.totalChecks);
  });

  it('flags a missing price', () => {
    const result = checkDkvMenu(
      menu({
        categories: [
          { name: 'Makanan', items: [{ name: 'Nasi goreng', price: null }] },
        ],
      }),
    );

    const check = result.checks.find(
      (entry) => entry.id === 'ITEM_PRICE_COMPLETE',
    );

    expect(check?.passed).toBe(false);
  });

  it('flags reported text overflow', () => {
    const result = checkDkvMenu(menu({ overflowItemIds: ['Nasi goreng'] }));

    const check = result.checks.find(
      (entry) => entry.id === 'NO_TEXT_OVERFLOW',
    );

    expect(check?.passed).toBe(false);
  });

  it('flags a body font below twelve point', () => {
    const result = checkDkvMenu(menu({ bodyFontPt: 11 }));

    const check = result.checks.find((entry) => entry.id === 'MIN_FONT_SIZE');

    expect(check?.passed).toBe(false);
  });

  it('flags a palette below the contrast floor', () => {
    const result = checkDkvMenu(
      menu({ palette: { backgroundHex: '#FFFFFF', textHex: '#DDDDDD' } }),
    );

    const check = result.checks.find((entry) => entry.id === 'MIN_CONTRAST');

    expect(check?.passed).toBe(false);
  });

  it('computes the standard contrast ratio', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 2);
    expect(contrastRatio('#FFFFFF', '#111111')).toBeGreaterThan(
      DKV_MIN_CONTRAST_RATIO,
    );
  });

  it('returns null for a colour it cannot read', () => {
    expect(contrastRatio('not-a-colour', '#000000')).toBeNull();
  });

  it('never emits an aesthetic score (R6)', () => {
    const result = checkDkvMenu(menu());

    expect(Object.keys(result).sort()).toEqual([
      'checks',
      'passedCount',
      'totalChecks',
    ]);
  });
});
