export function enumerable(
  enumerable: boolean
) {
  return <T extends object, TKey extends keyof T>(
    target: T,
    propertyKey: TKey,
    descriptor: PropertyDescriptor
  ) => {
    descriptor.enumerable = enumerable;

    return descriptor;
  };
}
export function configurable(
  configurable: boolean
) {
  return <T extends object, TKey extends keyof T>(
    target: T,
    propertyKey: TKey,
    descriptor: PropertyDescriptor
  ) => {
    descriptor.configurable = configurable;

    return descriptor;
  };
}

export function writable(
  writable: boolean
) {
  return <T extends object, TKey extends keyof T>(
    target: T,
    propertyKey: TKey,
    descriptor: PropertyDescriptor
  ) => {
    descriptor.writable = writable;

    return descriptor;
  };
}
