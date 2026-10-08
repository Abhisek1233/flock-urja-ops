/**
 * SingleFlight mutex to prevent thundering herds / concurrent login stampedes.
 * If multiple concurrent requests trigger a re-login, exactly one request executes
 * the promise-producing function, while all others wait on that identical promise.
 */
class SingleFlight {
  constructor() {
    this.inFlight = new Map();
  }

  /**
   * Execute fn only once for a given key while in flight.
   * @param {string} key
   * @param {() => Promise<any>} fn
   * @returns {Promise<any>}
   */
  async do(key, fn) {
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = (async () => {
      try {
        return await fn();
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }
}

module.exports = { SingleFlight };
