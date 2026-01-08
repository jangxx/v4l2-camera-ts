import {
	V4L2_CAP_ASYNCIO,
	V4L2_CAP_AUDIO,
	V4L2_CAP_EXT_PIX_FORMAT,
	V4L2_CAP_HW_FREQ_SEEK,
	V4L2_CAP_META_CAPTURE,
	V4L2_CAP_MODULATOR,
	V4L2_CAP_RADIO,
	V4L2_CAP_RDS_CAPTURE,
	V4L2_CAP_RDS_OUTPUT,
	V4L2_CAP_READWRITE,
	V4L2_CAP_SDR_CAPTURE,
	V4L2_CAP_SDR_OUTPUT,
	V4L2_CAP_SLICED_VBI_CAPTURE,
	V4L2_CAP_SLICED_VBI_OUTPUT,
	V4L2_CAP_STREAMING,
	V4L2_CAP_TOUCH,
	V4L2_CAP_TUNER,
	V4L2_CAP_VBI_CAPTURE,
	V4L2_CAP_VBI_OUTPUT,
	V4L2_CAP_VIDEO_CAPTURE,
	V4L2_CAP_VIDEO_CAPTURE_MPLANE,
	V4L2_CAP_VIDEO_M2M,
	V4L2_CAP_VIDEO_M2M_MPLANE,
	V4L2_CAP_VIDEO_OUTPUT,
	V4L2_CAP_VIDEO_OUTPUT_MPLANE,
	V4L2_CAP_VIDEO_OUTPUT_OVERLAY,
	V4L2_CAP_VIDEO_OVERLAY,
} from "libv4l2-ts/dist/videodev2";

export interface DeviceCapabilities {
	videoCapture: boolean;
	videoCaptureMultiplanar: boolean;
	videoOutput: boolean;
	videoOutputMultiplanar: boolean;
	videoM2M: boolean;
	videoM2MMultiplanar: boolean;
	videoOverlay: boolean;
	vbiCapture: boolean;
	vbiOutput: boolean;
	slicedVbiCapture: boolean;
	slicedVbiOutput: boolean;
	rdsCapture: boolean;
	videoOutputOverlay: boolean;
	hardwareFreqSeek: boolean;
	rdsOutput: boolean;
	tuner: boolean;
	audio: boolean;
	radio: boolean;
	modulator: boolean;
	sdrCapture: boolean;
	extendedPixFormat: boolean;
	sdrOutput: boolean;
	metadataCapture: boolean;
	readWrite: boolean;
	// asyncio: boolean;
	streaming: boolean;
	touch: boolean;
}

export interface CameraCapabilities {
	driver: string;
	card: string;
	busInfo: string;
	version: string;
	allCapabilities: DeviceCapabilities; // all capabilities of the physical device but not neccessarily of the logical one
	currentCapabilities?: DeviceCapabilities; // capabilities of the logical device
}

export function decodeCapabilities(capabilities: number): DeviceCapabilities {
	return {
		videoCapture: !!(capabilities & V4L2_CAP_VIDEO_CAPTURE),
		videoCaptureMultiplanar: !!(capabilities & V4L2_CAP_VIDEO_CAPTURE_MPLANE),
		videoOutput: !!(capabilities & V4L2_CAP_VIDEO_OUTPUT),
		videoOutputMultiplanar: !!(capabilities & V4L2_CAP_VIDEO_OUTPUT_MPLANE),
		videoM2M: !!(capabilities & V4L2_CAP_VIDEO_M2M),
		videoM2MMultiplanar: !!(capabilities & V4L2_CAP_VIDEO_M2M_MPLANE),
		videoOverlay: !!(capabilities & V4L2_CAP_VIDEO_OVERLAY),
		vbiCapture: !!(capabilities & V4L2_CAP_VBI_CAPTURE),
		vbiOutput: !!(capabilities & V4L2_CAP_VBI_OUTPUT),
		slicedVbiCapture: !!(capabilities & V4L2_CAP_SLICED_VBI_CAPTURE),
		slicedVbiOutput: !!(capabilities & V4L2_CAP_SLICED_VBI_OUTPUT),
		rdsCapture: !!(capabilities & V4L2_CAP_RDS_CAPTURE),
		videoOutputOverlay: !!(capabilities & V4L2_CAP_VIDEO_OUTPUT_OVERLAY),
		hardwareFreqSeek: !!(capabilities & V4L2_CAP_HW_FREQ_SEEK),
		rdsOutput: !!(capabilities & V4L2_CAP_RDS_OUTPUT),
		tuner: !!(capabilities & V4L2_CAP_TUNER),
		audio: !!(capabilities & V4L2_CAP_AUDIO),
		radio: !!(capabilities & V4L2_CAP_RADIO),
		modulator: !!(capabilities & V4L2_CAP_MODULATOR),
		sdrCapture: !!(capabilities & V4L2_CAP_SDR_CAPTURE),
		extendedPixFormat: !!(capabilities & V4L2_CAP_EXT_PIX_FORMAT),
		sdrOutput: !!(capabilities & V4L2_CAP_SDR_OUTPUT),
		metadataCapture: !!(capabilities & V4L2_CAP_META_CAPTURE),
		readWrite: !!(capabilities & V4L2_CAP_READWRITE),
		// asyncio: !!(capabilities & V4L2_CAP_ASYNCIO),
		streaming: !!(capabilities & V4L2_CAP_STREAMING),
		touch: !!(capabilities & V4L2_CAP_TOUCH),
	};
}

export function decodeVersion(version: number): string {
	const major = (version >> 16) & 0xff;
	const minor = (version >> 8) & 0xff;
	const patch = version & 0xff;

	return `${major}.${minor}.${patch}`;
}
