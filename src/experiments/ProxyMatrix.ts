/**
 * Option 1
 *
 * Calling 'branch', 'tag' or 'latest' will update the target key with the argument provided.
 * If the target key already exists, it will be overwritten.
 * If the proxy call follows with 'hours', 'minutes' or 'seconds', the value with be multiplied with the appropriate time unit.
 * If the proxy call follows with 'build', it returns the object inside the proxy - ending the chain.
 *
 * @example
 * Expires.with()
 *   .branch.after(3).hours
 *   .tag.after(30).minutes
 *   .latest.after(2).minutes
 *   .build()
 */
export class Expires {
  static with() { return new Expires() }

  #data: Record<string, number> = {};

  #patch(payload: Partial<Record<string, number>>) {
    this.#data = { ...this.#data, ...payload };
    return this;
  }

  #proxy(target: string) {
    const self = this;
    return {
      after(quantity: number): TimeUnitSelector {
        return {
          get seconds() { return self.#patch({ [target]: quantity }) },
          get minutes() { return self.#patch({ [target]: quantity * 60 }) },
          get hours() { return self.#patch({ [target]: quantity * 60 * 60 }) },
          get days() { return self.#patch({ [target]: quantity * 60 * 60 * 24 }) },
          get weeks() { return self.#patch({ [target]: quantity * 60 * 60 * 24 * 7 }) },
        }
      }
    }
  }

  get branch() { return this.#proxy('branch') }
  get tag() { return this.#proxy('tag') }
  get latest() { return this.#proxy('latest') }

  build() {
    const self = this;
    return Object.assign(this.#data, {
      get total() {
        let acc = 0;
        for (const [key, value] of Object.entries(self.#data)) {
          acc += value;
        }
        return acc;
      },
      valueOf() {
        return this.total;
      }
    });
  }
}

type TimeUnit = 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks';
type TimeUnitSelector = Record<TimeUnit, Expires>;

// Only run this code if this file is executed as a script
if (import.meta.main) {
  const expires = Expires.with()
    .branch.after(3).hours
    .tag.after(30).minutes
    .latest.after(2).minutes
    .build();

  console.log("immediate", expires);
  console.log("valueOf", +expires);
}
