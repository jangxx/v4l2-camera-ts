import fs from "fs";
import ref from "ref-napi";
import {
	v4l2_open,
	v4l2_close,
	v4l2_ioctl,
	v4l2_mmap,
	v4l2_munmap,
	poll_async,
	V4l2Error,
} from "libv4l2-ts/dist/libv4l2";
import {
	v4l2_format,
	ioctl,
	v4l2_buf_type,
	v4l2_streamparm,
	V4L2_CTRL_FLAG_NEXT_CTRL,
	v4l2_control,
	v4l2_ctrl_type,
	v4l2_querymenu,
	v4l2_buffer,
	v4l2_memory,
	v4l2_requestbuffers,
	v4l2_event,
	V4L2_EVENT_CTRL,
	v4l2_event_subscription,
	V4L2_EVENT_SUB_FL_SEND_INITIAL,
	V4L2_EVENT_SUB_FL_ALLOW_FEEDBACK,
	V4L2_EVENT_ALL,
	V4L2_EVENT_CTRL_CH_VALUE,
	v4l2_query_ext_ctrl,
	v4l2_capability,
	V4L2_CAP_DEVICE_CAPS,
	v4l2_fmtdesc,
	V4L2_FMT_FLAG_COMPRESSED,
	V4L2_FMT_FLAG_EMULATED,
	v4l2_frmsizeenum,
	v4l2_frmsizetypes,
	v4l2_frmivalenum,
	v4l2_frmivaltypes,
	V4L2_CTRL_FLAG_NEXT_COMPOUND,
} from "libv4l2-ts/dist/videodev2";
import { PROT_READ, PROT_WRITE, MAP_SHARED } from "libv4l2-ts/dist/mman";
import { Buffer } from "node:buffer";
import { EventEmitter } from "node:events";

import {
	GetCameraFormat,
	SetCameraFormat,
	SupportedCameraFormat,
	SupportedCameraFormatExtended,
	SupportedFrameFormat,
	colorspaceToString,
	fieldToString,
	formatTypeToString,
	fourccToString,
	stringToFourcc,
	transferFunctionToString,
} from "./format";
import {
	CameraControl,
	CameraControlEvent,
	CameraControlMenu,
	CameraControlMenuEntry,
	CameraControlSingle,
	decodeControlFlags,
	decodeName,
	controlIdToString,
	controlTypeToString,
} from "./controls";
import { CaptureThread } from "./capture_thread";
import { ControlEventsThread } from "./control_events_thread";
import { SubscribeEventFlags } from "./camera_interfaces";
import { CameraCapabilities, decodeCapabilities, decodeVersion } from "./capabilities";

interface CameraEvents {
	frame: [Buffer];
	"control-change": [CameraControlEvent];
}

export class Camera extends EventEmitter<CameraEvents> {
	private _fd: number | null = null;

	private _buffers: Buffer[] | null = null;
	private _lastBuffer: number | null = null;
	private _dqBufStruct: InstanceType<typeof v4l2_buffer> | null = null;

	private _captureThread: CaptureThread | null = null;
	private _controlEventsThread: ControlEventsThread | null = null;

	get opened() {
		return this._fd !== null;
	}

	get started() {
		return this._buffers !== null;
	}

	get backgroundFrameCaptureEnabled() {
		return this._captureThread !== null && this._captureThread.isRunning;
	}

	get backgroundControlChangeEventsEnabled() {
		return this._controlEventsThread !== null && this._controlEventsThread.isRunning;
	}

	open(path: string) {
		if (this._fd !== null) {
			throw new Error("Camera is already open");
		}

		this._fd = v4l2_open(path, fs.constants.O_RDWR | fs.constants.O_NONBLOCK);
	}

	close() {
		if (this._fd === null) {
			throw new Error("Camera is not open");
		}

		v4l2_close(this._fd);
		this._fd = null;
	}

