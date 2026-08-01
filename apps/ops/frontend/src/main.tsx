import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Cloud,
  Compass,
  Cpu,
  Gauge,
  Globe2,
  Home,
  Layers3,
  LockKeyhole,
  Monitor,
  RadioTower,
  RefreshCw,
  Router,
  Save,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Wifi,
  Wrench,
  XCircle
} from "lucide-react";
import "./styles.css";

type Status = "ok" | "warn" | "bad" | "unknown" | string;
type View = "status" | "topology" | "services" | "routing";

type Rate = {
  up_mbps?: number;
  down_mbps?: number;
};

type Insight = {
  level?: Status;
  title?: string;
  text?: string;
};

type Device = Rate & {
  ip?: string;
  mac?: string;
  name?: string;
  host?: string;
};

type RouteSummary = Rate & {
  chain?: string;
  connections?: number;
  rules?: string[];
};

type HomeService = {
  key?: string;
  name?: string;
  kind?: string;
  role?: string;
  href?: string;
  local_href?: string;
  status?: Status;
  latency_ms?: number;
  detail?: string;
  ports?: PortEntry[];
};

type PortEntry = {
  host?: string;
  port?: string;
  proto?: string;
  service?: string;
  owner?: string;
  scope?: string;
  note?: string;
};

type Ingress = {
  key?: string;
  name?: string;
  kind?: string;
  href?: string;
  target?: string;
  status?: Status;
  detail?: string;
};

type HealthCheck = {
  status?: Status;
  title?: string;
  detail?: string;
};

type PresenceAp = {
  clients?: string[];
  remote_addr?: string;
  updated_at?: number;
  age_seconds?: number | null;
};

type Presence = {
  ok?: boolean;
  seen_all?: boolean;
  expected_aps?: string[];
  fresh_aps?: string[];
  merged_clients?: string[];
  aps?: Record<string, PresenceAp>;
  last_ha_push?: { clients?: string[]; count?: number; updated_at?: number; fresh_aps?: string[] };
  updated_at?: number;
  age_seconds?: number | null;
  error?: string;
};

type RemoteClient = {
  name?: string;
  enabled?: boolean;
  ipv4_address?: string;
  ipv6_address?: string;
  endpoint_scope?: string;
  has_endpoint?: boolean;
  latest_handshake?: string;
  latest_handshake_seconds?: number | null;
  last_seen_at?: number | null;
  age_seconds?: number | null;
  status?: Status;
  transfer?: string;
};

type RemoteAccess = {
  ok?: boolean;
  clients?: RemoteClient[];
  updated_at?: number;
  active_after_seconds?: number;
  stale_after_seconds?: number;
  error?: string;
};

type OpsNetwork = {
  ok?: boolean;
  ssid?: string;
  iface?: string;
  network?: string;
  gateway?: string;
  netmask?: string;
  dhcp_range?: string;
  dns?: string;
  proxy_bypassed?: boolean;
  clients?: Array<{ mac?: string; ip?: string; name?: string }>;
  checks?: HealthCheck[];
  updated_at?: number;
  error?: string;
};

type WifiDiagnostics = {
  ok?: boolean;
  radio1?: { up?: boolean; retry_setup_failed?: boolean; disabled?: boolean; ssids?: string[] };
  room_reachable?: boolean;
  backhaul_assoc_count?: number;
  backhaul_assoc_sample?: string;
  guard?: string;
  checks?: HealthCheck[];
  updated_at?: number;
  error?: string;
};

type IncidentDomain = {
  id?: string;
  title?: string;
  status?: Status;
  detail?: string;
  evidence?: string;
  next_action?: string;
  commands?: string[];
};

type IncidentDecisionStep = {
  id?: string;
  order?: number;
  domain?: string;
  status?: Status;
  question?: string;
  why_first?: string;
  if_bad?: string[];
  entries?: string[];
};

type IncidentRecoveryRow = {
  symptom?: string;
  start_domain?: string;
  status?: Status;
  first_probe?: string;
  then_probe?: string;
  likely_owner?: string;
  do_not_start_with?: string;
};

type Incident = {
  ok?: boolean;
  severity?: Status;
  headline?: string;
  summary?: string;
  domains?: IncidentDomain[];
  decision_flow?: IncidentDecisionStep[];
  recovery_matrix?: IncidentRecoveryRow[];
  runbook?: string[];
  updated_at?: number;
};

type InstanceState = {
  ok?: boolean;
  site?: { name?: string; display_name?: string; domain?: string; locale?: string };
  networks?: Record<string, { cidr?: string; gateway?: string; purpose?: string; dns_mode?: string; proxy_mode?: string }>;
  wifi?: Record<string, { ssid?: string; network?: string; band?: string; purpose?: string; broadcast_by?: string[] }>;
  devices?: Array<{ id?: string; name?: string; role?: string; network?: string; ip?: string; hostnames?: string[]; expected?: boolean }>;
  services?: Array<{ id?: string; name?: string; category?: string; role?: string; host?: string; runtime?: string; owner?: string }>;
  updated_at?: number;
};

type ModulePlan = {
  id?: string;
  title?: string;
  placement?: string;
  inputs?: string[];
  outputs?: string[];
  checks?: string[];
  rollback?: string[];
};

type HomeNetPlan = {
  ok?: boolean;
  schema?: string;
  profile?: string;
  modules?: ModulePlan[];
  apply?: { read_only?: boolean; status?: string; message?: string };
  error?: string;
  updated_at?: number;
};

type BlueprintCapability = {
  id?: string;
  title?: string;
  status?: Status;
  required?: boolean;
  placement?: string;
  fallback?: string;
};

type Blueprint = {
  ok?: boolean;
  schema?: string;
  profile?: string;
  position?: string;
  problem?: string[];
  provides?: string[];
  non_goals?: string[];
  operational_questions?: Array<{ question?: string; surface?: string }>;
  active_capabilities?: BlueprintCapability[];
  service_summary?: { total?: number; by_category?: Record<string, number> };
  source_of_truth?: Array<{ area?: string; owner?: string }>;
  updated_at?: number;
};

type RoutingRule = {
  id?: string;
  scope?: "temporary" | "permanent" | string;
  policy?: string;
  kind?: string;
  value?: string;
  rule?: string;
  duration?: string;
  created_at?: number;
  expires_at?: number | null;
};

type RoutingPermanentCandidate = {
  id?: string;
  status?: string;
  policy?: string;
  value?: string;
  rule?: string;
};

type RoutingRulesState = {
  ok?: boolean;
  policies?: Array<{ id: string; label: string }>;
  durations?: string[];
  entries?: RoutingRule[];
  permanent_candidates?: RoutingPermanentCandidate[];
  error?: string;
};

type State = {
  ok?: boolean;
  updated_at?: number;
  errors?: string[];
  wan?: Rate;
  mihomo?: Rate;
  devices?: Device[];
  domains?: Array<Rate & { host?: string; domain?: string; rule?: string; chain?: string }>;
  dns_queries?: Array<{ host?: string; name?: string; ip?: string; age_seconds?: number; type?: string }>;
  dns_top_devices?: Array<{ device?: string; count?: number }>;
  dns_top_hosts?: Array<{ host?: string; count?: number; devices?: string[] }>;
  route_summary?: RouteSummary[];
  connections?: Array<Rate & { host?: string; source_ip?: string; source_name?: string; rule?: string; chain?: string }>;
  insights?: Insight[];
  health?: { updated_at?: number; checks?: HealthCheck[] };
  history?: Array<{ time?: number; wan_down?: number; wan_up?: number; mihomo_down?: number; mihomo_up?: number; device_count?: number; dns_count_5m?: number }>;
  home_services?: HomeService[];
  ingress?: Ingress[];
  ports?: PortEntry[];
  presence?: Presence;
  remote_access?: RemoteAccess;
  ops_network?: OpsNetwork;
  wifi_diagnostics?: WifiDiagnostics;
  incident?: Incident;
  instance?: InstanceState;
  plan?: HomeNetPlan;
  blueprint?: Blueprint;
};

