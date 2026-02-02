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
	disabled: boolean;
	grabbed: boolean;
	readOnly: boolean;
	update: boolean;
	inactive: boolean;
	slider: boolean;
	writeOnly: boolean;
	volatile: boolean;
	hasPayload: boolean;
	executeOnWrite: boolean;
	modifyLayout: boolean;
	dynamicArray: boolean;
	hasWhichMinMax: boolean;
}

export interface CameraControlMenuEntry {
	id: number;
	idStr: string;
	index: number;
	name: string;
}

export interface CameraControlBase {
	id: number;
	idStr: string;
	type: number;
	typeStr: string;
	name: string;
	flags: CameraControlFlags;
	default: number;
}

export type CameraControlSingle = CameraControlBase & {
	min: number;
	max: number;
	step: number;
	elementSize: number;
	arrayElements: number;
	arrayDimensions: number[];
};

export type CameraControlMenu = CameraControlBase & {
	menu: CameraControlMenuEntry[];
};

export type CameraControl = CameraControlSingle | CameraControlMenu;

export interface CameraControlEvent {
	id: number;
	idStr: string;
	type: number;
	typeStr: string;
	value: number;
	flags: CameraControlFlags;
	default: number;
	min: number;
	max: number;
	step: number;
}

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

export function decodeControlFlags(flags: number): CameraControlFlags {
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
		dynamicArray: (flags & videodev2.V4L2_CTRL_FLAG_DYNAMIC_ARRAY) !== 0,
		hasWhichMinMax: (flags & videodev2.V4L2_CTRL_FLAG_HAS_WHICH_MIN_MAX) !== 0,
	};
}

export function controlTypeToString(type: number) {
	return v4l2_ctrl_type[type] || "UNKNOWN";
}

export function controlIdToString(id: number) {
	return CONTROL_MAP[id] || "UNKNOWN";
}

export enum ComplexControlType {
	Int32 = "int32",
	Int64 = "int64",
	String = "string",
	Uint8Matrix = "uint8_matrix",
	Uint16Matrix = "uint16_matrix",
	Uint32Matrix = "uint32_matrix",
	Area = "area",
	Rect = "rect",
}

type ComplexControlDataBase = {
	type: ComplexControlType;
};

export type ComplexControlDataInt32 = ComplexControlDataBase & {
	type: ComplexControlType.Int32;
	value: number;
};

export type ComplexControlDataInt64 = ComplexControlDataBase & {
	type: ComplexControlType.Int64;
	value: number;
};

export type ComplexControlDataString = ComplexControlDataBase & {
	type: ComplexControlType.String;
	value: string | null;
};

export type ComplexControlDataUint8 = ComplexControlDataBase & {
	type: ComplexControlType.Uint8Matrix;
	values: number[];
};

export type ComplexControlDataUint16 = ComplexControlDataBase & {
	type: ComplexControlType.Uint16Matrix;
	values: number[];
};

export type ComplexControlDataUint32 = ComplexControlDataBase & {
	type: ComplexControlType.Uint32Matrix;
	values: number[];
};

export type ComplexControlDataArea = ComplexControlDataBase & {
	type: ComplexControlType.Area;
	width: number;
	height: number;
};

export type ComplexControlDataRect = ComplexControlDataBase & {
	type: ComplexControlType.Rect;
	left: number;
	top: number;
	width: number;
	height: number;
};

export type ComplexControlData =
	| ComplexControlDataInt32
	| ComplexControlDataInt64
	| ComplexControlDataString
	| ComplexControlDataUint8
	| ComplexControlDataUint16
	| ComplexControlDataUint32
	| ComplexControlDataArea
	| ComplexControlDataRect;
