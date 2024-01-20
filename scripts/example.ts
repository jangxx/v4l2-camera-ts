import { Camera } from "../src/camera";
import { v4l2_controls } from "libv4l2-ts";
import fsp from "fs/promises";

const { V4L2_CID_CONTRAST } = v4l2_controls;

async function main() {
	const cam = new Camera();

	cam.open("/dev/video0");

	console.log(cam.queryFormat());

	cam.setFormat({ width: 1920, height: 1080, pixelFormatStr: "MJPG" });

	// console.log(JSON.stringify(cam.queryControls(), null, 2));

	// console.log(cam.getControl(V4L2_CID_CONTRAST));
	
	cam.start();

	for (let i = 0; i < 10; i++) {
		const frame = await cam.getNextFrame();

		await fsp.writeFile(`./test/frame-${i}.jpg`, frame);
	}

	cam.stop();
	cam.close();
}

main();
