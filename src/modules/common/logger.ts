export function timeScope(label: string, fn: (mark: (...args: unknown[]) => void) => void | Promise<void>) {
  console.time(label);

  const mark = (...args: unknown[]) => console.timeLog(label, ...args);
  const end = () => console.timeEnd(label);

  const result = fn(mark);

  if (result instanceof Promise) result.then(end);
  else end();
}