const emptyState: State = {
  ok: false,
  updated_at: 0,
  errors: [],
  wan: {},
  mihomo: {},
  devices: [],
  domains: [],
  dns_queries: [],
  dns_top_devices: [],
  route_summary: [],
  insights: [],
  health: { checks: [] },
  history: [],
  home_services: [],
  ingress: [],
  ports: [],
  presence: { merged_clients: [], fresh_aps: [], aps: {} },
  remote_access: { clients: [] },
  ops_network: { checks: [], clients: [] },
  wifi_diagnostics: { checks: [] },
  incident: { domains: [], decision_flow: [], recovery_matrix: [], runbook: [] },
  instance: { networks: {}, wifi: {}, devices: [], services: [] },
  plan: { modules: [] },
  blueprint: { active_capabilities: [], operational_questions: [], source_of_truth: [] }
};

const viewLabels: Array<{ id: View; label: string; icon: React.ReactNode }> = [
  { id: "status", label: "状态", icon: <Compass size={16} /> },
  { id: "topology", label: "拓扑", icon: <RadioTower size={16} /> },
  { id: "routing", label: "分流", icon: <Globe2 size={16} /> },
  { id: "services", label: "服务", icon: <Layers3 size={16} /> }
];

function number(value?: number, digits = 2) {
  return Number(value || 0).toFixed(digits);
}

