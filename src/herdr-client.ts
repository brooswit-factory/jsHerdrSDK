import type { RpcOptions } from "./client/rpc.js";
import { defaultSocketPath, type SocketPathOptions } from "./transport/socket-path.js";
import { Subscription } from "./events/subscription.js";
import type { Subscription as SubscriptionSpec } from "./generated/params.js";
import { AgentService, ClientUiService, EventsService, IntegrationService, LayoutService, PaneService, PluginService, ServerService, SessionService, TabService, WorkspaceService, WorktreeService } from "./services/index.js";
import { rpc } from "./client/rpc.js";
import type { Method } from "./generated/params.js";
import type { ParamsOf, ResultOf } from "./client/typed.js";

export interface HerdrClientOptions {
  socketPath?: string;
  timeoutMs?: number;
  /** Point at a `herdr-dev` debug build's config dir instead of a release build's `herdr`. Ignored when `socketPath` is given. */
  dev?: boolean;
  /** Connect to a named session's socket instead of the default. Ignored when `socketPath` is given. */
  sessionName?: string;
}

/** Entry point. One instance is cheap: it holds options, not a connection. */
export class HerdrClient {
  readonly opts: RpcOptions;
  readonly server: ServerService;
  readonly session: SessionService;
  readonly agent: AgentService;
  readonly pane: PaneService;
  readonly workspace: WorkspaceService;
  readonly tab: TabService;
  readonly worktree: WorktreeService;
  readonly layout: LayoutService;
  readonly plugin: PluginService;
  readonly integration: IntegrationService;
  readonly ui: ClientUiService;
  readonly events: EventsService;

  constructor(o: HerdrClientOptions = {}) {
    const socketOpts: SocketPathOptions = {
      ...(o.dev !== undefined ? { dev: o.dev } : {}),
      ...(o.sessionName !== undefined ? { sessionName: o.sessionName } : {}),
    };
    this.opts = {
      socketPath: o.socketPath ?? defaultSocketPath(process.env, process.platform, socketOpts),
      ...(o.timeoutMs !== undefined ? { timeoutMs: o.timeoutMs } : {}),
    };
    this.server = new ServerService(this.opts);
    this.session = new SessionService(this.opts);
    this.agent = new AgentService(this.opts);
    this.pane = new PaneService(this.opts);
    this.workspace = new WorkspaceService(this.opts);
    this.tab = new TabService(this.opts);
    this.worktree = new WorktreeService(this.opts);
    this.layout = new LayoutService(this.opts);
    this.plugin = new PluginService(this.opts);
    this.integration = new IntegrationService(this.opts);
    this.ui = new ClientUiService(this.opts);
    this.events = new EventsService(this.opts);
  }

  /** Escape hatch: any of the 91 methods, fully typed. */
  call<M extends Method>(method: M, params: ParamsOf<M>): Promise<ResultOf<M>> {
    return rpc(this.opts, method, params);
  }

  /** Long-lived push stream. Iterate it; `close()` when done. */
  subscribe(subscriptions: SubscriptionSpec[]): Promise<Subscription> {
    return Subscription.open(this.opts.socketPath, subscriptions);
  }
}
