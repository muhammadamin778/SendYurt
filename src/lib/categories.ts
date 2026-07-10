// Budget categories. Slugs are stored on transactions/budgets; labels live
// in the message catalogs under budget.categories.<slug>.
export const CATEGORIES = [
  "food",
  "utilities",
  "education",
  "health",
  "transport",
  "household",
  "clothing",
  "celebrations",
  "debt",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}
