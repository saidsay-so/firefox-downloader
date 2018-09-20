import decompress from "decompress";
import { createWriteStream, pathExistsSync, remove, statSync } from "fs-extra";
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

const isDir = (path: string) => pathExistsSync(path) && statSync(path).isDirectory();

export class Fetcher {
    private platform: NodeJS.Platform;
    private destination: string;
    private container: any;

    constructor(dest: string, platform?: NodeJS.Platform) {
        this.platform = platform || process.platform;
        assertPlatform(this.platform);

        this.destination = dest;

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

            if (!isDir(this.destination)) {
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
                // TODO: Code for macOS
                await decompress(archivePath, this.destination);
                await remove(archivePath);

                return resolve(this.getPath());
            };

            res.body.on("end", handleFile);

        });
    }

    public getPath() {
        // TODO: Code for macOS
        const executable = this.platform === "win32" ? "firefox.exe" : "firefox";
        return join(this.destination, "firefox", executable);
    }

    public getNamespace() {
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

    public getPlatformExt() {
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