	queryFormat(): GetCameraFormat {
		if (this._fd === null) {
			throw new Error("Camera is not open");
		}

		const fmt = new v4l2_format();
		fmt.type = v4l2_buf_type.V4L2_BUF_TYPE_VIDEO_CAPTURE;

		v4l2_ioctl(this._fd, ioctl.VIDIOC_G_FMT, fmt.ref());

		const parm = new v4l2_streamparm();
		parm.type = v4l2_buf_type.V4L2_BUF_TYPE_VIDEO_CAPTURE;

		v4l2_ioctl(this._fd, ioctl.VIDIOC_G_PARM, parm.ref());

		const format: GetCameraFormat = {
			width: fmt.fmt.pix.width,
			height: fmt.fmt.pix.height,
			pixelFormat: fmt.fmt.pix.pixelformat,
			pixelFormatStr: fourccToString(fmt.fmt.pix.pixelformat),
			field: fmt.fmt.pix.field,
			fieldStr: fieldToString(fmt.fmt.pix.field),
			bytesPerLine: fmt.fmt.pix.bytesperline,
			sizeImage: fmt.fmt.pix.sizeimage,
			colorspace: fmt.fmt.pix.colorspace,
			colorspaceStr: colorspaceToString(fmt.fmt.pix.colorspace),
			transferFunction: fmt.fmt.pix.xfer_func,
			transferFunctionStr: transferFunctionToString(fmt.fmt.pix.xfer_func),
			fpsNumerator: parm.parm.capture.timeperframe.numerator,
			fpsDenominator: parm.parm.capture.timeperframe.denominator,
		};

		return format;
	}

	setFormat(format: SetCameraFormat) {
		if (this._fd === null) {
			throw new Error("Camera is not open");
		}

		const fmt = new v4l2_format();
		fmt.type = v4l2_buf_type.V4L2_BUF_TYPE_VIDEO_CAPTURE;

		fmt.fmt.pix.width = format.width;
		fmt.fmt.pix.height = format.height;
		fmt.fmt.pix.pixelformat = stringToFourcc(format.pixelFormatStr);

		v4l2_ioctl(this._fd, ioctl.VIDIOC_S_FMT, fmt.ref());

		if (format.fps !== undefined) {
			const parm = new v4l2_streamparm();

			parm.type = v4l2_buf_type.V4L2_BUF_TYPE_VIDEO_CAPTURE;
			parm.parm.capture.timeperframe.numerator = format.fps.numerator;
			parm.parm.capture.timeperframe.denominator = format.fps.denominator;

			v4l2_ioctl(this._fd, ioctl.VIDIOC_S_PARM, parm.ref());
		}
	}

	private _queryMenu(id: number, min: number, max: number): CameraControlMenuEntry[] {
		if (this._fd === null) {
			throw new Error("Camera is not open");
		}

		const menu: CameraControlMenuEntry[] = [];

		const querymenu = new v4l2_querymenu();
		querymenu.id = id;

		for (querymenu.index = min; querymenu.index <= max; querymenu.index++) {
			try {
				v4l2_ioctl(this._fd, ioctl.VIDIOC_QUERYMENU, querymenu.ref());

				menu.push({
					id: querymenu.id,
					idStr: controlIdToString(querymenu.id),
					index: querymenu.index,
					name: decodeName(querymenu.union.name.buffer),
				});
			} catch (e: any) {}
		}

		return menu;
	}

	queryControls(): CameraControl[] {
		if (this._fd === null) {
			throw new Error("Camera is not open");
		}

		const nextControlFlags = (V4L2_CTRL_FLAG_NEXT_CTRL | V4L2_CTRL_FLAG_NEXT_COMPOUND) >>> 0;

		const ctrl = new v4l2_query_ext_ctrl();
		ctrl.id = nextControlFlags;

		const controls: CameraControl[] = [];

		while (true) {
			try {
				v4l2_ioctl(this._fd, ioctl.VIDIOC_QUERY_EXT_CTRL, ctrl.ref());

				if (ctrl.type === v4l2_ctrl_type.V4L2_CTRL_TYPE_MENU) {
					const control: CameraControlMenu = {
						id: ctrl.id,
						idStr: controlIdToString(ctrl.id),
						type: ctrl.type,
						typeStr: controlTypeToString(ctrl.type),
						name: decodeName(ctrl.name.buffer),
						default: ctrl.default_value,
						menu: this._queryMenu(ctrl.id, ctrl.minimum, ctrl.maximum),
						flags: decodeControlFlags(ctrl.flags),
					};

					controls.push(control);
				} else {
					const control: CameraControlSingle = {
						id: ctrl.id,
						idStr: controlIdToString(ctrl.id),
						type: ctrl.type,
						typeStr: controlTypeToString(ctrl.type),
						name: decodeName(ctrl.name.buffer),
						min: ctrl.minimum,
						max: ctrl.maximum,
						step: ctrl.step,
						default: ctrl.default_value,
						flags: decodeControlFlags(ctrl.flags),
						elementSize: ctrl.elem_size,
						arrayElements: ctrl.elems,
						arrayDimensions: ctrl.dims.toArray().slice(0, ctrl.nr_of_dims),
					};

					controls.push(control);
				}

				ctrl.id = (ctrl.id | nextControlFlags) >>> 0;
			} catch (e: any) {
				break;
			}
		}

		return controls;
	}

