import { videodev2, v4l2_controls } from "libv4l2-ts";

const { v4l2_ctrl_type } = videodev2;

const CONTROL_MAP: Record<number, string> = {};

for (const key in v4l2_controls) {
	const value = v4l2_controls[key as keyof typeof v4l2_controls];

	if (key.startsWith("V4L2_CID_") && typeof value === "number") {
		CONTROL_MAP[value] = key;
	}
}

export interface CameraControlFlags {
	disabled: boolean,
	grabbed: boolean,
	readOnly: boolean,
	update: boolean,
	inactive: boolean,
	slider: boolean,
	writeOnly: boolean,
	volatile: boolean,
	hasPayload: boolean,
	executeOnWrite: boolean,
	modifyLayout: boolean,
}

export interface CameraControlMenuEntry {
	id: number,
	idStr: string,
	index: number,
	name: string;
}

export interface CameraControlBase {
	id: number,
	idStr: string,
	type: number,
	typeStr: string,
	name: string,
	flags: CameraControlFlags,
	default: number,
}

export type CameraControlSingle = CameraControlBase & {
	min: number,
	max: number,
	step: number,
}

export type CameraControlMenu = CameraControlBase & {
	menu: CameraControlMenuEntry[],
}

export type CameraControl = CameraControlSingle | CameraControlMenu;

export function decodeName(nameRaw: Buffer) {
	let name = "";

	for (const char of nameRaw) {
		if (char === 0) {
			break;
		}

		name += String.fromCharCode(char);
	}

	return name;
}

export function decodeFlags(flags: number): CameraControlFlags {
	return {
		disabled: (flags & videodev2.V4L2_CTRL_FLAG_DISABLED) !== 0,
		grabbed: (flags & videodev2.V4L2_CTRL_FLAG_GRABBED) !== 0,
		readOnly: (flags & videodev2.V4L2_CTRL_FLAG_READ_ONLY) !== 0,
		update: (flags & videodev2.V4L2_CTRL_FLAG_UPDATE) !== 0,
		inactive: (flags & videodev2.V4L2_CTRL_FLAG_INACTIVE) !== 0,
		slider: (flags & videodev2.V4L2_CTRL_FLAG_SLIDER) !== 0,
		writeOnly: (flags & videodev2.V4L2_CTRL_FLAG_WRITE_ONLY) !== 0,
		volatile: (flags & videodev2.V4L2_CTRL_FLAG_VOLATILE) !== 0,
		hasPayload: (flags & videodev2.V4L2_CTRL_FLAG_HAS_PAYLOAD) !== 0,
		executeOnWrite: (flags & videodev2.V4L2_CTRL_FLAG_EXECUTE_ON_WRITE) !== 0,
		modifyLayout: (flags & videodev2.V4L2_CTRL_FLAG_MODIFY_LAYOUT) !== 0,
	};
}

export function typeToString(type: number) {
	return v4l2_ctrl_type[type] || "UNKNOWN";
}

export function idToString(id: number) {
	return CONTROL_MAP[id] || "UNKNOWN";
}