export function cartesian<T>(lists: T[][]): T[][] {
  if (!lists.length) return [[]];
  return lists.reduce<T[][]>((acc, list) => acc.flatMap((prefix) => list.map((item) => [...prefix, item])), [[]]);
}

export function slugSku(name: string) {
  const s = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16);
  const n = Date.now().toString().slice(-4);
  return s ? `${s}-${n}` : `SKU-${n}`;
}
