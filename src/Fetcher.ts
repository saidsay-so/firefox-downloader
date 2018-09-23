import { spawnSync } from "child_process";
import decompress from "decompress";
import { copy, createWriteStream, ensureDir, pathExists, remove, stat } from "fs-extra";
import fetch from "node-fetch";
import { join } from "path";

// tslint:disable-next-line:no-var-requires
const TaskClusterContainer = require("get-firefox/lib/taskcluster-container");

const NOTSUPP = new Error("Platform not supported");
const DIRNOEXIST = new Error("Directory doesn't exist");

const PLATFORMS = ["win32", "darwin", "linux"];
const assertPlatform = (platform: NodeJS.Platform | undefined) => {
    if (!platform || !PLATFORMS.includes(platform)) { throw NOTSUPP; }
};

const isDir = async (path: string) => (await pathExists(path)) && (await stat(path)).isDirectory();

export class Fetcher {
    public isDownloaded: boolean;
    private platform: NodeJS.Platform;
    private destination: string;
    private container: any;

    constructor(dest: string, platform?: NodeJS.Platform) {
        this.platform = platform || process.platform;
        assertPlatform(this.platform);

        this.destination = dest;

        this.isDownloaded = false;
        this.container = new TaskClusterContainer({
            fileEnding: this.getPlatformExt(),
            namespace: this.getNamespace(),
        });
    }

    public download(cb?: (progress: number, size: number) => void): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const res = await fetch(await this.container.getFileURL());
            // @ts-ignore
            const fileSize = res.headers.has("content-length") ? parseInt(res.headers.get("content-length"), 10) : 0;

            if (!(await isDir(this.destination))) {
                return reject(DIRNOEXIST);
            }

            const archivePath = join(this.destination, await this.container.getFileName());
            const archiveStream = createWriteStream(archivePath);

            const onData = (d: Buffer) => {
                if (cb) {
                    cb(d.length, fileSize);
                }
            };

            res.body.pipe(archiveStream);
            res.body.on("data", onData);

            const handleFile = async () => {
                if (this.platform !== "darwin") {
                    await decompress(archivePath, this.destination);
                    await remove(archivePath);
                } else if (process.platform === "darwin") {
                    const mountDir = join(this.destination, "DMG");
                    await ensureDir(mountDir);

                    const app = join(mountDir, "Firefox.app");
                    const mountStatus = spawnSync("hdiutil",
                        ["attach", "-quiet", "-mountpoint", mountDir, archivePath]).status;

                    if (mountStatus !== 0) {
                        throw new Error(`Mounting ${archivePath} failed. Status: ${mountStatus}`);
                    }

                    if (await pathExists(app)) {
                        await ensureDir(join(this.destination, "Firefox.app"));
                        await copy(app, join(this.destination, "Firefox.app"));
                    }

                    const unmountStatus = spawnSync("hdiutil",
                        ["detach", "-quiet", mountDir]).status;

                    if (unmountStatus !== 0) {
                        throw new Error(`Unmounting ${mountDir} failed. Status: ${unmountStatus}`);
                    }

                    await remove(mountDir);
                } else {
                    await remove(archivePath);
                    reject(new Error("hdiutil is not available on your platform"));
                }

                this.isDownloaded = true;
                return resolve(this.getPath());
            };

            res.body.on("error", reject);
            res.body.on("end", handleFile);

        });
    }

    public getPath() {
        const dir = this.platform === "darwin" ? join("Firefox.app", "Contents", "MacOS") : "firefox";

        const executable = this.platform === "win32" ? "firefox.exe" : "firefox";
        return join(this.destination, dir, executable);
    }

    private getNamespace() {
        const is64arch = process.arch === "x64";
        if (is64arch) {
            switch (this.platform) {
                case "win32":
                    return "gecko.v2.mozilla-release.nightly.latest.firefox.win64-opt";
                case "darwin":
                    return "gecko.v2.mozilla-release.nightly.latest.firefox.macosx64-opt";
                case "linux":
                    return "gecko.v2.mozilla-release.nightly.latest.firefox.linux64-opt";
            }
        } else {
            switch (this.platform) {
                case "win32":
                    return "gecko.v2.mozilla-release.nightly.latest.firefox.win32-opt";
                case "linux":
                    return "gecko.v2.mozilla-release.nightly.latest.firefox.linux-opt";
            }
        }
    }

    private getPlatformExt() {
        switch (this.platform) {
            case "win32":
                return "target.zip";
            case "darwin":
                return "target.dmg";
            case "linux":
                return "target.tar.bz2";
        }
    }
}