	getControl(id: number): number {
		if (this._fd === null) {
			throw new Error("Camera is not open");
		}

		const control = new v4l2_control();
		control.id = id;

		v4l2_ioctl(this._fd, ioctl.VIDIOC_G_CTRL, control.ref());

		return control.value;
	}

	setControl(id: number, value: number) {
		if (this._fd === null) {
			throw new Error("Camera is not open");
		}

		const control = new v4l2_control();
		control.id = id;
		control.value = value;

		v4l2_ioctl(this._fd, ioctl.VIDIOC_S_CTRL, control.ref());

		return control.value;
	}

	start(bufferCount = 2) {
		if (this._fd === null) {
			throw new Error("Camera is not open");
		}

		if (this.started) {
			throw new Error("Camera is already started");
		}

		this._buffers = [];
		this._lastBuffer = null;

		try {
			const req = new v4l2_requestbuffers();
			req.count = bufferCount;
			req.type = v4l2_buf_type.V4L2_BUF_TYPE_VIDEO_CAPTURE;
			req.memory = v4l2_memory.V4L2_MEMORY_MMAP;

			v4l2_ioctl(this._fd, ioctl.VIDIOC_REQBUFS, req.ref());

			for (let i = 0; i < bufferCount; i++) {
				const buf = new v4l2_buffer();
				buf.type = v4l2_buf_type.V4L2_BUF_TYPE_VIDEO_CAPTURE;
				buf.memory = v4l2_memory.V4L2_MEMORY_MMAP;
				buf.index = i;

				v4l2_ioctl(this._fd, ioctl.VIDIOC_QUERYBUF, buf.ref());

				this._buffers.push(
					v4l2_mmap(buf.length, PROT_READ | PROT_WRITE, MAP_SHARED, this._fd, buf.m.offset),
				);

				v4l2_ioctl(this._fd, ioctl.VIDIOC_QBUF, buf.ref());
			}

			const type = ref.alloc(ref.types.int32, v4l2_buf_type.V4L2_BUF_TYPE_VIDEO_CAPTURE);

			v4l2_ioctl(this._fd, ioctl.VIDIOC_STREAMON, type);

			this._dqBufStruct = new v4l2_buffer();
		} catch (e: any) {
			this._buffers = null;
			this._lastBuffer = null;
			throw e;
		}
	}

	stop() {
		if (this._fd === null) {
			throw new Error("Camera is not open");
		}

		if (!this.started) {
			throw new Error("Camera is not started");
		}

		const type = ref.alloc(ref.types.int32, v4l2_buf_type.V4L2_BUF_TYPE_VIDEO_CAPTURE);

		v4l2_ioctl(this._fd, ioctl.VIDIOC_STREAMOFF, type);

		for (const buf of this._buffers!) {
			v4l2_munmap(buf);
		}

		this._buffers = null;
		this._lastBuffer = null;
	}

	async getNextFrame(): Promise<Buffer> {
		if (this._fd === null) {
			throw new Error("Camera is not open");
		}

		if (!this.started) {
			throw new Error("Camera is not started");
		}

		if (this._lastBuffer !== null) {
			// queue the buffer again
			v4l2_ioctl(this._fd, ioctl.VIDIOC_QBUF, this._dqBufStruct!.ref());
		}

		let pollResult;
		do {
			pollResult = await poll_async(this._fd, 1000, { pollin: true });
		} while (pollResult === null || !pollResult.pollin);

		this._dqBufStruct!.ref().fill(0);
		this._dqBufStruct!.type = v4l2_buf_type.V4L2_BUF_TYPE_VIDEO_CAPTURE;
		this._dqBufStruct!.memory = v4l2_memory.V4L2_MEMORY_MMAP;

		v4l2_ioctl(this._fd, ioctl.VIDIOC_DQBUF, this._dqBufStruct!.ref());
		this._lastBuffer = this._dqBufStruct!.index;

		const buf = this._buffers![this._lastBuffer!];

		this.emit("frame", buf);

		return buf;
	}

	enableBackgroundFrameCapture() {
		if (this._captureThread !== null && this._captureThread.isRunning) {
			throw new Error("Capture thread is already started");
		}

		this._captureThread = new CaptureThread(this);
		this._captureThread.start();
	}

	disableBackgroundFrameCapture() {
		if (this._captureThread === null || !this._captureThread.isRunning) {
			throw new Error("Capture thread is not started");
		}

		this._captureThread.stop();
	}

