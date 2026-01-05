import { Camera } from "../src/camera";
import fs from "fs";

function main() {
	const cam = new Camera();

	cam.open("/dev/video0");

	console.log(cam.queryFormat());

	cam.setFormat({ width: 1920, height: 1080, pixelFormatStr: "MJPG" });

	let i = 0;

	cam.on("frame", buf => {
		fs.writeFileSync(`./test/frame-${i}.jpg`, buf);

		i++;

		if (i >= 10) {
			cam.disableBackgroundFrameCapture();
			cam.close();
		}
	});

	cam.enableBackgroundFrameCapture();
}

main();
