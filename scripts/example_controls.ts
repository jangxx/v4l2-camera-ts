import { Camera } from "../src/camera";

function main() {
	const cam = new Camera();

	cam.open("/dev/video0");

	const controls = cam.queryControls();

	for (const control of controls) {
		console.log(">", control.name);

		if (!control.flags.writeOnly) {
			console.log("  value:", cam.getControl(control.id));
		}

		if ("menu" in control) {
			console.log("  options:");
			for (const entry of control.menu) {
				console.log("  -", entry.name);
			}
		} else if (!control.flags.readOnly) {
			console.log("  min:", control.min);
			console.log("  max:", control.max);
			console.log("  step:", control.step);
		}
	}

	cam.close();
}

main();
