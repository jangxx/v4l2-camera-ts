import { AsyncThread } from "./async_thread";
import { Camera } from "./camera";

export class ControlEventsThread extends AsyncThread {
	private _stopRequested: boolean = false;

	constructor(private _camera: Camera) {
		super();
	}

	stop() {
		this._stopRequested = true;
	}

	async run(): Promise<void> {
		while (!this._stopRequested) {
			await this._camera.getNextEvent();
		}
	}
}
