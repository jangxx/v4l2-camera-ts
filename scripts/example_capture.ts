import { Camera } from "../src/camera";
import fsp from "fs/promises";

async function main() {
	const cam = new Camera();

	cam.open("/dev/video0");

	console.log(cam.queryFormat());

	cam.setFormat({ width: 1920, height: 1080, pixelFormatStr: "MJPG" });

	cam.start();

	for (let i = 0; i < 10; i++) {
		const frame = await cam.getNextFrame();

		await fsp.writeFile(`./test/frame-${i}.jpg`, frame);
	}

	cam.stop();
	cam.close();
}

main();
