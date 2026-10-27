export type DeliverableCategoryKey =
  | "previewUrl"
  | "pitchDeckUrl"
  | "creativeDeckUrl"
  | "finalAssetsUrl";

export interface CategoryLinkItem {
  label: string;
  url: string;
}

export interface CategoryRowRule {
  fixedLabel: string | null;
  placeholderTitle?: string;
  placeholderUrl?: string;
}

export interface CategoryDefinition {
  key: DeliverableCategoryKey;
  name: string;
  subtitle: string;
  color: string;
  rows: [CategoryRowRule, CategoryRowRule, CategoryRowRule, CategoryRowRule];
}

export const CATEGORY_DEFINITIONS: Record<DeliverableCategoryKey, CategoryDefinition> = {
  previewUrl: {
    key: "previewUrl",
    name: "Preview Links",
    subtitle: "Staging, Prototypes & Interactive Web",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    rows: [
      { fixedLabel: "Deck CP", placeholderUrl: "https://..." },
      { fixedLabel: "GDRIVE Prev Video", placeholderUrl: "https://drive.google.com/..." },
      { fixedLabel: null, placeholderTitle: "Custom Title / Label", placeholderUrl: "https://..." },
      { fixedLabel: null, placeholderTitle: "Custom Title / Label", placeholderUrl: "https://..." },
    ],
  },
  pitchDeckUrl: {
    key: "pitchDeckUrl",
    name: "Pitch Deck",
    subtitle: "Strategy, Keynote & Google Slides",
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    rows: [
      { fixedLabel: null, placeholderTitle: "Custom Title / Label", placeholderUrl: "https://slides.google.com/..." },
      { fixedLabel: null, placeholderTitle: "Custom Title / Label", placeholderUrl: "https://slides.google.com/..." },
      { fixedLabel: null, placeholderTitle: "Custom Title / Label", placeholderUrl: "https://slides.google.com/..." },
      { fixedLabel: null, placeholderTitle: "Custom Title / Label", placeholderUrl: "https://slides.google.com/..." },
    ],
  },
  creativeDeckUrl: {
    key: "creativeDeckUrl",
    name: "Creative Deck",
    subtitle: "Figma Tokens, Miro & Moodboards",
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    rows: [
      { fixedLabel: "content plan", placeholderUrl: "https://..." },
      { fixedLabel: "content report", placeholderUrl: "https://..." },
      { fixedLabel: null, placeholderTitle: "Custom Title / Label", placeholderUrl: "https://figma.com/..." },
      { fixedLabel: null, placeholderTitle: "Custom Title / Label", placeholderUrl: "https://..." },
    ],
  },
  finalAssetsUrl: {
    key: "finalAssetsUrl",
    name: "Final Assets",
    subtitle: "Approved Masters, Drive & Frame.io",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    rows: [
      { fixedLabel: null, placeholderTitle: "Custom Title / Label", placeholderUrl: "https://drive.google.com/..." },
      { fixedLabel: null, placeholderTitle: "Custom Title / Label", placeholderUrl: "https://drive.google.com/..." },
      { fixedLabel: null, placeholderTitle: "Custom Title / Label", placeholderUrl: "https://..." },
      { fixedLabel: null, placeholderTitle: "Custom Title / Label", placeholderUrl: "https://..." },
    ],
  },
};

export function parseCategoryLinks(
  rawValue: string | null | undefined,
  categoryKey: DeliverableCategoryKey
): CategoryLinkItem[] {
  const definition = CATEGORY_DEFINITIONS[categoryKey];
  const defaultRows: CategoryLinkItem[] = definition.rows.map((r) => ({
    label: r.fixedLabel || "",
    url: "",
  }));

  if (!rawValue || !rawValue.trim()) {
    return defaultRows;
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (Array.isArray(parsed)) {
      return definition.rows.map((r, idx) => {
        const item = parsed[idx];
        const label = r.fixedLabel !== null ? r.fixedLabel : (item?.label || "");
        const url = item?.url || "";
        return { label, url };
      });
    }
  } catch {
    // Legacy single URL string fallback
  }

  return definition.rows.map((r, idx) => {
    return {
      label: r.fixedLabel !== null ? r.fixedLabel : "",
      url: idx === 0 ? rawValue.trim() : "",
    };
  });
}

export function countCategoryUrls(val: string | null | undefined): number {
  if (!val || !val.trim()) return 0;
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item: any) => item && typeof item.url === "string" && item.url.trim().length > 0
      ).length;
    }
  } catch {}
  return val.trim().length > 0 ? 1 : 0;
}

export function formatExternalUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}
