import { Camera } from "../src/camera";

async function main() {
	const cam = new Camera();

	cam.open("/dev/video0");

	const controls = cam.queryControls();

	for (const control of controls) {
		cam.subscribeControlEvent(control.id, { sendInitial: true });
	}

	cam.on("control-change", event => {
		console.log(event);
	});

	cam.enableBackgroundControlChangeEvents();
}

main();
