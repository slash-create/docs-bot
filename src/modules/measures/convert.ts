import convert from 'convert-units';
import all from 'convert-units/definitions/all';

export const measure = convert(all);
export const described = measure().list();
export const list = measure().measures();
export const filtered = list.filter((unit, index, arr) => arr.indexOf(unit) === index && unit.toLowerCase() === unit);
export const grouped = Object.groupBy(described, (unit) => unit.measure);
