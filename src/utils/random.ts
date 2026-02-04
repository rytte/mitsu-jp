export function shuffle<T>(list: T[]): T[] {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function pickOne<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function sample<T>(list: T[], count: number): T[] {
  if (count <= 0) return [];
  if (count >= list.length) return shuffle(list);
  return shuffle(list).slice(0, count);
}

