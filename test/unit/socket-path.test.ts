import { describe, expect, test } from "bun:test";
import { configDir, defaultSocketPath, socketEndpoint } from "../../src/transport/socket-path.js";
import { nextId } from "../../src/protocol/id.js";
import { isTimeout, HerdrError } from "../../src/protocol/error.js";

describe("socketEndpoint (the address node:net actually needs)", () => {
  test("win32: prefixed with the named-pipe namespace, byte-for-byte", () => {
    expect(socketEndpoint("C:\\Users\\broos\\herdr-probe\\herdr-probe.sock", "win32")).toBe(
      "\\\\.\\pipe\\C:\\Users\\broos\\herdr-probe\\herdr-probe.sock",
    );
  });
  test("linux/darwin: unchanged", () => {
    expect(socketEndpoint("/h/.config/herdr/herdr.sock", "linux")).toBe("/h/.config/herdr/herdr.sock");
    expect(socketEndpoint("/h/.config/herdr/herdr.sock", "darwin")).toBe("/h/.config/herdr/herdr.sock");
  });
});

describe("configDir (mirrors herdr's config_dir())", () => {
  test("XDG_CONFIG_HOME wins on every platform", () => {
    expect(configDir({ XDG_CONFIG_HOME: "/xdg" }, "linux")).toBe("/xdg/herdr");
    expect(configDir({ XDG_CONFIG_HOME: "/xdg" }, "win32")).toBe("\\xdg\\herdr");
  });
  test("win32: APPDATA, then USERPROFILE\\AppData\\Roaming, then HOME/.config, then temp", () => {
    expect(configDir({ APPDATA: "C:\\Users\\broos\\AppData\\Roaming" }, "win32")).toBe(
      "C:\\Users\\broos\\AppData\\Roaming\\herdr",
    );
    expect(configDir({ USERPROFILE: "C:\\Users\\broos" }, "win32")).toBe(
      "C:\\Users\\broos\\AppData\\Roaming\\herdr",
    );
    expect(configDir({ HOME: "/h" }, "win32")).toBe("\\h\\.config\\herdr");
    expect(configDir({}, "win32")).toContain("herdr");
  });
  test("posix: HOME/.config, else temp", () => {
    expect(configDir({ HOME: "/h" }, "linux")).toBe("/h/.config/herdr");
    expect(configDir({}, "linux")).toContain("herdr");
  });
  test("dev build uses herdr-dev as the app dir", () => {
    expect(configDir({ HOME: "/h" }, "linux", true)).toBe("/h/.config/herdr-dev");
  });
});

describe("defaultSocketPath", () => {
  test("HERDR_SOCKET_PATH (herdr's own published override) wins", () => {
    expect(defaultSocketPath({ HERDR_SOCKET_PATH: "/x.sock" }, "linux")).toBe("/x.sock");
  });
  test("HERDR_SOCKET_PATH wins over the deprecated HERDR_SOCKET fallback", () => {
    expect(defaultSocketPath({ HERDR_SOCKET_PATH: "/new.sock", HERDR_SOCKET: "/old.sock" }, "linux")).toBe("/new.sock");
  });
  test("HERDR_SOCKET is honoured only as a fallback when HERDR_SOCKET_PATH is unset", () => {
    expect(defaultSocketPath({ HERDR_SOCKET: "/old.sock" }, "linux")).toBe("/old.sock");
  });
  test("else herdr's default, rooted at the resolved config dir", () => {
    expect(defaultSocketPath({ HOME: "/h" }, "linux")).toBe("/h/.config/herdr/herdr.sock");
  });
  test("a named session's socket lives under sessions/<name>/", () => {
    expect(defaultSocketPath({ HOME: "/h" }, "linux", { sessionName: "work" })).toBe(
      "/h/.config/herdr/sessions/work/herdr.sock",
    );
  });
  test("dev flag routes through herdr-dev's config dir", () => {
    expect(defaultSocketPath({ HOME: "/h" }, "linux", { dev: true })).toBe("/h/.config/herdr-dev/herdr.sock");
  });
});

describe("small pure bits", () => {
  test("ids are unique", () => { expect(nextId()).not.toBe(nextId()); });
  test("isTimeout", () => { expect(isTimeout(new HerdrError("timeout", "m", "x", { code: "timeout", message: "m" }))).toBe(true); expect(isTimeout(new Error("x"))).toBe(false); });
});
