import { Service } from "./base.js";
import type { params } from "../generated/index.js";

export class PaneService extends Service {
  list(p: params.PaneListParams = {}) { return this.call("pane.list", p); }
  current(p: params.PaneCurrentParams = {}) { return this.call("pane.current", p); }
  get(pane_id: string) { return this.call("pane.get", { pane_id }); }
  read(p: params.PaneReadParams) { return this.call("pane.read", p); }
  focus(pane_id: string) { return this.call("pane.focus", { pane_id }); }
  close(pane_id: string) { return this.call("pane.close", { pane_id }); }
  rename(p: params.PaneRenameParams) { return this.call("pane.rename", p); }
  sendText(p: params.PaneSendTextParams) { return this.call("pane.send_text", p); }
  sendKeys(p: params.PaneSendKeysParams) { return this.call("pane.send_keys", p); }
  sendInput(p: params.PaneSendInputParams) { return this.call("pane.send_input", p); }
  split(p: params.PaneSplitParams) { return this.call("pane.split", p); }
  processInfo(p: params.PaneProcessInfoParams) { return this.call("pane.process_info", p); }
  waitForOutput(p: params.PaneWaitForOutputParams) { return this.call("pane.wait_for_output", p); }
  reportAgent(p: params.PaneReportAgentParams) { return this.call("pane.report_agent", p); }
  reportAgentSession(p: params.PaneReportAgentSessionParams) { return this.call("pane.report_agent_session", p); }
  releaseAgent(p: params.PaneReleaseAgentParams) { return this.call("pane.release_agent", p); }
  swap(p: params.PaneSwapParams) { return this.call("pane.swap", p); }
  move(p: params.PaneMoveParams) { return this.call("pane.move", p); }
  zoom(p: params.PaneZoomParams) { return this.call("pane.zoom", p); }
  layout(p: params.PaneLayoutParams) { return this.call("pane.layout", p); }
  neighbor(p: params.PaneNeighborParams) { return this.call("pane.neighbor", p); }
  edges(p: params.PaneEdgesParams) { return this.call("pane.edges", p); }
  focusDirection(p: params.PaneFocusDirectionParams) { return this.call("pane.focus_direction", p); }
  resize(p: params.PaneResizeParams) { return this.call("pane.resize", p); }
  setInput(p: params.PaneInputSetParams) { return this.call("pane.input.set", p); }
  setGraphics(p: params.PaneGraphicsSetParams) { return this.call("pane.graphics.set", p); }
  clearGraphics(p: params.PaneGraphicsClearParams) { return this.call("pane.graphics.clear", p); }
  graphicsInfo(pane_id: string) { return this.call("pane.graphics.info", { pane_id }); }
  reportMetadata(p: params.PaneReportMetadataParams) { return this.call("pane.report_metadata", p); }
  clearAgentAuthority(p: params.PaneClearAgentAuthorityParams) { return this.call("pane.clear_agent_authority", p); }
  scroll(p: params.PaneScrollParams) { return this.call("pane.scroll", p); }
  editScrollback(pane_id: string) { return this.call("pane.edit_scrollback", { pane_id }); }
  selectionRead(p: params.PaneSelectionReadParams) { return this.call("pane.selection.read", p); }
  copyMotion(p: params.PaneCopyMotionParams) { return this.call("pane.copy_motion", p); }
  copySearch(p: params.PaneCopySearchParams) { return this.call("pane.copy_search", p); }
  linkActivate(p: params.PaneLinkActivateParams) { return this.call("pane.link.activate", p); }
  linkResolve(p: params.PaneLinkActivateParams) { return this.call("pane.link.resolve", p); }
}
