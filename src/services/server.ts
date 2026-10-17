import { Service } from "./base.js";
import type { params } from "../generated/index.js";

export class ServerService extends Service {
  ping() { return this.call("ping", {}); }
  stop() { return this.call("server.stop", {}); }
  reloadConfig() { return this.call("server.reload_config", {}); }
  agentManifests() { return this.call("server.agent_manifests", {}); }
  reloadAgentManifests() { return this.call("server.reload_agent_manifests", {}); }
  liveHandoff(p: params.ServerLiveHandoffParams) { return this.call("server.live_handoff", p); }
  sshAgentRegister(p: params.ServerSshAgentRegisterParams) { return this.call("server.ssh_agent.register", p); }
}
