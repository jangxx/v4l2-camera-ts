import { Camera, DeviceCapabilities } from "../src";
import { printCapabilities } from "./util";

function main() {
	const cam = new Camera();

	cam.open("/dev/video0");

	const capabilities = cam.getCapabilities();

	console.log("Driver:", capabilities.driver);
	console.log("Card:", capabilities.card);
	console.log("Bus info:", capabilities.busInfo);
	console.log("Version:", capabilities.version);

	console.log();
	console.log("All capabilities (physical device):");
	printCapabilities(capabilities.allCapabilities);

	if (capabilities.currentCapabilities) {
		console.log();
		console.log("Capabilities (logical device):");
		printCapabilities(capabilities.currentCapabilities);
	}

	cam.close();
}

main();
