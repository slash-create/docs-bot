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
 *   .branch.after(3).hours()
 *   .tag.after(30).minutes()
 *   .latest.after(2).minutes()
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
    return this.#data;
  }
}

type TimeUnit = 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks';
type TimeUnitSelector = Record<TimeUnit, Expires>;
