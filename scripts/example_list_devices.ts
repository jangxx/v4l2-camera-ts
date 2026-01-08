import { listDevices } from "../src";
import { printCapabilities } from "./util";

async function main() {
	// get all video capture devices
	const devices = await listDevices({ videoCapture: true });

	for (const device of devices) {
		console.log("Device path:", device.path);

		if (device.links.length > 0) {
			console.log("Links:");
			for (const link of device.links) {
				console.log(" -", link);
			}
		}

		console.log("Capabilities:");
		printCapabilities(
			device.capabilities.currentCapabilities ?? device.capabilities.allCapabilities,
		);

		console.log();
	}
}

main();
