import { describe, it, expect } from 'vitest';
import { scoreNote, retrieveNotes, buildResponse, detectIntent } from '../src/lib/retrieval';
import type { KnowledgeNote } from '../src/lib/types';
import { SEED_NOTES } from '../src/lib/seed-data';

describe('scoreNote', () => {
  const fuelNote: KnowledgeNote = {
    id: 'fuel-policy',
    title: 'Fuel Policy',
    category: 'operations',
    keywords: ['fuel', 'gas', 'petrol', 'diesel', 'tank', 'refuel'],
    content: 'Full-to-Full policy. Vehicle delivered full, must be returned full.',
    updatedAt: '2025-01-20',
  };

  it('scores > 0 when query matches keywords', () => {
    expect(scoreNote('what is the fuel policy?', fuelNote)).toBeGreaterThan(0);
  });

  it('scores higher for exact keyword match than partial', () => {
    const exactScore = scoreNote('fuel policy', fuelNote);
    const partialScore = scoreNote('something unrelated', fuelNote);
    expect(exactScore).toBeGreaterThan(partialScore);
  });

  it('returns 0 for completely unrelated query', () => {
    expect(scoreNote('weather forecast tomorrow', fuelNote)).toBe(0);
  });

  it('scores title matches', () => {
    const score = scoreNote('fuel', fuelNote);
    expect(score).toBeGreaterThan(0);
  });

  it('boosts for category match', () => {
    const withCategory = scoreNote('operations fuel', fuelNote);
    const withoutCategory = scoreNote('fuel', fuelNote);
    expect(withCategory).toBeGreaterThan(withoutCategory);
  });
});

describe('retrieveNotes', () => {
  it('returns top-N relevant notes sorted by score', () => {
    const results = retrieveNotes('What is the deposit for a luxury car?', SEED_NOTES, 3);
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(3);
    // Scores should be descending
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('finds deposit rules for deposit query', () => {
    const results = retrieveNotes('deposit hold credit card', SEED_NOTES, 3);
    const ids = results.map((r) => r.note.id);
    expect(ids).toContain('deposit-rules');
  });

  it('finds late return policy', () => {
    const results = retrieveNotes('customer returned the car 3 hours late', SEED_NOTES, 3);
    const ids = results.map((r) => r.note.id);
    expect(ids).toContain('late-return');
  });

  it('finds damage procedure for scratch query', () => {
    const results = retrieveNotes('I found a scratch on the bumper', SEED_NOTES, 3);
    const ids = results.map((r) => r.note.id);
    expect(ids).toContain('damage-procedure');
  });

  it('finds insurance for upsell query', () => {
    const results = retrieveNotes('how do I upsell insurance packages?', SEED_NOTES, 3);
    const ids = results.map((r) => r.note.id);
    expect(ids).toContain('upsell-insurance');
  });

  it('finds child seat policy', () => {
    const results = retrieveNotes('customer needs a baby seat', SEED_NOTES, 3);
    const ids = results.map((r) => r.note.id);
    expect(ids).toContain('child-seat');
  });

  it('returns empty array for nonsense query', () => {
    const results = retrieveNotes('qqqqzzzzxxxx wwwwyyyyjjjj', SEED_NOTES, 3);
    expect(results.length).toBe(0);
  });
});

describe('buildResponse', () => {
  it('returns fallback when no notes match', () => {
    const response = buildResponse('random gibberish', []);
    expect(response).toContain("couldn't find");
  });

  it('includes note title when single match', () => {
    const results = retrieveNotes('fuel policy', SEED_NOTES, 1);
    const response = buildResponse('fuel policy', results);
    expect(response).toContain('Fuel Policy');
  });

  it('includes multiple note titles for broad query', () => {
    const results = retrieveNotes('what are the billing policies?', SEED_NOTES, 3);
    if (results.length > 1) {
      const response = buildResponse('what are the billing policies?', results);
      expect(response).toContain('relevant policies');
    }
  });
});

describe('detectIntent', () => {
  it('detects fuel intent', () => {
    expect(detectIntent('what is the fuel policy?')).toBe('fuel');
  });

  it('detects deposit intent', () => {
    expect(detectIntent('how much is the deposit?')).toBe('deposit');
  });

  it('detects accident intent', () => {
    expect(detectIntent('there was a crash')).toBe('accident');
  });

  it('detects cancellation intent', () => {
    expect(detectIntent('customer wants to cancel')).toBe('cancellation');
  });

  it('returns general for unknown', () => {
    expect(detectIntent('hello how are you')).toBe('general');
  });
});
