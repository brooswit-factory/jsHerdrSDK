import { Service } from "./base.js";
import type { params } from "../generated/index.js";

/** Things that affect the attached terminal client, not the fleet. */
export class ClientUiService extends Service {
  setWindowTitle(p: params.ClientWindowTitleSetParams) { return this.call("client.window_title.set", p); }
  clearWindowTitle() { return this.call("client.window_title.clear", {}); }
  notify(p: params.NotificationShowParams) { return this.call("notification.show", p); }
  closePopup() { return this.call("popup.close", {}); }
  setShellSurface(p: params.ClientShellSurfaceSetParams) { return this.call("client_shell.surface.set", p); }
  invokeCommand(p: params.CommandInvokeParams) { return this.call("command.invoke", p); }
  dismissProductAnnouncement(p: params.ProductAnnouncementDismissParams) { return this.call("product_announcement.dismiss", p); }
  dismissReleaseNotes(p: params.ReleaseNotesDismissParams) { return this.call("release_notes.dismiss", p); }
}
