import { useCallback, useState } from 'react';

const KEY = 'paperbot.learned';

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Glossary words this viewer has opened, kept in this browser only. */
export function useLearned() {
  const [learned, setLearned] = useState<string[]>(read);
  const markLearned = useCallback((ids: string[]) => {
    setLearned((cur) => {
      const next = [...new Set([...cur, ...ids])];
      if (next.length === cur.length) return cur;
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable: progress lasts until reload */
      }
      return next;
    });
  }, []);
  return { learned, markLearned };
}
