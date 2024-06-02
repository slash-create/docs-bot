const roundFactor =
	(fn: (arg: number) => number) =>
	(n: number, factor = 1) =>
		fn(n / factor) * factor;

export const floorByFactor = roundFactor(Math.floor);
export const ceilByFactor = roundFactor(Math.ceil);
export const roundByFactor = roundFactor(Math.round);

export default {
	floor: floorByFactor,
	ceil: ceilByFactor,
	round: roundByFactor,
};
