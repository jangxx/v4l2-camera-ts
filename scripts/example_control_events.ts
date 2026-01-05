import { Camera } from "../src/camera";

async function main() {
	const cam = new Camera();

	cam.open("/dev/video0");

	const controls = cam.queryControls();

	for (const control of controls) {
		cam.subscribeControlEvent(control.id, { sendInitial: true });
	}

	while (true) {
		const event = await cam.getNextEvent();

		if (event === null) {
			continue;
		}

		console.log(event);
	}
}

main();
