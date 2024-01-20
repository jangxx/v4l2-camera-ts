# v4l2-camera
Camera library for Linux (V4L2) written in pure TypeScript using `libv4l2-ts` for the interaction with the kernel.

## Installation

```
npm install v4l2-camera
```

## Usage

```ts
import { Camera } from "v4l2-camera";
import fsp from "fs/promises";

async function main() {
	const cam = new Camera();

	cam.open("/dev/video0");

	console.log(cam.queryFormat());

	// the format can only be set before starting
	cam.setFormat({ width: 1920, height: 1080, pixelFormatStr: "MJPG" });
	
	// allocate memory-mapped buffers and turn the stream on
	cam.start();

	// capture 10 frames and write them to JPEG files
	for (let i = 0; i < 10; i++) {
		// asynchronously wait until the camera fd is readable
		// and then exchange one of the memory-mapped buffers
		const frame = await cam.getNextFrame();

		await fsp.writeFile(`./test/frame-${i}.jpg`, frame);
	}

	// turn the stream off and unmap all buffers
	cam.stop();

	cam.close();
}

main();
```

## Methods & Classes

### `Camera`

`open(path: string): void`  
Opens the camera at the specified path.

`close(): void`  
Closes the camera. This needs to be the last operation done on the camera, otherwise its going to throw an error about the device being busy.

`queryFormat(): GetCameraFormat`  
Fetches information about the currently set format from the camera.
You can use this to determine if your `setFormat` call was successful.

`setFormat(format: SetCameraFormat): void`  
Set the width, height, pixel format and optionally the fps of the camera.
The fps can only be set for some pixel formats however (not for MJPG for example).

`queryControls(): CameraControl[]`  
Returns a list of all controls on the camera as well as all menu entries for menu controls.

`getControl(id: number): number`  
Get the current value for a control.
Valid numbers for the `id` parameter can be found in `v4l2_controls` in _libv4l2-ts_.
The constants always begin with `V4L2_CID_`.

`setControl(id: number, value: number): number`  
Sets a control value.
Valid numbers for the `id` parameter can be found in `v4l2_controls` in _libv4l2-ts_.
The constants always begin with `V4L2_CID_`.
The function returns the value that was provided in the `value` parameter.

`start(bufferCount: number = 2): void`  
Create and memory map buffers which are used for data exchange and turn the video stream on.
After this call returns, video frames can be retrieved with `getNextFrame()`.

`stop(): void`  
Stops the stream and unmaps all buffers.
After this call, buffers returned from `getNextFrame()` should not be accessed anymore, so make sure to copy all the data out of them before stopping the stream.

`async getNextFrame(): Promise<Buffer>`  
Wait for the next frame to be available, exchange a buffer with the driver and then return that buffer.
The returned buffers are not normal `Buffer`s however, since their underlying data points to a memory-mapped region that the V4L2 driver can write into.
This means that you need to copy the data out of them (e.g. with `Buffer.from(buf)`), or they are going to get overwritten by a later call to `getNextFrame()`.