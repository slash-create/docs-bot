export const titleCase = (input: string) => input.charAt(0).toUpperCase() + input.slice(1);

export const hashMapToString = (input: object, connector: string = ' = ', seperator: string = ', ') =>
  Object.keys(input)
    .map((key) => key + connector + input[key])
    .join(seperator);

export const plural = (n: number, one: string, more: string = one + 's') => (n === 1 ? one : more);
