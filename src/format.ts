import { v4l2_field, v4l2_colorspace, v4l2_xfer_func } from "libv4l2-ts/dist/videodev2";
import { v4l2_fourcc } from "libv4l2-ts/dist/libv4l2";

export interface GetCameraFormat {
	width: number;
	height: number;
	pixelFormat: string;
	pixelFormatStr: string;
	field: string;
	fieldStr: string;
	bytesPerLine: number;
	sizeImage: number;
	colorspace: string;
	colorspaceStr: string;
	transferFunction: string;
	transferFunctionStr: string;
	fpsNumerator: number;
	fpsDenominator: number;
}

export interface SetCameraFormat {
	width?: number;
	height?: number;
	pixelFormatStr?: string;
	fps?: {
		numerator: number;
		denominator: number;
	};
}

export function stringToFourcc(str: string): number {
	if (str.length !== 4) {
		throw new Error("FourCC string must be 4 characters long");
	}

	return v4l2_fourcc(str[0], str[1], str[2], str[3]);
}

export function fourccToString(fourcc: number): string {
	return String.fromCharCode(
		(fourcc >> 0) & 0x7f,
		(fourcc >> 8) & 0x7f,
		(fourcc >> 16) & 0x7f,
		(fourcc >> 24) & 0x7f,
	);
}

export function fieldToString(field: number): string {
	switch(field) {
		case v4l2_field.V4L2_FIELD_ANY:
			return "Any";
		case v4l2_field.V4L2_FIELD_NONE:
			return "None";
		case v4l2_field.V4L2_FIELD_TOP:
			return "Top";
		case v4l2_field.V4L2_FIELD_BOTTOM:
			return "Bottom";
		case v4l2_field.V4L2_FIELD_INTERLACED:
			return "Interlaced";
		case v4l2_field.V4L2_FIELD_SEQ_TB:
			return "Sequential Top-Bottom";
		case v4l2_field.V4L2_FIELD_SEQ_BT:
			return "Sequential Bottom-Top";
		case v4l2_field.V4L2_FIELD_ALTERNATE:
			return "Alternate";
		case v4l2_field.V4L2_FIELD_INTERLACED_TB:
			return "Interlaced Top-Bottom";
		case v4l2_field.V4L2_FIELD_INTERLACED_BT:
			return "Interlaced Bottom-Top";
		default:
			return "Unknown";
	}
}

export function colorspaceToString(colorspace: number): string {
	switch(colorspace) {
		case v4l2_colorspace.V4L2_COLORSPACE_DEFAULT:
			return "Default";
		case v4l2_colorspace.V4L2_COLORSPACE_SMPTE170M:
			return "SMPTE 170M";
		case v4l2_colorspace.V4L2_COLORSPACE_SMPTE240M:
			return "SMPTE 240M";
		case v4l2_colorspace.V4L2_COLORSPACE_REC709:
			return "Rec. 709";
		case v4l2_colorspace.V4L2_COLORSPACE_BT878:
			return "BT878";
		case v4l2_colorspace.V4L2_COLORSPACE_470_SYSTEM_M:
			return "470 System M";
		case v4l2_colorspace.V4L2_COLORSPACE_470_SYSTEM_BG:
			return "470 System BG";
		case v4l2_colorspace.V4L2_COLORSPACE_JPEG:
			return "JPEG";
		case v4l2_colorspace.V4L2_COLORSPACE_SRGB:
			return "sRGB";
		case v4l2_colorspace.V4L2_COLORSPACE_RAW:
			return "Raw";
		case v4l2_colorspace.V4L2_COLORSPACE_BT2020:
			return "BT2020";
		default:
			return "Unknown";
	}
}

export function transferFunctionToString(xfer_func: number): string {
	switch (xfer_func) {
		case v4l2_xfer_func.V4L2_XFER_FUNC_DEFAULT:
			return "Default";
		case v4l2_xfer_func.V4L2_XFER_FUNC_709:
			return "709";
		case v4l2_xfer_func.V4L2_XFER_FUNC_SRGB:
			return "sRGB";
		case v4l2_xfer_func.V4L2_XFER_FUNC_OPRGB:
			return "opRGB";
		case v4l2_xfer_func.V4L2_XFER_FUNC_SMPTE240M:
			return "SMPTE240M";
		case v4l2_xfer_func.V4L2_XFER_FUNC_NONE:
			return "None";
		case v4l2_xfer_func.V4L2_XFER_FUNC_DCI_P3:
			return "DCI-P3";
		case v4l2_xfer_func.V4L2_XFER_FUNC_SMPTE2084:
			return "SMPTE2084";
		default:
			return "Unknown";
	}
}