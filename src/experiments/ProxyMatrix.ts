/**
 * Option 1
 *
 * Calling 'branch', 'tag' or 'latest' will update the target key with the argument provided.
 * If the target key already exists, it will be overwritten.
 * If the proxy call follows with 'hours', 'minutes' or 'seconds', the value with be multiplied with the appropriate time unit.
 * If the proxy call follows with 'build', it returns the object inside the proxy - ending the chain.
 *
 * @example
 * expires()
 *   .branch(3).hours()
 *   .tag(30).minutes()
 *   .latest(2).minutes()
 *   .build()
 */
function expires() {
	let key: string;

	const context = { branch: 0, tag: 0, latest: 0 };

	const handler: ProxyHandler<typeof context> = {
		get(target, prop) {
			if (prop === "branch" || prop === "tag" || prop === "latest") {
				key = prop;
				return new Proxy(this, handler);
			}

			if (prop === "hours") {
				context[key] *= 60;
			}

			if (prop === "minutes") {
				context[key] *= 60;
			}

			if (prop === "seconds") {
				context[key] *= 60;
			}
		},
		apply(target, thisArg, argArray) {
			if (key === "build") {
				return Object.freeze({ ...context });
			}

			return this;
		},
	};

	return new Proxy(context, handler);
}
