import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { FakeHerdr } from "../fake/fake-herdr.js";
import { HerdrClient, METHODS } from "../../src/index.js";

/**
 * Every service wrapper, called once against the fake, must put ITS method
 * name on the wire. This is the test that catches `this.call("pane.foucs")`.
 * The table below is the ergonomic API surface; a schema method missing from
 * it is caught separately by scripts/parity (coverage of wrappers).
 */
const fake = new FakeHerdr();
let c: HerdrClient;
beforeAll(async () => { await fake.start(); c = new HerdrClient({ socketPath: fake.path, timeoutMs: 500 }); });
afterAll(() => fake.stop());

const P: any = {}; // params are not validated by the fake; shapes are the compiler's job
const T = "w1:p1";
const calls: Array<[string, () => Promise<unknown>]> = [
  ["ping", () => c.server.ping()], ["server.stop", () => c.server.stop()], ["server.reload_config", () => c.server.reloadConfig()],
  ["server.agent_manifests", () => c.server.agentManifests()], ["server.reload_agent_manifests", () => c.server.reloadAgentManifests()], ["server.live_handoff", () => c.server.liveHandoff(P)],
  ["session.snapshot", () => c.session.snapshot()],
  ["agent.list", () => c.agent.list()], ["agent.get", () => c.agent.get(T)], ["agent.explain", () => c.agent.explain(T)], ["agent.read", () => c.agent.read(P)],
  ["agent.send_keys", () => c.agent.sendKeys(P)], ["agent.rename", () => c.agent.rename(P)], ["agent.focus", () => c.agent.focus(T)], ["agent.start", () => c.agent.start(P)],
  ["agent.prompt", () => c.agent.prompt(P)], ["agent.wait", () => c.agent.wait(P)], ["agent.view.set", () => c.agent.setView(P)], ["agent.view.clear", () => c.agent.clearView(P)],
  ["pane.list", () => c.pane.list()], ["pane.current", () => c.pane.current()], ["pane.get", () => c.pane.get(T)], ["pane.read", () => c.pane.read(P)], ["pane.focus", () => c.pane.focus(T)],
  ["pane.close", () => c.pane.close(T)], ["pane.rename", () => c.pane.rename(P)], ["pane.send_text", () => c.pane.sendText(P)], ["pane.send_keys", () => c.pane.sendKeys(P)],
  ["pane.send_input", () => c.pane.sendInput(P)], ["pane.split", () => c.pane.split(P)], ["pane.process_info", () => c.pane.processInfo(P)], ["pane.wait_for_output", () => c.pane.waitForOutput(P)],
  ["pane.report_agent", () => c.pane.reportAgent(P)], ["pane.report_agent_session", () => c.pane.reportAgentSession(P)], ["pane.release_agent", () => c.pane.releaseAgent(P)],
  ["pane.swap", () => c.pane.swap(P)], ["pane.move", () => c.pane.move(P)], ["pane.zoom", () => c.pane.zoom(P)], ["pane.layout", () => c.pane.layout(P)], ["pane.neighbor", () => c.pane.neighbor(P)],
  ["pane.edges", () => c.pane.edges(P)], ["pane.focus_direction", () => c.pane.focusDirection(P)], ["pane.resize", () => c.pane.resize(P)], ["pane.input.set", () => c.pane.setInput(P)],
  ["pane.graphics.set", () => c.pane.setGraphics(P)], ["pane.graphics.clear", () => c.pane.clearGraphics(P)], ["pane.graphics.info", () => c.pane.graphicsInfo(T)],
  ["pane.report_metadata", () => c.pane.reportMetadata(P)], ["pane.clear_agent_authority", () => c.pane.clearAgentAuthority(P)],
  ["pane.scroll", () => c.pane.scroll(P)], ["pane.edit_scrollback", () => c.pane.editScrollback(T)], ["pane.selection.read", () => c.pane.selectionRead(P)],
  ["pane.copy_motion", () => c.pane.copyMotion(P)], ["pane.copy_search", () => c.pane.copySearch(P)],
  ["pane.link.activate", () => c.pane.linkActivate(P)], ["pane.link.resolve", () => c.pane.linkResolve(P)],
  ["workspace.list", () => c.workspace.list()], ["workspace.get", () => c.workspace.get(P)], ["workspace.create", () => c.workspace.create(P)], ["workspace.focus", () => c.workspace.focus(P)],
  ["workspace.rename", () => c.workspace.rename(P)], ["workspace.close", () => c.workspace.close(P)], ["workspace.report_metadata", () => c.workspace.reportMetadata(P)],
  ["workspace.move", () => c.workspace.move(P)], ["workspace.move_block", () => c.workspace.moveBlock(P)],
  ["tab.list", () => c.tab.list()], ["tab.get", () => c.tab.get(P)], ["tab.create", () => c.tab.create(P)], ["tab.focus", () => c.tab.focus(P)], ["tab.rename", () => c.tab.rename(P)],
  ["tab.close", () => c.tab.close(P)], ["tab.move", () => c.tab.move(P)],
  ["worktree.list", () => c.worktree.list()], ["worktree.create", () => c.worktree.create(P)], ["worktree.open", () => c.worktree.open(P)], ["worktree.remove", () => c.worktree.remove(P)],
  ["layout.export", () => c.layout.export(P)], ["layout.apply", () => c.layout.apply(P)], ["layout.set_split_ratio", () => c.layout.setSplitRatio(P)],
  ["plugin.list", () => c.plugin.list()], ["plugin.link", () => c.plugin.link(P)], ["plugin.unlink", () => c.plugin.unlink(P)], ["plugin.enable", () => c.plugin.enable(P)],
  ["plugin.disable", () => c.plugin.disable(P)], ["plugin.action.list", () => c.plugin.actionList(P)], ["plugin.action.invoke", () => c.plugin.actionInvoke(P)],
  ["plugin.log.list", () => c.plugin.logList(P)], ["plugin.pane.open", () => c.plugin.paneOpen(P)], ["plugin.pane.focus", () => c.plugin.paneFocus(P)], ["plugin.pane.close", () => c.plugin.paneClose(P)],
  ["integration.list", () => c.integration.list()], ["integration.install", () => c.integration.install(P)], ["integration.uninstall", () => c.integration.uninstall(P)],
  ["client.window_title.set", () => c.ui.setWindowTitle(P)], ["client.window_title.clear", () => c.ui.clearWindowTitle()], ["notification.show", () => c.ui.notify(P)], ["popup.close", () => c.ui.closePopup()],
  ["client_shell.surface.set", () => c.ui.setShellSurface(P)], ["command.invoke", () => c.ui.invokeCommand(P)],
  ["product_announcement.dismiss", () => c.ui.dismissProductAnnouncement(P)], ["release_notes.dismiss", () => c.ui.dismissReleaseNotes(P)],
  ["events.wait", () => c.events.wait(P)], ["events.subscribe", () => c.events.subscribeAck(P)],
];

describe("every wrapper puts its own method on the wire", () => {
  for (const [method, fn] of calls) {
    test(method, async () => {
      const before = fake.seen.length;
      await fn().catch(() => {}); // the fake answers unknown_method; we only care what was SENT
      expect(fake.seen[before]?.method).toBe(method);
    });
  }
  test("the table covers every schema method exactly once", () => {
    expect([...new Set(calls.map((x) => x[0]))].sort()).toEqual([...METHODS].sort());
    expect(calls.length).toBe(METHODS.length);
  });
});
