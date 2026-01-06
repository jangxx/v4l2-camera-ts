import { Camera } from "../src";

function main() {
	const cam = new Camera();

	cam.open("/dev/video0");

	const formats = cam.getSupportedFormats();

	for (const format of formats) {
		console.log(format.description);
		console.log(`  Pixel Format: ${format.pixelFormatStr}`);

		let flags = [];

		if (format.flags.compressed) {
			flags.push("Compressed");
		}
		if (format.flags.emulated) {
			flags.push("Emulated");
		}

		if (flags.length > 0) {
			console.log(`  Flags: ${flags.join(", ")}`);
		}

		console.log();
	}

	cam.close();
}

main();
