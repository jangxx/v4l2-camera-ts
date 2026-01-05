import { AsyncThread } from "./async_thread";
import { Camera } from "./camera";

export class CaptureThread extends AsyncThread {
	private _stopRequested: boolean = false;

	constructor(private _camera: Camera) {
		super();
	}

	stop() {
		this._stopRequested = true;
	}

	async run(): Promise<void> {
		if (!this._camera.started) {
			this._camera.start();
		}

		try {
			while (!this._stopRequested) {
				await this._camera.getNextFrame();
			}
		} finally {
			this._camera.stop();
		}
	}
}