	subscribeControlEvent(id: number, flags?: SubscribeEventFlags) {
		if (this._fd === null) {
			throw new Error("Camera is not open");
		}

		const eventSubscription = new v4l2_event_subscription();
		eventSubscription.type = V4L2_EVENT_CTRL;
		eventSubscription.id = id;

		if (flags?.sendInitial) {
			eventSubscription.flags |= V4L2_EVENT_SUB_FL_SEND_INITIAL;
		}
		if (flags?.allowFeedback) {
			eventSubscription.flags |= V4L2_EVENT_SUB_FL_ALLOW_FEEDBACK;
		}

		v4l2_ioctl(this._fd, ioctl.VIDIOC_SUBSCRIBE_EVENT, eventSubscription.ref());
	}

	unsubscribeControlEvent(id: number) {
		if (this._fd === null) {
			throw new Error("Camera is not open");
		}

		const eventSubscription = new v4l2_event_subscription();
		eventSubscription.type = V4L2_EVENT_CTRL;
		eventSubscription.id = id;

		v4l2_ioctl(this._fd, ioctl.VIDIOC_UNSUBSCRIBE_EVENT, eventSubscription.ref());
	}

	unsubscribeAllEvents() {
		if (this._fd === null) {
			throw new Error("Camera is not open");
		}

		const eventSubscription = new v4l2_event_subscription();
		eventSubscription.type = V4L2_EVENT_ALL;

		v4l2_ioctl(this._fd, ioctl.VIDIOC_UNSUBSCRIBE_EVENT, eventSubscription.ref());
	}

	async getNextEvent(): Promise<CameraControlEvent | null> {
		if (this._fd === null) {
			throw new Error("Camera is not open");
		}

		let pollResult;
		do {
			pollResult = await poll_async(this._fd, 1000, { pollpri: true });
		} while (pollResult === null || !pollResult.pollpri);

		const eventData = new v4l2_event();

		v4l2_ioctl(this._fd, ioctl.VIDIOC_DQEVENT, eventData.ref());

		if (eventData.type === V4L2_EVENT_CTRL && eventData.id > 0) {
			const ctrlEvent = eventData.u.ctrl;

			if (ctrlEvent.changes | V4L2_EVENT_CTRL_CH_VALUE) {
				const event: CameraControlEvent = {
					id: eventData.id,
					idStr: controlIdToString(eventData.id),
					type: ctrlEvent.type,
					typeStr: controlTypeToString(ctrlEvent.type),
					value: ctrlEvent.value.value,
					flags: decodeControlFlags(ctrlEvent.flags),
					default: ctrlEvent.default_value,
					min: ctrlEvent.minimum,
					max: ctrlEvent.maximum,
					step: ctrlEvent.step,
				};

				this.emit("control-change", event);

				return event;
			}
		}

		return null;
	}

	enableBackgroundControlChangeEvents() {
		if (this._controlEventsThread !== null && this._controlEventsThread.isRunning) {
			throw new Error("Control events thread is already started");
		}

		this._controlEventsThread = new ControlEventsThread(this);
		this._controlEventsThread.start();
	}

	disableBackgroundControlChangeEvents() {
		if (this._controlEventsThread === null || !this._controlEventsThread.isRunning) {
			throw new Error("Control events thread is not started");
		}

		this._controlEventsThread.stop();
	}

	getCapabilities(): CameraCapabilities {
		if (this._fd === null) {
			throw new Error("Camera is not open");
		}

		const caps = new v4l2_capability();

		v4l2_ioctl(this._fd, ioctl.VIDIOC_QUERYCAP, caps.ref());

		const capabilities: CameraCapabilities = {
			driver: decodeName(caps.driver.buffer),
			card: decodeName(caps.card.buffer),
			busInfo: decodeName(caps.bus_info.buffer),
			version: decodeVersion(caps.version),
			allCapabilities: decodeCapabilities(caps.capabilities),
		};

		if (caps.capabilities & V4L2_CAP_DEVICE_CAPS) {
			capabilities.currentCapabilities = decodeCapabilities(caps.device_caps);
		}

		return capabilities;
	}

	getSupportedFormats(): SupportedCameraFormat[] {
		if (this._fd === null) {
			throw new Error("Camera is not open");
		}

		const formats: SupportedCameraFormat[] = [];

		const fmt = new v4l2_fmtdesc();
		fmt.type = v4l2_buf_type.V4L2_BUF_TYPE_VIDEO_CAPTURE;

		for (fmt.index = 0; ; fmt.index++) {
			try {
				v4l2_ioctl(this._fd, ioctl.VIDIOC_ENUM_FMT, fmt.ref());

				formats.push({
					type: fmt.type,
					typeStr: formatTypeToString(fmt.type),
					description: decodeName(fmt.description.buffer),
					pixelFormat: fmt.pixelformat,
					pixelFormatStr: fourccToString(fmt.pixelformat),
					flags: {
						compressed: !!(fmt.flags & V4L2_FMT_FLAG_COMPRESSED),
						emulated: !!(fmt.flags & V4L2_FMT_FLAG_EMULATED),
					},
				});
			} catch (err: any) {
				if (err instanceof V4l2Error && err.errno === 22) {
					// EINVAL - no more formats
					break;
				} else {
					throw err; // rethrow all other errors
				}
			}
		}

		return formats;
	}

