import { mkdtemp, pathExistsSync, removeSync } from "fs-extra";
import "jest";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { Fetcher } from "../src/Fetcher";

const mock = <T extends {}, K extends keyof T>(object: T, property: K, value: T[K]) => {
    Object.defineProperty(object, property, { get: () => value });
};
const DIRNOEXIST = new Error("Directory doesn't exist");

describe("Path", () => {

    it("should give the right extension with windows platform", () => {
        const exampleDir = tmpdir();

        const windowsFectcher = new Fetcher(exampleDir, "win32");
        expect(windowsFectcher.getPath()).toBe(join(exampleDir, "firefox", "firefox.exe"));
    });

    it("should give no extension with other platforms", () => {
        const exampleDir = tmpdir();

        const linuxFectcher = new Fetcher(exampleDir, "linux");
        expect(linuxFectcher.getPath()).toBe(join(exampleDir, "firefox", "firefox"));

        const macosxFectcher = new Fetcher(exampleDir, "darwin");
        expect(macosxFectcher.getPath()).toBe(join(exampleDir, "firefox", "firefox"));
    });

    // TODO: Code for macOS
    it("should give right extension according to your platform", () => {
        const exampleDir = tmpdir();
        const exe = process.platform === "win32" ? "firefox.exe" : "firefox";

        const fetcher = new Fetcher(exampleDir);
        expect(fetcher.getPath()).toBe(join(exampleDir, "firefox", exe));
    });

});

describe("Platform", () => {
    beforeAll(() => mock(process, "arch", "x32"));

    it("should throw because (aix) platform is not supported", () => {
        expect(() => new Fetcher("", "aix")).toThrowError("Platform not supported");
    });

    it("should give x32 windows namespace", () => {
        expect(new Fetcher("", "win32").getNamespace())
        .toBe("gecko.v2.mozilla-release.nightly.latest.firefox.win32-opt");
    });

    // TODO: Code for macOS

    it("should give x32 linux namespace", () => {
        expect(new Fetcher("", "linux").getNamespace())
        .toBe("gecko.v2.mozilla-release.nightly.latest.firefox.linux-opt");
    });

    afterAll(() => mock(process, "arch", "x64"));
});

describe("Download", () => {

    it("should download and extract for windows platform", () => {
        jest.setTimeout(10e7);
        return mkdtemp(join(tmpdir(), "fetcher-"))
            .then((dir) => new Fetcher(dir, "win32").download())
            .then((path) => expect(pathExistsSync(path)).toBeTruthy() && removeSync(dirname(path)));
    });

    // TODO: Code for macOS

    it("should download and extract for linux platform", () => {
        jest.setTimeout(10e7);
        return mkdtemp(join(tmpdir(), "fetcher-"))
            .then((dir) => new Fetcher(dir, "linux").download())
            .then((path) => expect(pathExistsSync(path)).toBeTruthy() && removeSync(dirname(path)));

    });

    it("should reject because directory doesn't exist", () => {
        const dir = "/doesntexist";
        expect(new Fetcher(dir).download()).rejects.toEqual(DIRNOEXIST);

    });
});
