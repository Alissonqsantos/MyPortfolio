import { describe, it, expect } from 'vitest';
import { TRABALHOS } from '../src/trabalhos-data.js';

describe('trabalhos-data', () => {
  it('4 placeholders com campos obrigatórios do card', () => {
    expect(TRABALHOS).toHaveLength(4);
    const ids = new Set();
    for (const t of TRABALHOS) {
      expect(t.id).toMatch(/^proj-\d{2}$/);
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
      expect(t.titulo).toContain('TODO-REAL');
      expect(t.categoria.length).toBeGreaterThan(0);
      expect(t.stack.length).toBeGreaterThanOrEqual(2);
      expect(t.href.length).toBeGreaterThan(0);
      expect(t.tons).toHaveLength(2);
    }
  });
});
