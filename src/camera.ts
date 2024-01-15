import fs from "fs";
import ref from "ref-napi";
import { v4l2_open, v4l2_close, v4l2_ioctl, v4l2_mmap, v4l2_munmap, is_readable_async } from "libv4l2-ts/dist/libv4l2"
import {
	v4l2_format,
	ioctl,
	v4l2_buf_type,
	v4l2_streamparm,
	v4l2_queryctrl,
	V4L2_CTRL_FLAG_NEXT_CTRL,
	v4l2_control,
	v4l2_ctrl_type,
	v4l2_querymenu,
	v4l2_buffer,
	v4l2_memory,
	v4l2_requestbuffers,
} from "libv4l2-ts/dist/videodev2";
import { PROT_READ, PROT_WRITE, MAP_SHARED } from "libv4l2-ts/dist/mman";

import {
	GetCameraFormat,
	SetCameraFormat,
	colorspaceToString,
	fieldToString,
	fourccToString,
	stringToFourcc,
	transferFunctionToString,
} from "./format";
import { CameraControl, CameraControlMenu, CameraControlMenuEntry, CameraControlSingle, decodeFlags, decodeName, idToString, typeToString } from "./controls";

export class Camera {
	private _fd: number | null = null;

	private _buffers: Buffer[] | null = null;
	private _lastBuffer: number | null = null;
	private _dqBufStruct: InstanceType<typeof v4l2_buffer> | null = null;

	get started() {
		return this._buffers !== null;
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

		let anySet = false;

		if (format.width !== undefined) {
			fmt.fmt.pix.width = format.width;
			anySet = true;
		}
		if (format.height !== undefined) {
			fmt.fmt.pix.height = format.height;
			anySet = true;
		}
		if (format.pixelFormatStr !== undefined) {
			fmt.fmt.pix.pixelformat = stringToFourcc(format.pixelFormatStr);
			anySet = true;
		}

		if (anySet) {
			v4l2_ioctl(this._fd, ioctl.VIDIOC_S_FMT, fmt.ref());
		}

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

		for (querymenu.index = min; querymenu.index < max; querymenu.index++) {
			try {
				v4l2_ioctl(this._fd, ioctl.VIDIOC_QUERYMENU, querymenu.ref());

				menu.push({
					id: querymenu.id,
					idStr: idToString(querymenu.id),
					index: querymenu.index,
					name: decodeName(querymenu.union.name.buffer),
				});
			} catch(e: any) {}
		}

		return menu;
	}

	queryControls(): CameraControl[] {
		if (this._fd === null) {
			throw new Error("Camera is not open");
		}

		const ctrl = new v4l2_queryctrl();
		ctrl.id = V4L2_CTRL_FLAG_NEXT_CTRL;

		const controls: CameraControl[] = [];

		while (true) {
			try {
				v4l2_ioctl(this._fd, ioctl.VIDIOC_QUERYCTRL, ctrl.ref());

				if (ctrl.type === v4l2_ctrl_type.V4L2_CTRL_TYPE_MENU) {
					controls.push({
						id: ctrl.id,
						idStr: idToString(ctrl.id),
						type: ctrl.type,
						typeStr: typeToString(ctrl.type),
						name: decodeName(ctrl.name.buffer),
						default: ctrl.default_value,
						menu: this._queryMenu(ctrl.id, ctrl.minimum, ctrl.maximum),
						flags: decodeFlags(ctrl.flags),
					} as CameraControlMenu);
				} else {
					controls.push({
						id: ctrl.id,
						idStr: idToString(ctrl.id),
						type: ctrl.type,
						typeStr: typeToString(ctrl.type),
						name: decodeName(ctrl.name.buffer),
						min: ctrl.minimum,
						max: ctrl.maximum,
						step: ctrl.step,
						default: ctrl.default_value,
						flags: decodeFlags(ctrl.flags),
					} as CameraControlSingle);
				}

				ctrl.id = (ctrl.id | V4L2_CTRL_FLAG_NEXT_CTRL) >>> 0;
			} catch(e: any) {
				break;
			}
		}

		return controls;
	}

	getControl(id: number) {
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

				this._buffers.push(v4l2_mmap(
					buf.length,
					PROT_READ | PROT_WRITE,
					MAP_SHARED,
					this._fd,
					buf.m.offset,
				));

				v4l2_ioctl(this._fd, ioctl.VIDIOC_QBUF, buf.ref());
			}

			const type = ref.alloc(ref.types.int32, v4l2_buf_type.V4L2_BUF_TYPE_VIDEO_CAPTURE);

			v4l2_ioctl(this._fd, ioctl.VIDIOC_STREAMON, type);

			this._dqBufStruct = new v4l2_buffer();
		} catch(e: any) {
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

		while(!await is_readable_async(this._fd, 1000)) {}

		this._dqBufStruct.ref().fill(0);
		this._dqBufStruct.type = v4l2_buf_type.V4L2_BUF_TYPE_VIDEO_CAPTURE;
		this._dqBufStruct.memory = v4l2_memory.V4L2_MEMORY_MMAP;

		v4l2_ioctl(this._fd, ioctl.VIDIOC_DQBUF, this._dqBufStruct.ref());

		this._lastBuffer = this._dqBufStruct.index;

		return this._buffers![this._lastBuffer!];
	}
}