import { Service } from "./base.js";
import type { params } from "../generated/index.js";

export class IntegrationService extends Service {
  list() { return this.call("integration.list", {}); }
  install(p: params.IntegrationInstallParams) { return this.call("integration.install", p); }
  uninstall(p: params.IntegrationUninstallParams) { return this.call("integration.uninstall", p); }
}
