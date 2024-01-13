import { Camera } from "../src/camera";
import { V4L2_CID_BRIGHTNESS, V4L2_CID_CONTRAST } from "libv4l2-ts/dist/v4l2-controls";
import fsp from "fs/promises";

async function main() {
	const cam = new Camera();

	cam.open("/dev/video0");

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