export interface IdDiff<T> {
  upserted: T[];
  deletedIds: string[];
}

export function diffById<T extends { id: string }>(before: T[], after: T[]): IdDiff<T> {
  const beforeMap = new Map(before.map((x) => [x.id, x]));
  const afterMap = new Map(after.map((x) => [x.id, x]));

  const upserted: T[] = [];
  for (const [id, item] of afterMap) {
    const prev = beforeMap.get(id);
    if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) upserted.push(item);
  }

  const deletedIds: string[] = [];
  for (const id of beforeMap.keys()) {
    if (!afterMap.has(id)) deletedIds.push(id);
  }

  return { upserted, deletedIds };
}
