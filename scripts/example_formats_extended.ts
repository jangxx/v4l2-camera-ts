import { Camera } from "../src";

function main() {
	const cam = new Camera();

	cam.open("/dev/video0");

	const formats = cam.getSupportedFormatsExtended();

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

		console.log("  Frame Sizes:");

		for (const frameFormats of format.frameFormats) {
			switch (frameFormats.type) {
				case "discrete":
					console.log(`    Discrete: ${frameFormats.width}x${frameFormats.height}`);
					break;
				case "stepwise":
					console.log(
						`    Stepwise: ${frameFormats.minWidth}x${frameFormats.minHeight} to ${frameFormats.maxWidth}x${frameFormats.maxHeight} (step ${frameFormats.stepWidth}x${frameFormats.stepHeight})`,
					);
					break;
				case "continuous":
					console.log("    Continuous");
					break;
			}

			for (const interval of frameFormats.intervals) {
				switch (interval.type) {
					case "discrete":
						const seconds = interval.numerator / interval.denominator;
						const fps = interval.denominator / interval.numerator;
						console.log(`      Discrete: ${seconds.toFixed(3)}s (${fps.toFixed(2)} fps)`);
						break;
					case "stepwise":
						const minSeconds = interval.minNumerator / interval.minDenominator;
						const minFps = interval.minDenominator / interval.minNumerator;
						const maxSeconds = interval.maxNumerator / interval.maxDenominator;
						const maxFps = interval.maxDenominator / interval.maxNumerator;
						const stepSeconds = interval.stepNumerator / interval.stepDenominator;
						const stepFps = interval.stepDenominator / interval.stepNumerator;
						console.log(
							`      Stepwise: ${minSeconds.toFixed(3)}s (${minFps.toFixed(2)} fps) to ${maxSeconds.toFixed(3)}s (${maxFps.toFixed(2)} fps) (step ${stepSeconds.toFixed(3)}s (${stepFps.toFixed(2)} fps))`,
						);
						break;
					case "continuous":
						console.log("      Continuous");
						break;
				}
			}
		}

		console.log();
	}

	cam.close();
}

main();
