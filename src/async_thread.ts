export abstract class AsyncThread {
	private _running: boolean = false;

	get isRunning() {
		return this._running;
	}

	start() {
		if (this._running) {
			throw new Error("AsyncThread is already running");
		}

		this._running = true;

		this.run().then(
			() => {
				this._running = false;
			},
			err => {
				this._running = false;
			},
		);
	}

	abstract run(): Promise<void>;
}
