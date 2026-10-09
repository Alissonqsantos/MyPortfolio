import { describe, it, expect } from 'vitest'
import { CHAPTERS, chapterIndexFor, poseAt, progressFromScroll } from '../src/al/choreography.js'

describe('coreografia', () => {
  it('tem 5 capítulos com as palavras aprovadas', () => {
    expect(CHAPTERS.map(c => c.n)).toEqual(['01', '02', '03', '04', '05'])
    expect(CHAPTERS.map(c => c.word)).toEqual(['IDENTITY', 'CRAFT', 'DETAIL', 'SYSTEMS', 'IMPACT'])
  })
  it('mapeia t para o capítulo, com clamp nas bordas', () => {
    expect(chapterIndexFor(0)).toBe(0)
    expect(chapterIndexFor(0.2)).toBe(1)
    expect(chapterIndexFor(0.4)).toBe(2)
    expect(chapterIndexFor(0.6)).toBe(3)
    expect(chapterIndexFor(0.8)).toBe(4)
    expect(chapterIndexFor(1)).toBe(4)
    expect(chapterIndexFor(-0.5)).toBe(0)   // overscroll iOS
    expect(chapterIndexFor(1.5)).toBe(4)    // overscroll iOS
  })
  it('as fronteiras caem em 20% de cada capítulo (hero de 500vh)', () => {
    // end='+=400%' => 5 telas; fronteiras em 100/200/300/400 de 500
    const idx = (y) => chapterIndexFor(y / 500)
    expect(idx(0)).toBe(0)
    expect(idx(99)).toBe(0)
    expect(idx(100)).toBe(1)
    expect(idx(299)).toBe(2)
    expect(idx(300)).toBe(3)
    expect(idx(400)).toBe(4)
    expect(idx(500)).toBe(4)
  })
  it('poseAt reproduz exatamente as poses inicial e final', () => {
    expect(poseAt(0)).toEqual(CHAPTERS[0].pose)
    expect(poseAt(1)).toEqual(CHAPTERS[4].pose)
  })
  it('poseAt é finito e clamped em toda a faixa', () => {
    for (const t of [-1, 0, 0.1, 0.37, 0.5, 0.99, 1, 2]) {
      const p = poseAt(t)
      expect([...p.pos, ...p.target].every(Number.isFinite)).toBe(true)
    }
    expect(poseAt(-1)).toEqual(CHAPTERS[0].pose)
    expect(poseAt(2)).toEqual(CHAPTERS[4].pose)
  })
  it('progressFromScroll normaliza e faz clamp', () => {
    expect(progressFromScroll(0, 0, 500)).toBe(0)
    expect(progressFromScroll(250, 0, 500)).toBeCloseTo(0.5, 6)
    expect(progressFromScroll(500, 0, 500)).toBe(1)
    expect(progressFromScroll(-80, 0, 500)).toBe(0)
    expect(progressFromScroll(900, 0, 500)).toBe(1)
  })
})
