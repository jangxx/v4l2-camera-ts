import { DeviceCapabilities } from "../src";

export function printCapabilities(capabilities: DeviceCapabilities) {
	if (capabilities.videoCapture) console.log(" - Video Capture");
	if (capabilities.videoCaptureMultiplanar) console.log(" - Video Capture Multiplanar");
	if (capabilities.videoOutput) console.log(" - Video Output");
	if (capabilities.videoOutputMultiplanar) console.log(" - Video Output Multiplanar");
	if (capabilities.videoM2M) console.log(" - Video Memory-To-Memory");
	if (capabilities.videoM2MMultiplanar) console.log(" - Video Memory-To-Memory Multiplanar");
	if (capabilities.videoOverlay) console.log(" - Video Overlay");
	if (capabilities.vbiCapture) console.log(" - VBI Capture");
	if (capabilities.vbiOutput) console.log(" - VBI Output");
	if (capabilities.slicedVbiCapture) console.log(" - Sliced VBI Capture");
	if (capabilities.slicedVbiOutput) console.log(" - Sliced VBI Output");
	if (capabilities.rdsCapture) console.log(" - RDS Capture");
	if (capabilities.videoOutputOverlay) console.log(" - Video Output Overlay");
	if (capabilities.hardwareFreqSeek) console.log(" - Hardware Frequency Seek");
	if (capabilities.rdsOutput) console.log(" - RDS Output");
	if (capabilities.tuner) console.log(" - Tuner");
	if (capabilities.audio) console.log(" - Audio");
	if (capabilities.radio) console.log(" - Radio");
	if (capabilities.modulator) console.log(" - Modulator");
	if (capabilities.sdrCapture) console.log(" - SDR Capture");
	if (capabilities.extendedPixFormat) console.log(" - Extended Pixel Format");
	if (capabilities.sdrOutput) console.log(" - SDR Output");
	if (capabilities.metadataCapture) console.log(" - Metadata Capture");
	if (capabilities.readWrite) console.log(" - Read/Write");
	if (capabilities.streaming) console.log(" - Streaming");
	if (capabilities.touch) console.log(" - Touch");
}
