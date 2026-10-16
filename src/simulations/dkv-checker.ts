import {
  DKV_MIN_CONTRAST_RATIO,
  DKV_MIN_FONT_PT,
} from './simulation.constants.js';

export type DkvMenuItem = {
  name: string;
  price: number | null;
};

export type DkvMenuCategory = {
  name: string;
  items: DkvMenuItem[];
};

export type DkvMenu = {
  title: string;
  categories: DkvMenuCategory[];
  bodyFontPt: number;
  palette: { backgroundHex: string; textHex: string };
  overflowItemIds: string[];
  budgetGroupingRespected: boolean;
};

export type DkvCheckId =
  | 'TITLE_PRESENT'
  | 'ITEM_PRICE_COMPLETE'
  | 'NO_TEXT_OVERFLOW'
  | 'MIN_FONT_SIZE'
  | 'MIN_CONTRAST'
  | 'BUDGET_GROUPING';

export type DkvCheck = {
  id: DkvCheckId;
  passed: boolean;
  detail: string;
};

export type DkvResult = {
  checks: DkvCheck[];
  passedCount: number;
  totalChecks: number;
};

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace('#', '');

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function relativeLuminance(hex: string): number | null {
  const rgb = parseHex(hex);
  if (rgb === null) return null;

  const channel = (value: number): number => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };

  return (
    0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
  );
}

export function contrastRatio(
  backgroundHex: string,
  textHex: string,
): number | null {
  const background = relativeLuminance(backgroundHex);
  const text = relativeLuminance(textHex);

  if (background === null || text === null) return null;

  const lighter = Math.max(background, text);
  const darker = Math.min(background, text);

  return (lighter + 0.05) / (darker + 0.05);
}

export function checkDkvMenu(menu: DkvMenu): DkvResult {
  const allItems = menu.categories.flatMap((category) => category.items);

  const missingPrice = allItems.filter((item) => item.price === null);

  const checks: DkvCheck[] = [
    {
      id: 'TITLE_PRESENT',
      passed: menu.title.trim().length > 0,
      detail: menu.title.trim().length > 0 ? 'Title present' : 'Title is blank',
    },
    {
      id: 'ITEM_PRICE_COMPLETE',
      passed: missingPrice.length === 0,
      detail:
        missingPrice.length === 0
          ? 'Every item carries a price'
          : `Missing price on ${missingPrice.length} item(s)`,
    },
    {
      id: 'NO_TEXT_OVERFLOW',
      passed: menu.overflowItemIds.length === 0,
      detail:
        menu.overflowItemIds.length === 0
          ? 'No overflow reported'
          : `Overflow reported on ${menu.overflowItemIds.length} item(s)`,
    },
    {
      id: 'MIN_FONT_SIZE',
      passed: menu.bodyFontPt >= DKV_MIN_FONT_PT,
      detail: `Body font ${menu.bodyFontPt}pt, minimum ${DKV_MIN_FONT_PT}pt`,
    },
  ];

  const ratio = contrastRatio(menu.palette.backgroundHex, menu.palette.textHex);

  checks.push({
    id: 'MIN_CONTRAST',
    passed: ratio !== null && ratio >= DKV_MIN_CONTRAST_RATIO,
    detail:
      ratio === null
        ? 'Palette could not be read as a hex colour'
        : `Contrast ${ratio.toFixed(2)}:1, minimum ${DKV_MIN_CONTRAST_RATIO}:1`,
  });

  checks.push({
    id: 'BUDGET_GROUPING',
    passed: menu.budgetGroupingRespected,
    detail: menu.budgetGroupingRespected
      ? 'Items grouped within the scenario budget'
      : 'Items fall outside the scenario budget',
  });

  return {
    checks,
    passedCount: checks.filter((check) => check.passed).length,
    totalChecks: checks.length,
  };
}
