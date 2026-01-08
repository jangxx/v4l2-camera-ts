import fsp from "fs/promises";
import path from "path";

import { Camera } from "./camera";
import { CameraCapabilities, DeviceCapabilities } from "./capabilities";

// const v4l2Prefixes = [ "video", "radio", "vbi", "swradio", "v4l-subdev", "v4l-touch", "media" ];
const v4l2Prefixes = ["video"]; // we only support video devides for now

function isV4L2Device(filename: string) {
	for (const prefix of v4l2Prefixes) {
		if (filename.startsWith(prefix)) {
			return true;
		}
	}

	return false;
}

export interface DeviceListEntry {
	path: string;
	links: string[];
	capabilities: CameraCapabilities;
}

// a partial port of v4l2-ctl's --list-devices functionality
export async function listDevices(
	filter?: Partial<DeviceCapabilities>,
): Promise<DeviceListEntry[]> {
	const devDir = await fsp.readdir("/dev");

	let files = devDir.filter(isV4L2Device).map(filename => path.join("/dev", filename));
	const links = new Map<string, string[]>();
	const delLinks = new Set<string>();

	// Find device nodes which are links to other device nodes
	for (const file of files) {
		let linkTarget: string;

		try {
			linkTarget = await fsp.readlink(file);
		} catch (err) {
			// not a symlink, ignore
			continue;
		}

		const absoluteLinkTarget = path.resolve("/dev", linkTarget);
		const foundIndex = files.indexOf(absoluteLinkTarget);

		if (foundIndex >= 0) {
			if (!links.has(absoluteLinkTarget)) {
				links.set(absoluteLinkTarget, []);
			}

			links.get(absoluteLinkTarget)!.push(file);
			delLinks.add(file);
		}
	}

	// remove all files which are actually links
	files = files.filter(file => !delLinks.has(file));

	const result: DeviceListEntry[] = [];

	checkFiles: for (const file of files) {
		const cam = new Camera();

		try {
			cam.open(file);

			const capabilities = cam.getCapabilities();

			if (filter) {
				// check logical device capabilities if available
				const checkCapabilities = capabilities.currentCapabilities ?? capabilities.allCapabilities;

				for (const cap in filter) {
					if (
						filter[cap as keyof DeviceCapabilities] !==
						checkCapabilities[cap as keyof DeviceCapabilities]
					) {
						continue checkFiles;
					}
				}
			}

			result.push({
				path: file,
				links: links.get(file) ?? [],
				capabilities,
			});
		} catch (err) {
			// not a readable camera, ignore
		} finally {
			if (cam.opened) {
				cam.close();
			}
		}
	}

	return result;
}
