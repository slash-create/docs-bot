export class FixedInterval {
	#count = 0;
	#ref: ReturnType<typeof setTimeout>;

	constructor(
		/** _ ms to run interval call at. */
		public interval: number,
		/** _ ms to offset interval call by. */
		public offset: number,
		/** Should the first run after construction, or wait until a full cycle has completed. */
		public shortCall: boolean,
		/** The callback to run when each interval passes, including how many times it has run. */
		public callback: (count: number) => void | Promise<void>,
	) {
    if (this.shortCall) {
      this.callback(this.#count++);
    }

    this.run();
  }

	get timeUntilNextCall(): number {
		return this.interval - (Date.now() % this.interval) + this.offset;
	}

	get nextCallAt(): number {
		return Date.now() + this.timeUntilNextCall;
	}

  private clear() {
    if (!this.#ref) return;
    clearTimeout(this.#ref);
    this.#ref = null;
		this.#count = 0;
  }

	private run() {
		this.clear();
		this.#ref = setTimeout(() => {
      this.callback(this.#count++);
			this.run();
		}, this.timeUntilNextCall);
		return this;
	}

	destroy() {
		this.clear();
	}
}
