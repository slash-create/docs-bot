/**
 * Option 2
 *
 * @example
 * expire()
 *   .branch.after(3).hours
 *   .tag.after(30).minutes
 *   .latest.after(2).minutes
 *   .build()
 */

type TimeUnit = 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks';

type TExpire =
  & { [key: string]: { after(quantity: number): { [key in TimeUnit]: TExpire } } }
  & {
    build(): Record<string | symbol, number> & { total: number, valueOf(): number }
  };

export function expire(): TExpire {
  const data: Record<string | symbol, number> = {};

  function patch(payload: Partial<typeof data>) {
    Object.assign(data, payload);
    return proxy;
  }

  const handler: ProxyHandler<typeof data> = {
    get(target, prop) {
      if (prop === 'build') {
        return () => ({
          ...data,
          get total() {
            let acc = 0;
            for (const [key, value] of Object.entries(data)) {
              acc += value;
            }
            return acc;
          },
          valueOf() {
            return this.total;
          }
        });
      }

      return {
        after(quantity: number) {
          return {
            get seconds() { return patch({ [prop]: quantity }) },
            get minutes() { return patch({ [prop]: quantity * 60 }) },
            get hours() { return patch({ [prop]: quantity * 60 * 60 }) },
            get days() { return patch({ [prop]: quantity * 60 * 60 * 24 }) },
            get weeks() { return patch({ [prop]: quantity * 60 * 60 * 24 * 7 }) },
          }
        }
      };
    }
  }

  const proxy = new Proxy(data, handler);

  return proxy as unknown as TExpire;
}

// Only run this code if this file is executed as a script
if (import.meta.main) {
  const expires = expire()
    .branch.after(3).hours
    .tag.after(30).minutes
    .latest.after(2).minutes
    .build();

  console.log("immediate", expires);
  console.log("total", expires.total);
  console.log("valueOf", +expires);
}
