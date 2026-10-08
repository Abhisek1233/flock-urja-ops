import { describe, it, expect } from 'vitest';
import { SingleFlight } from '../src/portal/singleFlight';

describe('SingleFlight Mutex', () => {
  it('deduplicates concurrent calls to the same key and returns identical results', async () => {
    const flight = new SingleFlight();
    let executionCount = 0;

    const slowFn = async () => {
      executionCount++;
      await new Promise(r => setTimeout(r, 50));
      return { token: 'abc-123' };
    };

    // Trigger 5 concurrent calls
    const promises = [
      flight.do('login', slowFn),
      flight.do('login', slowFn),
      flight.do('login', slowFn),
      flight.do('login', slowFn),
      flight.do('login', slowFn)
    ];

    const results = await Promise.all(promises);

    expect(executionCount).toBe(1); // exactly one execution!
    for (const res of results) {
      expect(res.token).toBe('abc-123');
    }

    // After resolution, another call will execute again
    const subsequentResult = await flight.do('login', slowFn);
    expect(executionCount).toBe(2);
    expect(subsequentResult.token).toBe('abc-123');
  });
});
