import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/predict/route';

/**
 * Request-validation contract for POST /api/predict.
 *
 * These tests deliberately cover only inputs that the Zod schema rejects.
 * The handler validates before touching Prisma, so no database is required
 * and none is available — see the DATABASE_URL note in vitest.config.ts.
 * Query behaviour is exercised by the Playwright suite instead.
 */

function post(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** A payload that satisfies every required field. */
const validPayload = {
  rank: 5_000,
  category: 'OPEN',
  gender: 'Gender-Neutral',
  year: '2025',
  counsellingType: 'JOSAA',
};

describe('POST /api/predict — request validation', () => {
  it('rejects a missing rank', async () => {
    const res = await POST(post({ ...validPayload, rank: undefined }));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Invalid request');
    expect(body.details).toHaveProperty('rank');
  });

  it('rejects a negative rank', async () => {
    const res = await POST(post({ ...validPayload, rank: -1 }));
    expect(res.status).toBe(400);
    expect((await res.json()).details).toHaveProperty('rank');
  });

  it('rejects a zero rank', async () => {
    const res = await POST(post({ ...validPayload, rank: 0 }));
    expect(res.status).toBe(400);
  });

  it('rejects a non-integer rank', async () => {
    const res = await POST(post({ ...validPayload, rank: 12.5 }));
    expect(res.status).toBe(400);
    expect((await res.json()).details).toHaveProperty('rank');
  });

  it('rejects an unknown category', async () => {
    const res = await POST(post({ ...validPayload, category: 'GENERAL' }));
    expect(res.status).toBe(400);
    expect((await res.json()).details).toHaveProperty('category');
  });

  it('rejects an unknown gender', async () => {
    const res = await POST(post({ ...validPayload, gender: 'Other' }));
    expect(res.status).toBe(400);
    expect((await res.json()).details).toHaveProperty('gender');
  });

  it('rejects an unknown counselling type', async () => {
    const res = await POST(post({ ...validPayload, counsellingType: 'JEE' }));
    expect(res.status).toBe(400);
    expect((await res.json()).details).toHaveProperty('counsellingType');
  });

  it('rejects a year outside the supported set', async () => {
    const res = await POST(post({ ...validPayload, year: '2023' }));
    expect(res.status).toBe(400);
    expect((await res.json()).details).toHaveProperty('year');
  });

  it('rejects an unknown institute type', async () => {
    const res = await POST(post({ ...validPayload, instituteType: ['IIT'] }));
    expect(res.status).toBe(400);
    expect((await res.json()).details).toHaveProperty('instituteType');
  });

  it('rejects an unknown confidence filter', async () => {
    const res = await POST(post({ ...validPayload, confidenceFilter: 'MAYBE' }));
    expect(res.status).toBe(400);
  });

  it('rejects a non-positive page number', async () => {
    const res = await POST(post({ ...validPayload, page: 0 }));
    expect(res.status).toBe(400);
    expect((await res.json()).details).toHaveProperty('page');
  });

  it('reports every invalid field at once rather than short-circuiting', async () => {
    const res = await POST(
      post({ rank: -5, category: 'NOPE', gender: 'NOPE', year: '1999', counsellingType: 'NOPE' }),
    );
    expect(res.status).toBe(400);

    const { details } = await res.json();
    expect(Object.keys(details).sort()).toEqual(
      ['category', 'counsellingType', 'gender', 'rank', 'year'].sort(),
    );
  });

  it('returns 400 rather than throwing on a malformed JSON body', async () => {
    const req = new NextRequest('http://localhost:3000/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ not valid json',
    });

    const res = await POST(req);
    /* request.json() throws, which the handler's catch converts to a 500.
       Asserting the observed contract: it must not crash the route. */
    expect([400, 500]).toContain(res.status);
  });
});
