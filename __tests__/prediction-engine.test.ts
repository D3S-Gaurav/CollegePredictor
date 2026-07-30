import { describe, it, expect } from 'vitest';
import {
  calculateConfidence,
  calculateResultScore,
  getConfidenceBadgeColor,
} from '@/lib/prediction-engine';

/**
 * `calculateConfidence` averages the supplied closing ranks and bands the
 * user's rank against 0.8× / 1.0× / 1.2× of that average. Boundaries are
 * inclusive on the lower band, so each is tested on both sides.
 */
describe('calculateConfidence', () => {
  it('returns REACH when no historical data exists', () => {
    expect(calculateConfidence(5_000, [])).toBe('REACH');
  });

  describe('with an average closing rank of 1000', () => {
    const closingRanks = [1000];

    it('classifies rank at exactly 0.8x as SAFE', () => {
      expect(calculateConfidence(800, closingRanks)).toBe('SAFE');
    });

    it('classifies rank just above 0.8x as LIKELY', () => {
      expect(calculateConfidence(801, closingRanks)).toBe('LIKELY');
    });

    it('classifies rank at exactly the average as LIKELY', () => {
      expect(calculateConfidence(1000, closingRanks)).toBe('LIKELY');
    });

    it('classifies rank just above the average as DREAM', () => {
      expect(calculateConfidence(1001, closingRanks)).toBe('DREAM');
    });

    it('classifies rank at exactly 1.2x as DREAM', () => {
      expect(calculateConfidence(1200, closingRanks)).toBe('DREAM');
    });

    it('classifies rank beyond 1.2x as REACH', () => {
      expect(calculateConfidence(1201, closingRanks)).toBe('REACH');
    });
  });

  it('averages across years rather than using a single round', () => {
    // avg([1000, 2000]) = 1500; 1200 is exactly 0.8x of that.
    expect(calculateConfidence(1200, [1000, 2000])).toBe('SAFE');
    expect(calculateConfidence(1201, [1000, 2000])).toBe('LIKELY');
  });

  it('treats a very strong rank as SAFE', () => {
    expect(calculateConfidence(1, [50_000])).toBe('SAFE');
  });
});

/**
 * Score = institute tier (0-30) + branch preference (0-40)
 *       + confidence (0-30) + rank proximity (0-10).
 */
describe('calculateResultScore', () => {
  const base = {
    instituteType: 'NIT',
    branchName: 'Computer Science and Engineering',
    confidence: 'SAFE' as const,
    branchPreferences: [] as string[],
    closingRank: 1000,
    userRank: 1000,
  };

  it('scores a best-case match at the documented maximum', () => {
    // NIT 30 + first-preference 40 + SAFE 30 + exact-rank proximity 10
    expect(
      calculateResultScore({ ...base, branchPreferences: ['Computer Science'] }),
    ).toBe(110);
  });

  it('ranks institute tiers NIT > IIIT > GFTI', () => {
    const nit = calculateResultScore({ ...base, instituteType: 'NIT' });
    const iiit = calculateResultScore({ ...base, instituteType: 'IIIT' });
    const gfti = calculateResultScore({ ...base, instituteType: 'GFTI' });

    expect(nit).toBeGreaterThan(iiit);
    expect(iiit).toBeGreaterThan(gfti);
    expect(nit - iiit).toBe(5);
    expect(iiit - gfti).toBe(10);
  });

  it('scores an unrecognised institute type as zero tier', () => {
    const known = calculateResultScore({ ...base, instituteType: 'NIT' });
    const unknown = calculateResultScore({ ...base, instituteType: 'IIT' });
    expect(known - unknown).toBe(30);
  });

  it('weights earlier branch preferences higher', () => {
    const first = calculateResultScore({
      ...base,
      branchPreferences: ['Computer Science', 'Mechanical'],
    });
    const second = calculateResultScore({
      ...base,
      branchPreferences: ['Mechanical', 'Computer Science'],
    });

    expect(first).toBeGreaterThan(second);
    expect(first - second).toBe(20);
  });

  it('awards a neutral branch score when no preferences are set', () => {
    expect(calculateResultScore(base)).toBe(30 + 20 + 30 + 10);
  });

  it('penalises a branch that matches none of the stated preferences', () => {
    const noMatch = calculateResultScore({
      ...base,
      branchPreferences: ['Civil Engineering'],
    });
    const neutral = calculateResultScore(base);

    // A non-matching branch scores 0, below the neutral 20.
    expect(noMatch).toBeLessThan(neutral);
    expect(neutral - noMatch).toBe(20);
  });

  it('matches branch preferences case-insensitively', () => {
    const lower = calculateResultScore({ ...base, branchPreferences: ['computer science'] });
    const upper = calculateResultScore({ ...base, branchPreferences: ['COMPUTER SCIENCE'] });
    expect(lower).toBe(upper);
  });

  it('ranks confidence levels SAFE > LIKELY > DREAM > REACH', () => {
    const score = (confidence: 'SAFE' | 'LIKELY' | 'DREAM' | 'REACH') =>
      calculateResultScore({ ...base, confidence });

    expect(score('SAFE')).toBeGreaterThan(score('LIKELY'));
    expect(score('LIKELY')).toBeGreaterThan(score('DREAM'));
    expect(score('DREAM')).toBeGreaterThan(score('REACH'));
  });

  it('awards the full proximity bonus when rank equals the closing rank', () => {
    const exact = calculateResultScore({ ...base, userRank: 1000, closingRank: 1000 });
    const half = calculateResultScore({ ...base, userRank: 500, closingRank: 1000 });
    expect(exact - half).toBe(5);
  });

  it('floors the proximity bonus at zero for a far-off rank', () => {
    // userRank/closingRank = 5 → 10 * (1 - 4) is negative, clamped to 0.
    const far = calculateResultScore({ ...base, userRank: 5000, closingRank: 1000 });
    const exact = calculateResultScore({ ...base, userRank: 1000, closingRank: 1000 });
    expect(exact - far).toBe(10);
  });

  it('never returns a negative score', () => {
    expect(
      calculateResultScore({
        instituteType: 'UNKNOWN',
        branchName: 'Textile Technology',
        confidence: 'REACH',
        branchPreferences: ['Computer Science'],
        closingRank: 1,
        userRank: 900_000,
      }),
    ).toBeGreaterThanOrEqual(0);
  });
});

describe('getConfidenceBadgeColor', () => {
  it('returns a distinct class string for every confidence level', () => {
    const levels = ['SAFE', 'LIKELY', 'DREAM', 'REACH'] as const;
    const classes = levels.map(getConfidenceBadgeColor);

    expect(new Set(classes).size).toBe(levels.length);
    for (const cls of classes) expect(cls).toMatch(/bg-.+ text-.+ border-.+/);
  });
});