	getSupportedFormatsExtended(): SupportedCameraFormatExtended[] {
		if (this._fd === null) {
			throw new Error("Camera is not open");
		}

		const formats = this.getSupportedFormats();
		const extendedFormats: SupportedCameraFormatExtended[] = [];

		for (const format of formats) {
			const extendedFormat: SupportedCameraFormatExtended = { ...format, frameFormats: [] };

			const framesize = new v4l2_frmsizeenum();
			framesize.pixel_format = format.pixelFormat;

			for (framesize.index = 0; ; framesize.index++) {
				let frameFormat: SupportedFrameFormat;

				try {
					v4l2_ioctl(this._fd, ioctl.VIDIOC_ENUM_FRAMESIZES, framesize.ref());

					switch (framesize.type) {
						case v4l2_frmsizetypes.V4L2_FRMSIZE_TYPE_DISCRETE:
							frameFormat = {
								type: "discrete",
								width: framesize.union.discrete.width,
								height: framesize.union.discrete.height,
								intervals: [],
							};
							break;
						case v4l2_frmsizetypes.V4L2_FRMSIZE_TYPE_STEPWISE:
							frameFormat = {
								type: "stepwise",
								minWidth: framesize.union.stepwise.min_width,
								maxWidth: framesize.union.stepwise.max_width,
								stepWidth: framesize.union.stepwise.step_width,
								minHeight: framesize.union.stepwise.min_height,
								maxHeight: framesize.union.stepwise.max_height,
								stepHeight: framesize.union.stepwise.step_height,
								intervals: [],
							};
							break;
						case v4l2_frmsizetypes.V4L2_FRMSIZE_TYPE_CONTINUOUS:
							frameFormat = {
								type: "continuous",
								intervals: [],
							};
							break;
						default:
							throw new Error("Unknown frame size type");
					}
				} catch (err: any) {
					if (err instanceof V4l2Error && err.errno === 22) {
						// EINVAL - no more framesizes
						break;
					} else {
						throw err; // rethrow all other errors
					}
				}

				// get frame intervals for this frame size

				if (frameFormat.type === "discrete") {
					// not sure how to query intervals for stepwise and continuous?
					const frameinterval = new v4l2_frmivalenum();
					frameinterval.pixel_format = format.pixelFormat;
					frameinterval.width = frameFormat.width;
					frameinterval.height = frameFormat.height;

					for (frameinterval.index = 0; ; frameinterval.index++) {
						try {
							v4l2_ioctl(this._fd, ioctl.VIDIOC_ENUM_FRAMEINTERVALS, frameinterval.ref());

							switch (frameinterval.type) {
								case v4l2_frmivaltypes.V4L2_FRMIVAL_TYPE_DISCRETE:
									frameFormat.intervals.push({
										type: "discrete",
										numerator: frameinterval.union.discrete.numerator,
										denominator: frameinterval.union.discrete.denominator,
									});
									break;
								case v4l2_frmivaltypes.V4L2_FRMIVAL_TYPE_STEPWISE:
									frameFormat.intervals.push({
										type: "stepwise",
										minNumerator: frameinterval.union.stepwise.min.numerator,
										maxNumerator: frameinterval.union.stepwise.max.numerator,
										stepNumerator: frameinterval.union.stepwise.step.numerator,
										minDenominator: frameinterval.union.stepwise.min.denominator,
										maxDenominator: frameinterval.union.stepwise.max.denominator,
										stepDenominator: frameinterval.union.stepwise.step.denominator,
									});
									break;
								case v4l2_frmivaltypes.V4L2_FRMIVAL_TYPE_CONTINUOUS:
									frameFormat.intervals.push({
										type: "continuous",
									});
									break;
								default:
									throw new Error("Unknown frame interval type");
							}
						} catch (err: any) {
							if (err instanceof V4l2Error && err.errno === 22) {
								// EINVAL - no more frame intervals
								break;
							} else {
								throw err; // rethrow all other errors
							}
						}
					}
				}

				extendedFormat.frameFormats.push(frameFormat);
			}

			extendedFormats.push(extendedFormat);
		}

		return extendedFormats;
	}
}