function relativeTime(ts?: number) {
  if (!ts) return "waiting";
  const seconds = Math.max(0, Math.round(Date.now() / 1000 - ts));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

function personLabel(id?: string) {
  const labels: Record<string, string> = {
    budongdiding: "不动地丁",
    fei: "邻居发言"
  };
  return labels[id || ""] || id || "unknown";
}

function ageLabel(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return "waiting";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

function remoteStatusLabel(client: RemoteClient) {
  const scope = client.endpoint_scope === "outside" ? "外网" : client.endpoint_scope === "lan" ? "局域网" : "未知来源";
  if (client.status === "active") return `${scope} · 正在连接`;
  if (client.status === "recent") return `${scope} · 最近连接`;
  if (client.status === "stale") return `${scope} · 很久前`;
  return client.has_endpoint ? `${scope} · 无近期握手` : "未连接";
}

function statusClass(status?: Status) {
  if (status === "ok") return "ok";
  if (status === "warn") return "warn";
  if (status === "bad" || status === "down") return "bad";
  if (status === "tracked") return "tracked";
  return "unknown";
}

function statusIcon(status?: Status) {
  const cls = statusClass(status);
  if (cls === "ok") return <CheckCircle2 size={16} />;
  if (cls === "bad") return <XCircle size={16} />;
  if (cls === "warn") return <AlertTriangle size={16} />;
  return <Activity size={16} />;
}

function serviceLinks(service: HomeService | Ingress) {
  const links: Array<{ label: string; href: string }> = [];
  if (service.href) links.push({ label: "外部", href: service.href });
  if ("local_href" in service && service.local_href && service.local_href !== service.href) {
    links.push({ label: "局域网", href: service.local_href });
  }
  if (service.key === "wrt-room-luci") links.push({ label: "房间侧", href: "http://192.168.50.1/" });
  return links;
}

function serviceDescription(service: HomeService | Ingress) {
  const homeService = service as HomeService;
  const ingress = service as Ingress;
  return homeService.role || ingress.target || service.kind || "";
}

function serviceGroups(services: HomeService[]) {
  return services.reduce<Record<string, HomeService[]>>((groups, service) => {
    const key = service.kind || "other";
    groups[key] = groups[key] || [];
    groups[key].push(service);
    return groups;
  }, {});
}

function groupLabel(kind: string) {
  const labels: Record<string, string> = {
    "control-core": "HomeNet",
    "network-core": "Network",
    "home-core": "Home",
    "remote-entry": "Access",
    "system-task": "System",
    "udp-entry": "UDP",
    storage: "Files",
    other: "Other"
  };
  return labels[kind] || kind;
}

function statusSummary(items: Array<{ status?: Status }>) {
  const ok = items.filter((item) => statusClass(item.status) === "ok").length;
  const bad = items.filter((item) => statusClass(item.status) === "bad").length;
  const warn = items.filter((item) => statusClass(item.status) === "warn").length;
  const tracked = items.filter((item) => statusClass(item.status) === "tracked").length;
  return { ok, bad, warn, tracked, total: ok + bad + warn };
}

function shortStatus(status?: Status) {
  const cls = statusClass(status);
  if (cls === "ok") return "正常";
  if (cls === "bad") return "异常";
  if (cls === "warn") return "注意";
  if (cls === "tracked") return "已记录";
  return "等待";
}

function firstAction(state: State, ops: OpsModel) {
  const domains = state.incident?.domains || [];
  const badDomain = domains.find((domain) => statusClass(domain.status) === "bad");
  const warnDomain = domains.find((domain) => statusClass(domain.status) === "warn");
  const domain = badDomain || warnDomain;
  if (domain?.next_action) return domain.next_action;
  if (ops.badServices.length) return `先检查 ${ops.badServices[0].name || ops.badServices[0].key}`;
  if (ops.badHealth.length) return ops.badHealth[0].detail || ops.badHealth[0].title || "检查健康项";
  if (!ops.opsNetwork.ok) return "检修 Wi-Fi 需要确认";
  return "无需处理";
}

function useOpsModel(state: State, query: string) {
  return useMemo(() => {
    const services = state.home_services || [];
    const ingress = state.ingress || [];
    const serviceStats = statusSummary([...services, ...ingress]);
    const badServices = services.filter((service) => statusClass(service.status) === "bad");
    const presence = state.presence || {};
    const remoteAccess = state.remote_access || {};
    const opsNetwork = state.ops_network || {};
    const remoteClients = (remoteAccess.clients || []).filter((client) => client.enabled !== false && client.status !== "idle");
    const activeRemoteClients = remoteClients.filter((client) => client.endpoint_scope === "outside" && (client.status === "active" || client.status === "recent"));
    const activeDevices = (state.devices || []).filter((device) => (device.up_mbps || 0) + (device.down_mbps || 0) > 0.01);
    const serviceHosts = Array.from(new Map(
      services
        .flatMap((service) => (service.ports || []).map((port) => ({
          host: port.host || "unknown",
          owner: port.owner || service.name || service.key || "service",
          service: port.service || service.name || service.key || "service"
        })))
        .filter((item) => item.host !== "unknown")
        .map((item) => [item.host, item])
    ).values());
    const badHealth = (state.health?.checks || []).filter((check) => statusClass(check.status) !== "ok");
    const q = query.trim().toLowerCase();
    const visibleServices = q
      ? services.filter((service) => `${service.name} ${service.kind} ${service.role} ${service.href} ${service.local_href}`.toLowerCase().includes(q))
      : services;

    const issues = [
      ...badServices.slice(0, 4).map((service) => ({
        title: service.name || service.key || "Service",
        detail: service.detail || service.role || "service check failed",
        status: service.status || "bad"
      })),
      ...badHealth.slice(0, 4).map((check) => ({
        title: check.title || "Health check",
        detail: check.detail || "",
        status: check.status || "warn"
      }))
    ].slice(0, 6);
    const allGood = state.ok && !issues.length && (opsNetwork.ok !== false);

    return {
      services,
      ingress,
      visibleServices,
      badServices,
      badHealth,
      issues,
      allGood,
      activeDevices,
      serviceHosts,
      topRoute: (state.route_summary || [])[0],
      serviceStats,
      presence,
      remoteAccess,
      opsNetwork,
      homeClients: presence.merged_clients || [],
      remoteClients,
      activeRemoteClients,
      hasDevices: (state.devices || []).length > 0,
      hasRoutes: (state.route_summary || []).length > 0,
      hasDomains: (state.domains || []).length > 0,
      hasDnsHotspots: (state.dns_top_devices || []).length > 0
    };
  }, [query, state]);
}

type OpsModel = ReturnType<typeof useOpsModel>;

function App() {
  const [state, setState] = useState<State>(emptyState);
  const [view, setView] = useState<View>("status");
  const [query, setQuery] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let closed = false;
    let events: EventSource | null = null;

    const refreshHealth = async () => {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!closed) {
          setState((current) => ({
            ...current,
            health: { updated_at: data.updated_at, checks: data.checks || [] },
            errors: data.errors || current.errors
          }));
        }
      } catch {
        // The live sampler still owns the main connection state.
      }
    };

    const loadOnce = async () => {
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!closed) {
          setState({ ...emptyState, ...data });
          setConnected(true);
        }
      } catch {
        if (!closed) setConnected(false);
      }
    };

    loadOnce();
    refreshHealth();
    try {
      events = new EventSource("/events");
      events.onmessage = (event) => {
        setState({ ...emptyState, ...JSON.parse(event.data) });
        setConnected(true);
      };
      events.onerror = () => {
        setConnected(false);
        events?.close();
        events = null;
      };
    } catch {
      setConnected(false);
    }

    const timer = window.setInterval(() => {
      if (!events) loadOnce();
    }, 3500);

    return () => {
      closed = true;
      window.clearInterval(timer);
      events?.close();
    };
  }, []);

  const ops = useOpsModel(state, query);

  return (
    <main className="appShell">
      <header className="topbar">
        <div className="brand">
          <span><Home size={22} /></span>
          <div>
            <h1>HomeNet</h1>
            <p>家庭网络入口</p>
          </div>
        </div>
        <div className={`livePill ${connected ? "ok" : "bad"}`}>
          <span />
          {connected ? "Live" : "Reconnecting"}
        </div>
      </header>

      <nav className="segmented" aria-label="HomeNet views">
        {viewLabels.map((item) => (
          <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => setView(item.id)}>
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {view === "status" && (
        <OverviewView state={state} ops={ops} />
      )}

      {view === "topology" && (
        <section className="topologyView">
          <div className="sectionHeader">
            <div>
              <h2>家庭网络拓扑</h2>
              <p>按真实使用场景看路径：日常上网、卧室覆盖、外部回家、检修通道。</p>
            </div>
          </div>
          <Topology state={state} />
        </section>
      )}

      {view === "services" && (
        <ServicesView ops={ops} query={query} onQueryChange={setQuery} />
      )}

      {view === "routing" && (
        <RoutingView />
      )}
    </main>
  );
}

function OverviewView({ state, ops }: { state: State; ops: OpsModel }) {
  const primaryServices = ["homenet-ops", "openwrt-luci", "wrt-room-luci", "mihomo", "adguard", "uptime-kuma", "home-assistant"]
    .map((key) => ops.services.find((service) => service.key === key))
    .filter(Boolean) as HomeService[];
  const issueCount = ops.issues.length + (state.errors || []).length;
  const overall = ops.allGood ? "正常" : issueCount ? "需要处理" : "需要确认";

  return (
    <section className="simpleBoard">
      <Panel title="现在" icon={<Sparkles size={18} />}>
        <div className={`bigVerdict ${ops.allGood ? "ok" : "warn"}`}>
          {ops.allGood ? <CheckCircle2 size={30} /> : <AlertTriangle size={30} />}
          <div>
            <span>{overall}</span>
            <b>{state.incident?.headline || "家庭网络状态"}</b>
            <p>{firstAction(state, ops)}</p>
          </div>
        </div>
        <div className="plainChecks">
          <PlainCheck label="主路由/WAN" status={state.incident?.domains?.find((item) => item.id === "gateway")?.status || (state.ok ? "ok" : "warn")} detail={`${number(state.wan?.down_mbps)} Mbps down`} />
          <PlainCheck label="Wi-Fi/卧室" status={state.incident?.domains?.find((item) => item.id === "room-ap")?.status || (state.wifi_diagnostics?.ok ? "ok" : "warn")} detail={state.wifi_diagnostics?.room_reachable ? "卧室 WRT 可达" : "等待卧室 WRT"} />
          <PlainCheck label="DNS/代理" status={state.incident?.domains?.find((item) => item.id === "dns-proxy")?.status || "unknown"} detail={ops.topRoute?.chain || "当前无明显代理流量"} />
          <PlainCheck label="Pi 服务" status={state.incident?.domains?.find((item) => item.id === "pi-services")?.status || (ops.badServices.length ? "warn" : "ok")} detail={`${ops.serviceStats.ok}/${ops.serviceStats.total || 0} 正常`} />
          <PlainCheck label="外部回家" status={state.incident?.domains?.find((item) => item.id === "remote-access")?.status || (ops.remoteAccess.ok ? "ok" : "warn")} detail={`${ops.activeRemoteClients.length} 台外部设备`} />
          <PlainCheck label="检修通道" status={state.incident?.domains?.find((item) => item.id === "rescue")?.status || (ops.opsNetwork.ok ? "ok" : "warn")} detail={ops.opsNetwork.ssid || "Maintenance Wi-Fi"} />
        </div>
      </Panel>

      <Panel title="要处理的事" icon={<AlertTriangle size={18} />}>
        <div className="simpleList">
          {ops.issues.slice(0, 4).map((item, index) => <SimpleIssue item={item} key={`${item.title}-${index}`} />)}
          {!ops.issues.length && <EmptyLine text="当前没有明显异常。" />}
        </div>
      </Panel>

      <Panel title="常用入口" icon={<Home size={18} />}>
        <div className="entryList">
          {primaryServices.map((service) => <ServiceRow key={service.key || service.name} service={service} compact />)}
        </div>
      </Panel>
    </section>
  );
}

function IncidentPanel({ state }: { state: State }) {
  const incident = state.incident || {};
  const domains = incident.domains || [];
  const steps = incident.decision_flow || [];
  const firstBad = domains.find((domain) => statusClass(domain.status) === "bad") || domains.find((domain) => statusClass(domain.status) === "warn") || domains[0];
  const activeStep = steps.find((step) => ["bad", "warn"].includes(statusClass(step.status))) || steps[0];

  return (
    <Panel title="排障顺序" icon={<Wrench size={18} />}>
      <div className={`verdict ${statusClass(incident.severity) === "ok" ? "ok" : "warn"}`}>
        {statusClass(incident.severity) === "ok" ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
        <span>
          <b>{incident.headline || "等待诊断"}</b>
          <p>{firstBad?.next_action || activeStep?.question || incident.summary || "正在采样关键链路。"}</p>
        </span>
      </div>
      <div className="simpleList">
        {domains.slice(0, 8).map((domain) => <SimpleDomain domain={domain} key={domain.id || domain.title} />)}
        {!domains.length && <EmptyLine text="等待 HomeNet 采样。"/>}
      </div>
    </Panel>
  );
}

function PlainCheck({ label, status, detail }: { label: string; status?: Status; detail: string }) {
  return (
    <article className={statusClass(status)}>
      {statusIcon(status)}
      <span>{label}</span>
      <b>{shortStatus(status)}</b>
      <p>{detail}</p>
    </article>
  );
}

function SimpleIssue({ item }: { item: { title?: string; detail?: string; status?: Status } }) {
  return (
    <article className={statusClass(item.status)}>
      {statusIcon(item.status)}
      <span>
        <b>{item.title || "需要确认"}</b>
        <p>{item.detail || "没有详细信息"}</p>
      </span>
    </article>
  );
}

function SimpleDomain({ domain }: { domain: IncidentDomain }) {
  return (
    <article className={statusClass(domain.status)}>
      {statusIcon(domain.status)}
      <span>
        <b>{domain.title}</b>
        <p>{domain.next_action || domain.detail || domain.evidence || shortStatus(domain.status)}</p>
      </span>
    </article>
  );
}

function BlueprintPanel({ state }: { state: State }) {
  const blueprint = state.blueprint || {};
  const capabilities = blueprint.active_capabilities || [];
  const required = capabilities.filter((item) => item.required).length;
  const fallback = capabilities.filter((item) => item.status === "fallback").length;
  const questions = blueprint.operational_questions || [];
  const owners = blueprint.source_of_truth || [];

  return (
    <Panel title="Blueprint" icon={<Compass size={18} />} description={blueprint.position || "HomeNet product and instance contract."}>
      <div className="briefGrid compact">
        <Metric label="Profile" value={blueprint.profile || state.plan?.profile || "profile"} icon={<Layers3 size={18} />} />
        <Metric label="Capabilities" value={`${capabilities.length}`} tone={fallback ? "warn" : "ok"} icon={<Sparkles size={18} />} />
        <Metric label="Required" value={`${required}`} icon={<ShieldCheck size={18} />} />
        <Metric label="Fallback" value={`${fallback}`} tone={fallback ? "warn" : "ok"} icon={<Wrench size={18} />} />
      </div>
      <div className="blueprintQuestions">
        {questions.slice(0, 5).map((item) => (
          <article key={item.question}>
            <b>{item.question}</b>
            <span>{item.surface}</span>
          </article>
        ))}
      </div>
      <div className="ownershipStrip">
        {owners.slice(0, 6).map((item) => (
          <span key={`${item.area}-${item.owner}`}>{item.area}: {item.owner}</span>
        ))}
      </div>
    </Panel>
  );
}

function ServicesView({ ops, query, onQueryChange }: { ops: OpsModel; query: string; onQueryChange: (value: string) => void }) {
  return (
    <section className="servicesView">
      <div className="sectionHeader">
        <div>
          <h2>Services</h2>
          <p>Service Directory 按职责分组；服务可以运行在 Pi、OpenWrt、Mac 或其他 LAN host 上。</p>
        </div>
        <label className="searchBox">
          <Search size={16} />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Filter services" />
        </label>
      </div>
      {!!ops.serviceHosts.length && (
        <section className="hostStrip" aria-label="Service hosts">
          {ops.serviceHosts.slice(0, 8).map((host) => (
            <article key={host.host}>
              <b>{host.host}</b>
              <span>{host.owner}</span>
            </article>
          ))}
        </section>
      )}
      {Object.entries(serviceGroups(ops.visibleServices)).map(([kind, items]) => (
        <section className="serviceGroup" key={kind}>
          <h3>{groupLabel(kind)}</h3>
          <div className="serviceGrid">
            {items.map((service) => <ServiceCard key={service.key || service.name} service={service} />)}
          </div>
        </section>
      ))}
      {!ops.visibleServices.length && <EmptyBlock title="No services" text="没有匹配的服务。" />}
    </section>
  );
}

function RoutingView() {
  const [rules, setRules] = useState<RoutingRulesState>({ entries: [] });
  const [target, setTarget] = useState("");
  const [policy, setPolicy] = useState("PROXY");
  const [duration, setDuration] = useState("1h");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadRules = async () => {
    const response = await fetch("/api/routing-rules", { cache: "no-store" });
    const data = await response.json();
    setRules(data);
  };

  useEffect(() => {
    loadRules().catch(() => setRules({ entries: [], error: "无法读取分流规则。" }));
  }, []);

  const submitRule = async (permanent: boolean) => {
    if (permanent && !window.confirm(`确认把 ${target.trim()} 加入永久规则？\n\n永久规则会进入待提交队列，不会立刻改变当前流量。`)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/routing-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, policy, duration, permanent })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || data.detail || `HTTP ${response.status}`);
      setTarget("");
      setRules({ ...rules, entries: data.entries || [], permanent_candidates: data.permanent_candidates || rules.permanent_candidates || [] });
      setMessage(permanent ? "已加入永久待提交，当前流量未改变。" : "临时规则已生效。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败。");
    } finally {
      setBusy(false);
    }
  };

  const deleteRule = async (id?: string) => {
    if (!id) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/routing-rules/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || data.detail || `HTTP ${response.status}`);
      setRules({ ...rules, entries: data.entries || [], permanent_candidates: data.permanent_candidates || rules.permanent_candidates || [] });
      setMessage("已删除。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败。");
    } finally {
      setBusy(false);
    }
  };

  const promoteRule = async (id?: string) => {
    if (!id) return;
    if (!window.confirm("确认转为永久？\n\n临时规则会继续保留，永久规则会进入待提交队列。")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/routing-rules/${encodeURIComponent(id)}/promote`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || data.detail || `HTTP ${response.status}`);
      setRules({ ...rules, entries: data.entries || [], permanent_candidates: data.permanent_candidates || rules.permanent_candidates || [] });
      setMessage("已加入永久待提交，临时规则保持不变。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "转永久失败。");
    } finally {
      setBusy(false);
    }
  };

  const deletePermanent = async (id?: string) => {
    if (!id) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/routing-permanent/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      setRules({ ...rules, entries: data.entries || [], permanent_candidates: data.permanent_candidates || [] });
      setMessage("已移除永久待提交。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败。");
    } finally {
      setBusy(false);
    }
  };

  const entries = rules.entries || [];
  const tempEntries = entries;
  const permanentCandidates = rules.permanent_candidates || [];

  return (
    <section className="routingView">
      <div className="sectionHeader">
        <div>
          <h2>临时分流</h2>
          <p>把某个网站切到指定出口。临时规则立即生效；永久规则会先进入待提交队列。</p>
        </div>
      </div>

      <Panel title="添加规则" icon={<Globe2 size={18} />} description="粘贴完整网址或域名即可，系统会自动提取主域名。">
        <div className="routingForm">
          <label>
            <span>网站</span>
            <input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="example.com 或 https://example.com/page" />
          </label>
          <label>
            <span>出口</span>
            <select value={policy} onChange={(event) => setPolicy(event.target.value)}>
              {(rules.policies || [
                { id: "PROXY", label: "PROXY" },
                { id: "PROXY-JAPAN", label: "PROXY-JAPAN" },
                { id: "DIRECT", label: "DIRECT" }
              ]).map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>
            <span>有效期</span>
            <select value={duration} onChange={(event) => setDuration(event.target.value)}>
              <option value="1h">1 小时</option>
              <option value="today">今天</option>
              <option value="7d">7 天</option>
              <option value="forever">直到删除</option>
            </select>
          </label>
          <div className="routingActions">
            <button disabled={busy || !target.trim()} onClick={() => submitRule(false)}><RefreshCw size={16} />临时生效</button>
            <button disabled={busy || !target.trim()} onClick={() => submitRule(true)}><Save size={16} />永久</button>
          </div>
        </div>
        {!!message && <p className="formMessage">{message}</p>}
      </Panel>

      <div className="routingColumns">
        <RoutingRuleList title="临时生效" entries={tempEntries} onDelete={deleteRule} onPromote={promoteRule} />
        <RoutingPermanentList entries={permanentCandidates} onDelete={deletePermanent} />
      </div>
    </section>
  );
}

function RoutingRuleList({ title, entries, onDelete, onPromote }: { title: string; entries: RoutingRule[]; onDelete: (id?: string) => void; onPromote?: (id?: string) => void }) {
  return (
    <Panel title={title} icon={<Layers3 size={18} />}>
      <div className="routingList">
        {entries.map((item) => (
          <article key={item.id || item.value}>
            <span>
              <b>{item.value}</b>
              <p>{item.policy} · {item.rule}</p>
              <em>{item.expires_at ? `到期 ${relativeTime(item.expires_at).replace("ago", "后")}` : "直到删除"}</em>
            </span>
            <div>
              {onPromote && <button onClick={() => onPromote(item.id)} title="转永久"><Save size={15} /></button>}
              <button onClick={() => onDelete(item.id)} title="删除"><Trash2 size={15} /></button>
            </div>
          </article>
        ))}
        {!entries.length && <EmptyLine text="暂无规则。" />}
      </div>
    </Panel>
  );
}

function RoutingPermanentList({ entries, onDelete }: { entries: RoutingPermanentCandidate[]; onDelete: (id?: string) => void }) {
  return (
    <Panel title="永久待提交" icon={<Save size={18} />}>
      <div className="routingList">
        {entries.map((item) => (
          <article key={item.id || `${item.policy}-${item.value}`}>
            <span>
              <b>{item.value}</b>
              <p>{item.policy} · {item.rule}</p>
              <em>等待确认提交</em>
            </span>
            <div>
              <button onClick={() => onDelete(item.id)} title="删除"><Trash2 size={15} /></button>
            </div>
          </article>
        ))}
        {!entries.length && <EmptyLine text="暂无永久待提交。" />}
      </div>
    </Panel>
  );
}

function NetworkView({ state, ops }: { state: State; ops: OpsModel }) {
  return (
    <section className="networkGrid">
      {ops.hasDevices && (
        <Panel title="Devices" icon={<Monitor size={18} />} description="当前有明显流量的 LAN clients；名称来自 OpenWrt DHCP leases 和 neighbor table。">
          <DataTable
            rows={(state.devices || []).slice(0, 14).map((device) => [
              device.name || device.host || "unknown",
              device.ip || "",
              `${number(device.down_mbps)} / ${number(device.up_mbps)} Mbps`
            ])}
            empty=""
          />
        </Panel>
      )}
      {ops.hasRoutes && (
        <Panel title="Proxy Routes" icon={<Globe2 size={18} />} description="Mihomo active outbound chains，例如 DIRECT、PROXY、PROXY-JAPAN 或具体 proxy group。">
          <DataTable
            rows={(state.route_summary || []).slice(0, 14).map((route) => [
              route.chain || "unknown",
              `${route.connections || 0} conn`,
              `${number(route.down_mbps)} / ${number(route.up_mbps)} Mbps`
            ])}
            empty=""
          />
        </Panel>
      )}
      {ops.hasDomains && (
        <Panel title="Top Domains" icon={<Cloud size={18} />} description="按 Mihomo active connections 聚合的目标域名，并显示命中的 rule / outbound chain。">
          <DataTable
            rows={(state.domains || []).slice(0, 14).map((domain) => [
              domain.host || domain.domain || "unknown",
              domain.chain || domain.rule || "",
              `${number(domain.down_mbps)} / ${number(domain.up_mbps)} Mbps`
            ])}
            empty=""
          />
        </Panel>
      )}
      {ops.hasDnsHotspots && (
        <Panel title="DNS Hotspots" icon={<RadioTower size={18} />} description="最近 5 分钟 DNS query 热点，用来定位高频请求的 device 或 domain。">
          <DataTable
            rows={(state.dns_top_devices || []).slice(0, 10).map((device) => [
              device.device || "unknown",
              `${device.count || 0} queries`,
              ""
            ])}
            empty=""
          />
        </Panel>
      )}
      {!ops.hasDevices && !ops.hasRoutes && !ops.hasDomains && !ops.hasDnsHotspots && <EmptyBlock title="Network idle" text="当前没有可展示的流量、代理或 DNS 热点。" />}
    </section>
  );
}

function HealthView({ state }: { state: State }) {
  return (
    <section className="healthGrid">
      <Panel title="Health Checks" icon={<ShieldCheck size={18} />} description="打开 HomeNet 时自动刷新；read-only checks 验证 DNS split、fake-ip 和 domestic DIRECT path。">
        <div className="healthList">
          {(state.health?.checks || []).map((check, index) => (
            <article className={statusClass(check.status)} key={`${check.title}-${index}`}>
              {statusIcon(check.status)}
              <span>
                <b>{check.title || "Check"}</b>
                <p>{check.detail || "No detail"}</p>
              </span>
            </article>
          ))}
          {!(state.health?.checks || []).length && <EmptyLine text="正在刷新健康检查。" />}
        </div>
      </Panel>
      <Panel title="Runtime" icon={<Cpu size={18} />} description="采样循环、Health Checks 和最近错误，用来判断 HomeNet runtime 是否正常。">
        <div className="runtimeGrid">
          <Metric label="State updated" value={relativeTime(state.updated_at)} icon={<RefreshCw size={18} />} />
          <Metric label="Health updated" value={relativeTime(state.health?.updated_at)} icon={<ShieldCheck size={18} />} />
          <Metric label="Presence updated" value={relativeTime(state.presence?.updated_at)} tone={state.presence?.ok ? "ok" : "warn"} icon={<Users size={18} />} />
          <Metric label="Errors" value={`${(state.errors || []).length}`} tone={(state.errors || []).length ? "warn" : "ok"} icon={<AlertTriangle size={18} />} />
        </div>
        <div className="errorList">
          {(state.errors || []).slice(0, 8).map((error, index) => <code key={index}>{error}</code>)}
        </div>
      </Panel>
    </section>
  );
}

function DetailsView({ state, ops }: { state: State; ops: OpsModel }) {
  return (
    <section className="detailsView">
      <IncidentPanel state={state} />
      <NetworkView state={state} ops={ops} />
      <AccessView ops={ops} />
      <HealthView state={state} />
    </section>
  );
}

function AccessView({ ops }: { ops: OpsModel }) {
  const entry = (key: string) => ops.ingress.find((item) => item.key === key);
  const presenceAps = Object.entries(ops.presence.aps || {});

  return (
    <section className="accessView">
      <div className="sectionHeader">
        <div>
          <h2>Access</h2>
          <p>Remote Ingress、WireGuard return path、Maintenance Wi-Fi 和 presence state 统一展示。</p>
        </div>
      </div>
      <div className="accessGrid">
        <Panel title="Remote Ingress" icon={<Cloud size={18} />} description="外部访问入口，包括 Cloudflare Access、Cloudflare Tunnel、IPv6 direct 和 WireGuard UDP。">
          <div className="entryList">
            {[entry("homenet-access"), entry("ha-tunnel"), entry("ipv6-kuma"), entry("wireguard"), entry("cf-access-launcher")].filter(Boolean).map((item) => (
              <ServiceRow key={item!.key || item!.name} service={item!} compact />
            ))}
          </div>
        </Panel>

        <Panel title="WireGuard" icon={<LockKeyhole size={18} />} description="Remote clients 的最近 handshake 和 LAN return path 状态。">
          <div className="presenceSummary">
            <Metric label="Outside" value={`${ops.activeRemoteClients.length} 台`} tone={ops.activeRemoteClients.length ? "ok" : "neutral"} icon={<Globe2 size={18} />} />
            <Metric label="Status" value={ops.remoteAccess.ok ? "ok" : "waiting"} tone={ops.remoteAccess.ok ? "ok" : "warn"} icon={<LockKeyhole size={18} />} />
          </div>
          <div className="presenceAps">
            {ops.remoteClients.slice(0, 10).map((client) => (
              <article key={`${client.name}-${client.ipv4_address}`}>
                <b>{client.name || "unknown"}</b>
                <span>{remoteStatusLabel(client)} · {client.ipv4_address || client.ipv6_address || ""}</span>
                <em>{ageLabel(client.age_seconds)} ago</em>
              </article>
            ))}
            {!ops.remoteClients.length && <EmptyLine text={ops.remoteAccess.error || "暂无 WireGuard 客户端状态。"} />}
          </div>
        </Panel>

        <OpsNetworkPanel ops={ops.opsNetwork} />

        <Panel title="Presence" icon={<Users size={18} />} description="由 OpenWrt Gateway 和 WRT Room 上报的 presence state。">
          <div className="presenceSummary">
            <Metric label="Home" value={`${ops.homeClients.length} 人`} tone={ops.presence.ok ? "ok" : "warn"} icon={<Home size={18} />} />
            <Metric label="Fresh AP" value={`${(ops.presence.fresh_aps || []).length}/${(ops.presence.expected_aps || []).length || presenceAps.length || 0}`} tone={ops.presence.seen_all ? "ok" : "warn"} icon={<Wifi size={18} />} />
          </div>
          <div className="presencePeople">
            {ops.homeClients.length ? ops.homeClients.map((client) => <span key={client}>{personLabel(client)}</span>) : <span>当前无人</span>}
          </div>
          <div className="presenceAps">
            {presenceAps.map(([name, ap]) => (
              <article key={name}>
                <b>{name}</b>
                <span>{(ap.clients || []).map(personLabel).join(", ") || "无人"}</span>
                <em>{ageLabel(ap.age_seconds)} ago</em>
              </article>
            ))}
            {!presenceAps.length && <EmptyLine text={ops.presence.error || "等待 presence 上报。"} />}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function OpsNetworkPanel({ ops }: { ops: OpsNetwork }) {
  const checks = ops.checks || [];
  const clients = ops.clients || [];
  return (
    <Panel title="Maintenance Wi-Fi" icon={<Wrench size={18} />} description="Independent maintenance SSID：使用 public DNS，bypass TProxy，保留 WAN 和 Pi maintenance access。">
      <div className="presenceSummary">
        <Metric label="SSID" value={ops.ssid || "Maintenance Wi-Fi"} tone={ops.ok ? "ok" : "warn"} icon={<Wifi size={18} />} />
        <Metric label="Gateway" value={ops.gateway || "waiting"} tone={ops.gateway ? "ok" : "warn"} icon={<Router size={18} />} />
      </div>
      <div className="opsFacts">
        <span>DHCP {ops.dhcp_range || "waiting"}</span>
        <span>DNS {ops.dns || "waiting"}</span>
        <span>{ops.proxy_bypassed ? "proxy bypassed" : "proxy check pending"}</span>
        <span>{clients.length} clients</span>
      </div>
      <div className="healthList compact">
        {checks.map((check, index) => (
          <article className={statusClass(check.status)} key={`${check.title}-${index}`}>
            {statusIcon(check.status)}
            <span>
              <b>{check.title}</b>
              <p>{check.detail}</p>
            </span>
          </article>
        ))}
        {!checks.length && <EmptyLine text={ops.error || "等待 Maintenance Wi-Fi 采样。"} />}
      </div>
    </Panel>
  );
}

function Troubleshoot({ state, ops }: { state: State; ops: OpsModel }) {
  const checks = state.health?.checks || [];
  const badHealth = checks.filter((check) => statusClass(check.status) !== "ok");
  const badServices = ops.badServices;
  const domains = state.incident?.domains || [];
  const recovery = state.incident?.recovery_matrix || [];
  const decisionSteps = state.incident?.decision_flow || [];
  const wifiChecks = state.wifi_diagnostics?.checks || [];
  const service = (key: string) => ops.services.find((item) => item.key === key);
  const keyServices = ["openwrt-luci", "openwrt-ssh", "wrt-room-luci", "adguard", "mihomo", "homenet-ops", "uptime-kuma", "home-assistant", "wireguard", "cloudflared"]
    .map(service)
    .filter(Boolean) as HomeService[];

  return (
    <section className="troubleView">
      <div className="sectionHeader">
        <div>
          <h2>Fix</h2>
          <p>面向故障现场：先看故障域，再看证据和恢复命令。</p>
        </div>
      </div>
      <div className="troubleGrid">
        <Panel title="Decision Flow" icon={<Compass size={18} />} description="故障现场先按这个顺序排，不要从中间层开始猜。">
          <div className="decisionList">
            {decisionSteps.map((step) => (
              <article className={statusClass(step.status)} key={step.id || step.question}>
                <div>
                  <b>{step.order}</b>
                  {statusIcon(step.status)}
                </div>
                <span>
                  <strong>{step.question}</strong>
                  <p>{step.why_first}</p>
                  {!!(step.if_bad || []).length && <em>{(step.if_bad || []).slice(0, 2).join(" / ")}</em>}
                  {!!(step.entries || []).length && <code>{(step.entries || []).slice(0, 2).join(" · ")}</code>}
                </span>
              </article>
            ))}
            {!decisionSteps.length && <EmptyLine text="等待决策流采样。"/>}
          </div>
        </Panel>

        <Panel title="Recovery Matrix" icon={<Wrench size={18} />} description="常见现象对应的第一检查点、后续证据和 source owner。">
          <div className="recoveryMatrix">
            {recovery.map((row) => (
              <article className={statusClass(row.status)} key={`${row.symptom}-${row.start_domain}`}>
                <header>
                  {statusIcon(row.status)}
                  <b>{row.symptom}</b>
                </header>
                <dl>
                  <div><dt>Start</dt><dd>{row.start_domain}</dd></div>
                  <div><dt>First</dt><dd>{row.first_probe}</dd></div>
                  <div><dt>Then</dt><dd>{row.then_probe}</dd></div>
                  <div><dt>Owner</dt><dd>{row.likely_owner}</dd></div>
                  <div><dt>Avoid</dt><dd>{row.do_not_start_with}</dd></div>
                </dl>
              </article>
            ))}
            {!recovery.length && <EmptyLine text="等待常见故障矩阵。"/>}
          </div>
        </Panel>

        <Panel title="Live Evidence" icon={<Activity size={18} />} description="来自 OpenWrt、Mihomo、AdGuard、WireGuard 和 service probes 的当前 evidence。">
          <div className="runtimeGrid">
            <Metric label="WAN" value={`${number(state.wan?.down_mbps)} Mbps`} icon={<Gauge size={18} />} />
            <Metric label="Mihomo" value={`${number(state.mihomo?.down_mbps)} Mbps`} icon={<Globe2 size={18} />} />
            <Metric label="Maintenance Wi-Fi" value={ops.opsNetwork.ok ? "ready" : "check"} tone={ops.opsNetwork.ok ? "ok" : "warn"} icon={<Wrench size={18} />} />
            <Metric label="Health" value={`${checks.length - badHealth.length}/${checks.length || 0}`} tone={badHealth.length ? "warn" : "ok"} icon={<ShieldCheck size={18} />} />
          </div>
          <div className="entryList">
            {keyServices.map((item) => (
              <ServiceRow key={item.key || item.name} service={item} compact />
            ))}
          </div>
        </Panel>

        <Panel title="Fault Domains" icon={<Wrench size={18} />} description="按影响范围排序，优先恢复上游依赖。">
          <div className="pathList">
            {domains.map((domain) => (
              <article className={statusClass(domain.status)} key={domain.id || domain.title}>
                {statusIcon(domain.status)}
                <span>
                  <b>{domain.title}</b>
                  <p>{domain.detail}</p>
                  <em><strong>Evidence</strong> {domain.evidence}</em>
                  <em><strong>Next</strong> {domain.next_action}</em>
                  {!!(domain.commands || []).length && <em><strong>Command</strong> {(domain.commands || [])[0]}</em>}
                </span>
              </article>
            ))}
            {!domains.length && <EmptyLine text="等待故障域采样。"/>}
          </div>
        </Panel>

        <Panel title="Wi-Fi 5G / Room Backhaul" icon={<Wifi size={18} />} description="断电来电后重点看 radio1、Room backhaul 和卧室 WRT。">
          <div className="healthList">
            {wifiChecks.map((check, index) => (
              <article className={statusClass(check.status)} key={`${check.title}-${index}`}>
                {statusIcon(check.status)}
                <span>
                  <b>{check.title}</b>
                  <p>{check.detail}</p>
                </span>
              </article>
            ))}
            {!wifiChecks.length && <EmptyLine text={state.wifi_diagnostics?.error || "等待 Wi-Fi 采样。"} />}
          </div>
        </Panel>

        <Panel title="Current Problems" icon={<AlertTriangle size={18} />} description="Service probes 或 Health Checks 的异常集中列在这里。">
          <div className="healthList">
            {badHealth.slice(0, 8).map((check, index) => (
              <article className={statusClass(check.status)} key={`${check.title}-${index}`}>
                {statusIcon(check.status)}
                <span>
                  <b>{check.title}</b>
                  <p>{check.detail}</p>
                </span>
              </article>
            ))}
            {badServices.slice(0, 8).map((item) => <ServiceRow key={item.key || item.name} service={item} compact />)}
            {!badHealth.length && !badServices.length && <EmptyLine text="当前没有明显异常。"/>}
          </div>
        </Panel>
      </div>
    </section>
  );
}

type TopologyNodeModel = {
  id: string;
  title: string;
  detail: string;
  meta?: string;
  tone?: "access" | "router" | "core" | "proxy" | "client" | "service";
  status?: Status;
};

type TopologyLinkModel = {
  from: string;
  to: string;
  label: string;
  kind?: "primary" | "support";
};

type TopologyLaneModel = {
  id: string;
  title: string;
  description: string;
  nodes: TopologyNodeModel[];
  links: TopologyLinkModel[];
};

function buildTopology(state: State) {
  const instance = state.instance || {};
  const networks = instance.networks || {};
  const wifi = instance.wifi || {};
  const expectedDevices = instance.devices || [];
  const expectedServices = instance.services || [];
  const deviceById = (id: string) => expectedDevices.find((device) => device.id === id);
  const gatewayDevice = deviceById("openwrt-gateway");
  const roomDevice = deviceById("wrt-room");
  const piDevice = deviceById("raspberrypi");
  const lan = networks.lan || {};
  const opsNet = networks.ops || {};
  const mainWifi = wifi.main || {};
  const roomWifi = wifi.relay_5g || {};
  const ingress = state.ingress || [];
  const services = state.home_services || [];
  const activeDevices = (state.devices || []).slice(0, 6);
  const topRoute = (state.route_summary || [])[0];
  const topDns = (state.dns_top_hosts || [])[0];
  const serviceCount = services.length;
  const okCount = services.filter((service) => statusClass(service.status) === "ok").length;
  const badCount = services.filter((service) => statusClass(service.status) === "bad").length;
  const wanDown = number(state.wan?.down_mbps);
  const wanUp = number(state.wan?.up_mbps);
  const mihomoDown = number(state.mihomo?.down_mbps);
  const mihomoUp = number(state.mihomo?.up_mbps);
  const activeNames = activeDevices.map((device) => device.name || device.ip || "unknown");
  const apEntries = Object.entries(state.presence?.aps || {});
  const freshAps = state.presence?.fresh_aps || [];
  const reportedClientCount = state.presence?.merged_clients?.length || 0;
  const mainAp = apEntries.find(([name]) => name.toLowerCase().includes("main") || name.toLowerCase().includes("openwrt"));
  const roomAp = apEntries.find(([name]) => name.toLowerCase().includes("room") || name.toLowerCase().includes("wrt"));
  const mainDetail = mainAp ? `${mainAp[0]} · ${mainAp[1].clients?.length || 0} clients` : `${gatewayDevice?.ip || lan.gateway || "192.168.50.1"} · ${mainWifi.ssid || "Main Wi-Fi"}`;
  const roomDetail = roomAp ? `${roomAp[0]} · ${roomAp[1].clients?.length || 0} clients` : `${roomDevice?.ip || "192.168.50.2"} · ${roomWifi.ssid || "Room backhaul"}`;
  const clientDetail = reportedClientCount ? `${reportedClientCount} clients reported` : `${activeDevices.length} active now`;
  const ops = state.ops_network || {};
  const accessCount = ingress.filter((item) => statusClass(item.status) === "ok").length;
  const serviceHosts = Array.from(new Map(
    services
      .flatMap((service) => (service.ports || []).map((port) => ({
        host: port.host || "",
        owner: port.owner || service.name || service.key || "service"
      })))
      .filter((item) => item.host)
      .map((item) => [item.host, item])
  ).values());
  const hostSummary = serviceHosts.length
    ? serviceHosts.slice(0, 4).map((item) => item.host).join(", ")
    : "LAN service hosts";
  const expectedServiceHosts = Array.from(new Set(expectedServices.map((service) => service.host).filter(Boolean)));

  const lanes: TopologyLaneModel[] = [
    {
      id: "remote",
      title: "外部访问",
      description: "Remote Ingress 不依赖家庭 Wi-Fi，由 Cloudflare、IPv6 direct 和 WireGuard 分担。",
      nodes: [
        { id: "internet", title: "Internet", detail: `WAN ${wanDown}/${wanUp} Mbps`, tone: "access", status: state.ok ? "ok" : "warn" },
        { id: "cloudflare", title: "Cloudflare Access / Tunnel", detail: `${accessCount}/${ingress.length || 0} entries ok`, meta: "ops / ha / launcher", tone: "access", status: accessCount ? "ok" : "warn" },
        { id: "ipv6", title: "IPv6 Direct", detail: "Caddy + WireGuard UDP", meta: "instance remote entry", tone: "access", status: "ok" },
        { id: "edge-host", title: "Edge Host", detail: "cloudflared / Caddy / wg-easy", meta: `currently ${piDevice?.ip || "192.168.50.5"}`, tone: "core", status: "ok" },
        { id: "remote-services", title: "Home Services", detail: "HomeNet / HA / Kuma / others", meta: `${okCount}/${serviceCount || 0} services ok`, tone: "service", status: badCount ? "warn" : "ok" }
      ],
      links: [
        { from: "Internet", to: "Cloudflare Access", label: "declared HTTPS entries" },
        { from: "Internet", to: "IPv6 Direct", label: "Kuma HTTPS / WireGuard UDP" },
        { from: "Cloudflare", to: "Edge Host", label: "outbound tunnel" },
        { from: "IPv6 Direct", to: "Edge Host", label: "Caddy / UDP" },
        { from: "Edge Host", to: "Home Services", label: "local upstream" }
      ]
    },
    {
      id: "home",
      title: "家里上网",
      description: "Clients 接入 OpenWrt Gateway 或 WRT Room；DNS、Proxy 和 services 可以分布在多个 LAN hosts。",
      nodes: [
        { id: "clients", title: "Clients", detail: clientDetail, meta: activeNames.length ? activeNames.join(", ") : "no active traffic", tone: "client", status: activeDevices.length ? "ok" : "unknown" },
        { id: "main-router", title: gatewayDevice?.name || "OpenWrt 主路由", detail: mainDetail, meta: `${lan.cidr || "192.168.50.0/24"} · ${mainWifi.ssid || "Main Wi-Fi"}`, tone: "router", status: "ok" },
        { id: "room-router", title: roomDevice?.name || "卧室 WRT", detail: roomDetail, meta: `${roomDevice?.ip || "192.168.50.2"} · bedroom coverage`, tone: "router", status: roomAp || freshAps.includes("room") ? "ok" : "warn" },
        { id: "service-hosts", title: "Service Hosts", detail: `${serviceHosts.length || expectedServices.length || 1} services`, meta: hostSummary || expectedServiceHosts.join(", "), tone: "core", status: badCount ? "warn" : "ok" },
        { id: "dns", title: "DNS", detail: topDns?.host || "AdGuard -> Mihomo DNS", meta: "domestic split + fake-ip", tone: "service", status: "ok" },
        { id: "proxy", title: "Mihomo", detail: topRoute?.chain || "idle", meta: `${mihomoDown}/${mihomoUp} Mbps`, tone: "proxy", status: topRoute ? "ok" : "unknown" },
        { id: "wan", title: "WAN", detail: `PPPoE ${wanDown}/${wanUp} Mbps`, meta: "OpenWrt egress", tone: "access", status: state.ok ? "ok" : "warn" }
      ],
      links: [
        { from: "Clients", to: "OpenWrt 主路由", label: "main Wi-Fi / LAN" },
        { from: "Clients", to: "卧室 WRT", label: "room Wi-Fi", kind: "support" },
        { from: "卧室 WRT", to: "OpenWrt 主路由", label: "wireless relay", kind: "support" },
        { from: "OpenWrt 主路由", to: "Service Hosts", label: "LAN services" },
        { from: "Service Hosts", to: "DNS", label: "AdGuard" },
        { from: "Service Hosts", to: "Mihomo", label: "proxy core" },
        { from: "OpenWrt 主路由", to: "WAN", label: "direct + bypass" },
        { from: "Mihomo", to: "WAN", label: "proxied egress" }
      ]
    },
    {
      id: "rescue",
      title: "运维通道",
      description: "主 Proxy 或 DNS 出问题时，Maintenance Wi-Fi 保留 WAN 和 Pi maintenance access。",
      nodes: [
        { id: "maintenance-wifi", title: wifi.ops?.ssid || "Maintenance Wi-Fi", detail: ops.gateway || opsNet.gateway || "192.168.40.1", meta: `DHCP ${ops.dhcp_range || "100-149"} · ${opsNet.cidr || ""}`.trim(), tone: "router", status: ops.ok ? "ok" : "warn" },
        { id: "public-dns", title: "Public DNS", detail: ops.dns || "119.29.29.29 / 223.5.5.5 / 1.1.1.1", meta: "bypass transparent proxy", tone: "service", status: ops.proxy_bypassed ? "ok" : "warn" },
        { id: "pi-maintenance", title: "Pi Maintenance", detail: "SSH 22 / HomeNet 9999", meta: "192.168.50.5", tone: "core", status: ops.ok ? "ok" : "warn" },
        { id: "internet-rescue", title: "Internet", detail: "direct WAN", meta: "device runs its own proxy if needed", tone: "access", status: ops.ok ? "ok" : "warn" }
      ],
      links: [
        { from: "Device", to: "Maintenance Wi-Fi", label: "manual connect" },
        { from: "Maintenance Wi-Fi", to: "Public DNS", label: "no transparent proxy" },
        { from: "Maintenance Wi-Fi", to: "Pi Maintenance", label: "SSH / local HomeNet" },
        { from: "Maintenance Wi-Fi", to: "Internet", label: "direct egress" }
      ]
    }
  ];

  return {
    lanes,
    facts: [
      { label: "Services", value: `${okCount}/${serviceCount || 0} ok`, tone: badCount ? "warn" : "ok" },
      { label: "WAN", value: `${wanDown}/${wanUp} Mbps`, tone: state.ok ? "ok" : "warn" },
      { label: "Proxy", value: topRoute?.chain || "idle", tone: topRoute ? "ok" : "neutral" },
      { label: "AP reports", value: freshAps.length ? freshAps.join(", ") : "waiting", tone: freshAps.length ? "ok" : "warn" },
      { label: "Active clients", value: activeNames.length ? activeNames.join(", ") : "none", tone: activeNames.length ? "ok" : "neutral" }
    ]
  };
}

function Topology({ state }: { state: State }) {
  const domainStatus = (id: string, fallback: Status = "unknown") => state.incident?.domains?.find((item) => item.id === id)?.status || fallback;
  const ops = state.ops_network || {};
  const roomOk = state.wifi_diagnostics?.room_reachable;
  const paths = [
    {
      id: "daily",
      title: "日常上网",
      status: domainStatus("dns-proxy", state.ok ? "ok" : "warn"),
      route: ["手机/电脑", "Main Wi-Fi", "OpenWrt 主路由", "AdGuard / Mihomo", "公网"],
      note: `WAN ${number(state.wan?.down_mbps)} Mbps，代理 ${state.route_summary?.[0]?.chain || "空闲"}`,
      action: "国内慢看 DIRECT/DNS，国外慢看 Mihomo 代理组。"
    },
    {
      id: "room",
      title: "卧室覆盖",
      status: domainStatus("room-ap", roomOk ? "ok" : "warn"),
      route: ["手机/电脑", "Main Wi-Fi", "卧室 WRT", "主路由"],
      note: roomOk ? "主网侧 192.168.50.2 可达" : "卧室 WRT 等待确认",
      action: "主网/Pi 用 192.168.50.2；手机连卧室 WRT 下时用 192.168.50.1。"
    },
    {
      id: "remote",
      title: "外部回家",
      status: domainStatus("remote-access", state.remote_access?.ok ? "ok" : "warn"),
      route: ["外部设备", "Cloudflare / WireGuard", "Pi", "家庭服务"],
      note: `${state.remote_access?.clients?.filter((client) => client.status === "active" || client.status === "recent").length || 0} 台近期连接`,
      action: "外部打不开时先确认 LAN 入口，再看 Cloudflare/WireGuard。"
    },
    {
      id: "rescue",
      title: "检修通道",
      status: domainStatus("rescue", ops.ok ? "ok" : "warn"),
      route: ["维护设备", ops.ssid || "Maintenance Wi-Fi", "公共 DNS / 直出", "Pi :9999"],
      note: ops.ok ? "检修 Wi-Fi 就绪" : "检修 Wi-Fi 需要确认",
      action: "主网络复杂路径坏了，用它进 Pi 和 Codex 排查。"
    }
  ];

  return (
    <div className="simpleTopology" aria-label="Home network topology">
      {paths.map((path) => (
        <article className={statusClass(path.status)} key={path.id}>
          <header>
            {statusIcon(path.status)}
            <div>
              <h3>{path.title}</h3>
              <p>{path.note}</p>
            </div>
            <b>{shortStatus(path.status)}</b>
          </header>
          <div className="routeLine">
            {path.route.map((item) => <span key={`${path.id}-${item}`}>{item}</span>)}
          </div>
          <p>{path.action}</p>
        </article>
      ))}
    </div>
  );
}

function TopologyCard({ node }: { node: TopologyNodeModel }) {
  return (
    <article className={`topologyCard ${node.tone || ""} ${statusClass(node.status)}`}>
      <div>
        <span className="statusDot" />
        <h4>{node.title}</h4>
      </div>
      <b>{node.detail}</b>
      {node.meta && <p>{node.meta}</p>}
    </article>
  );
}

function ModulePlanView({ state }: { state: State }) {
  const plan = state.plan || {};
  const modules = plan.modules || [];
  if (!plan.ok && !modules.length) {
    return (
      <Panel title="Module Plan" icon={<Layers3 size={18} />} description="homenet.plan.v1 暂时不可用。">
        <EmptyLine text={plan.error || "等待 HomeNet plan 生成。"} />
      </Panel>
    );
  }

  const primary = modules.filter((module) => [
    "gateway-openwrt",
    "dns-layer",
    "proxy-mihomo",
    "remote-access",
    "observability-homenet",
    "maintenance-wifi"
  ].includes(module.id || ""));
  const visible = primary.length ? primary : modules.slice(0, 6);

  return (
    <section className="modulePlanSection">
      <div className="sectionHeader">
        <div>
          <h2>Module Plan</h2>
          <p>{plan.schema || "homenet.plan.v1"} · {plan.profile || "profile"} · read-only module plan</p>
        </div>
      </div>
      <div className="modulePlanGrid">
        {visible.map((module) => (
          <article className="modulePlanCard" key={module.id || module.title}>
            <header>
              <b>{module.title || module.id}</b>
              <span>{module.placement || "placement"}</span>
            </header>
            <p>{(module.outputs || [])[0] || (module.inputs || [])[0] || "module"}</p>
            <dl>
              <div>
                <dt>Checks</dt>
                <dd>{(module.checks || []).slice(0, 2).join(" / ") || "not declared"}</dd>
              </div>
              <div>
                <dt>Rollback</dt>
                <dd>{(module.rollback || []).slice(0, 2).join(" / ") || "not declared"}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value, icon, tone = "neutral" }: { label: string; value: string; icon: React.ReactNode; tone?: "neutral" | "ok" | "warn" }) {
  return (
    <article className={`metric ${tone}`}>
      {icon}
      <span>{label}</span>
      <b>{value}</b>
    </article>
  );
}

function LoadMeter({ label, down, up }: { label: string; down?: number; up?: number }) {
  const total = Math.min(100, Math.max(2, ((down || 0) + (up || 0)) * 6));
  return (
    <article className="loadMeter">
      <div>
        <b>{label}</b>
        <span>{number(down)} down · {number(up)} up</span>
      </div>
      <em><i style={{ width: `${total}%` }} /></em>
    </article>
  );
}

function Panel({ title, icon, description, children }: { title: string; icon: React.ReactNode; description?: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <header className="panelTitle">{icon}<h2>{title}</h2></header>
      {description && <p className="panelIntro">{description}</p>}
      {children}
    </section>
  );
}

function ServiceCard({ service }: { service: HomeService }) {
  const links = serviceLinks(service);
  return (
    <article className={`serviceCard ${statusClass(service.status)}`}>
      <div className="serviceHead">
        <span>{statusIcon(service.status)}</span>
        <b>{service.name || service.key || "Service"}</b>
      </div>
      <p>{service.role || service.kind || "service"}</p>
      <div className="serviceMeta">
        <span>{service.detail || service.status || "unknown"}</span>
        {typeof service.latency_ms === "number" && <span>{service.latency_ms} ms</span>}
      </div>
      <ServicePorts ports={service.ports || []} />
      {!!links.length && (
        <div className="serviceActions">
          {links.map((link) => <a key={`${service.key}-${link.label}`} href={link.href} target="_blank" rel="noreferrer">{link.label} <ArrowUpRight size={14} /></a>)}
        </div>
      )}
    </article>
  );
}

function ServicePorts({ ports }: { ports: PortEntry[] }) {
  if (!ports.length) return null;
  return (
    <div className="portChips">
      {ports.map((port, index) => (
        <span key={`${port.host}-${port.port}-${port.proto}-${index}`} title={`${port.service || ""} · ${port.scope || ""} · ${port.note || ""}`}>
          {port.host || ""}:{port.port || ""}/{port.proto || ""}
        </span>
      ))}
    </div>
  );
}

function ServiceRow({ service, compact = false }: { service: HomeService | Ingress; compact?: boolean }) {
  const links = serviceLinks(service);
  return (
    <article className={`serviceRow ${compact ? "compact" : ""} ${statusClass(service.status)}`}>
      {statusIcon(service.status)}
      <span>
        <b>{service.name || service.key || "Entry"}</b>
        <p>{serviceDescription(service)}</p>
      </span>
      <div className="serviceActions compact">
        {links.map((link) => <a key={`${service.key}-${link.label}`} href={link.href} target="_blank" rel="noreferrer">{link.label}</a>)}
      </div>
    </article>
  );
}

function DataTable({ rows, empty }: { rows: string[][]; empty: string }) {
  if (!rows.length) return empty ? <EmptyLine text={empty} /> : null;
  return (
    <div className="dataTable">
      {rows.map((row, index) => (
        <article key={`${row.join("-")}-${index}`}>
          {row.map((cell, cellIndex) => <span key={cellIndex}>{cell}</span>)}
        </article>
      ))}
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="emptyLine">{text}</p>;
}

function EmptyBlock({ title, text }: { title: string; text: string }) {
  return (
    <section className="emptyBlock">
      <Wifi size={28} />
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
