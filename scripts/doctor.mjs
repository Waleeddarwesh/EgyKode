#!/usr/bin/env node
/**
 * EgyKode Lab Environment Doctor.
 *
 *   node scripts/doctor.mjs                    the whole environment
 *   node scripts/doctor.mjs <labId>            only what that lab needs
 *
 * Diagnoses, never installs. A learner who is stuck wants to know what is
 * missing for the lab in front of them, and that question is answerable
 * without touching their machine — so this reads and reports, and nothing
 * here writes, downloads or changes anything.
 *
 * Requirements are declared by each lab in its frontmatter, not hard-coded
 * here. Encoding "the Kubernetes labs need kind" in this file would put the
 * truth in two places and guarantee they drift; the lab is the one that knows.
 *
 * Runs on Windows, macOS and Linux, because the audience is on all three and
 * the one most likely to be blocked is a student laptop on Windows.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

// ── Probing ─────────────────────────────────────────────────────────────────

/** Run a command quietly. Absent binaries must not throw. */
function run(cmd, args) {
  try {
    const r = spawnSync(cmd, args, { encoding: "utf8", shell: true, timeout: 15_000 });
    return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
  } catch {
    return { ok: false, out: "" };
  }
}

/** First line of a version string, trimmed to something readable. */
const version = (out) => (out.split("\n")[0] ?? "").trim().slice(0, 48);

const TOOLS = {
  git: () => run("git", ["--version"]),
  bash: () => run("bash", ["--version"]),
  python: () => {
    const p = run("python3", ["--version"]);
    return p.ok ? p : run("python", ["--version"]);
  },
  docker: () => run("docker", ["--version"]),
  "docker-compose": () => run("docker", ["compose", "version"]),
  kubectl: () => run("kubectl", ["version", "--client"]),
  kind: () => run("kind", ["--version"]),
  helm: () => run("helm", ["version", "--short"]),
  terraform: () => run("terraform", ["--version"]),
  ansible: () => run("ansible", ["--version"]),
  aws: () => run("aws", ["--version"]),
};

/**
 * Capabilities are not binaries. `kubectl` being installed says nothing about
 * whether a cluster is reachable, and a running cluster says nothing about
 * whether it has the second node a drain lab needs.
 */
const CAPABILITIES = {
  "docker-daemon": () => {
    const r = run("docker", ["info", "--format", "{{.ServerVersion}}"]);
    return { ok: r.ok, detail: r.ok ? `server ${version(r.out)}` : "CLI is installed but the daemon is not responding" };
  },
  "kubernetes-cluster": () => {
    const r = run("kubectl", ["cluster-info", "--request-timeout=5s"]);
    return { ok: r.ok, detail: r.ok ? "reachable" : "no cluster is reachable" };
  },
  "kubernetes-multinode": () => {
    const r = run("kubectl", ["get", "nodes", "--no-headers", "--request-timeout=5s"]);
    if (!r.ok) return { ok: false, detail: "no cluster is reachable" };
    const n = r.out.split("\n").filter((l) => l.trim()).length;
    return { ok: n >= 2, detail: `${n} node${n === 1 ? "" : "s"}` };
  },
  /**
   * Whether NetworkPolicy is enforced, not whether it is accepted.
   *
   * Every cluster accepts NetworkPolicy objects — the type is built into the
   * API. Enforcement is the CNI's job, and kind's default (kindnet) does not
   * do it. Without this check, `doctor` reports a healthy cluster, the learner
   * applies a default-deny policy, watches `kubectl get netpol` list it, curls
   * between two Pods, and the traffic flows. Nothing anywhere says why.
   *
   * Checked by identifying the CNI rather than by sending traffic: probing for
   * real would mean creating Pods and a policy in the learner's cluster, and a
   * diagnostic must not change the thing it is diagnosing.
   */
  "networkpolicy-enforced": () => {
    const r = run("kubectl", [
      "-n", "kube-system", "get", "pods",
      "-o", "jsonpath={.items[*].metadata.labels.k8s-app}",
      "--request-timeout=5s",
    ]);
    if (!r.ok) return { ok: false, detail: "no cluster is reachable" };
    const enforcing = ["calico-node", "cilium", "weave-net", "kube-router", "antrea-agent"];
    const found = enforcing.find((c) => r.out.includes(c));
    if (found) return { ok: true, detail: `${found} enforces NetworkPolicy` };
    return {
      ok: false,
      detail: r.out.includes("kindnet")
        ? "kindnet accepts NetworkPolicy objects and enforces none of them"
        : "no NetworkPolicy-enforcing CNI found",
    };
  },
  /** HPA reads from metrics-server, which is not part of a default cluster. */
  "metrics-server": () => {
    const r = run("kubectl", ["top", "nodes", "--request-timeout=10s"]);
    return { ok: r.ok, detail: r.ok ? "serving metrics" : "not installed, so HPA has nothing to scale on" };
  },
  "aws-credentials": () => {
    const r = run("aws", ["sts", "get-caller-identity", "--output", "text"]);
    return { ok: r.ok, detail: r.ok ? "configured" : "no usable credentials" };
  },
  /**
   * systemd, on whichever machine the lab actually uses.
   *
   * This used to check the host and report failure on macOS and Windows, which
   * was true and useless: the service labs do not run on the host, they run on
   * the managed node, and that node runs systemd on every platform because it
   * is a container. Reporting "use a VM or WSL2" to a learner whose environment
   * already provides systemd sends them to install something they have.
   */
  "init-system": () => {
    const node = run("docker", ["exec", "egykode-node", "systemctl", "is-system-running"]);
    if (node.out.trim()) {
      const state = node.out.trim().split("\n").pop();
      // "degraded" still runs services; only a missing systemd is fatal here.
      const ok = /running|degraded/.test(state);
      return { ok, detail: ok ? `systemd on egykode-node (${state})` : state };
    }
    if (process.platform === "linux") {
      const r = run("systemctl", ["--version"]);
      if (r.ok) return { ok: true, detail: "systemd on this machine" };
    }
    return { ok: false, detail: "start the lab environment: ./egykode start" };
  },
};

// ── Lab requirements, read from the lab ─────────────────────────────────────

function contentRoot() {
  for (const c of [resolve(process.cwd(), "content"), resolve(process.cwd(), "..", "..", "content")]) {
    if (existsSync(c)) return c;
  }
  return null;
}

/**
 * Parse `environment.local.{tools,capabilities}` out of a lab's frontmatter.
 *
 * Deliberately a small hand parser rather than a YAML dependency: this script
 * has to run on a learner's machine before they have installed anything, so it
 * uses nothing but Node itself.
 */
/**
 * Requirements from the generated labs.json, used by the standalone lab
 * environment repository.
 *
 * That mirror carries the containers and this script but no content/, so
 * reading frontmatter finds nothing there. Without this, `./egykode doctor
 * <lab>` would answer a question the learner did not ask — a generic report of
 * the whole environment instead of what their lab needs.
 */
function labRequirementsFromIndex(labId) {
  for (const dir of [process.cwd(), resolve(process.cwd(), "..")]) {
    const file = join(dir, "labs.json");
    if (!existsSync(file)) continue;
    try {
      const entry = JSON.parse(readFileSync(file, "utf8"))[labId];
      if (!entry) return null;
      return {
        title: entry.title || labId,
        declared: true,
        local: true,
        environment: entry.environment,
        tools: entry.tools ?? [],
        capabilities: entry.capabilities ?? [],
      };
    } catch {
      return null;
    }
  }
  return null;
}

function labRequirements(labId) {
  const root = contentRoot();
  if (!root) return labRequirementsFromIndex(labId);
  const file = join(root, "labs", `${labId}.en.mdx`);
  if (!existsSync(file)) return labRequirementsFromIndex(labId);

  const raw = readFileSync(file, "utf8");
  const fm = raw.match(/^---([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const title = fm.match(/^title:\s*["']?(.*?)["']?\s*$/m)?.[1] ?? labId;

  // Line-based, not lookahead-based. An earlier version ended its captures
  // with `\Z`, which JavaScript treats as a literal "Z" — the last key in a
  // block silently never matched. Walking indentation cannot fail that way.
  const lines = fm.split(/\r?\n/);
  const section = (header, indent) => {
    const start = lines.findIndex((l) => new RegExp(`^${" ".repeat(indent)}${header}:\\s*$`).test(l));
    if (start === -1) return [];
    const out = [];
    for (const line of lines.slice(start + 1)) {
      if (line.trim() && !line.startsWith(" ".repeat(indent + 1))) break;
      out.push(line);
    }
    return out;
  };

  const handsOn = section("handsOn", 0);
  if (handsOn.length === 0) return { title, declared: false, tools: [], capabilities: [] };

  // Only the local option matters here: doctor checks the learner's machine,
  // and neither a hosted sandbox nor an AWS account is on it.
  const localStart = handsOn.findIndex((l) => /^ {2}local:\s*$/.test(l));
  if (localStart === -1) return { title, declared: true, local: false, tools: [], capabilities: [] };

  const local = [];
  for (const line of handsOn.slice(localStart + 1)) {
    if (line.trim() && !line.startsWith("    ")) break;
    local.push(line);
  }

  const list = (key) => {
    const at = local.findIndex((l) => new RegExp(`^ {4}${key}:\\s*$`).test(l));
    if (at === -1) return [];
    const out = [];
    for (const line of local.slice(at + 1)) {
      const item = line.match(/^ {6}-\s+(.+?)\s*$/)?.[1];
      if (!item) break;
      out.push(item);
    }
    return out;
  };

  const environment = local.find((l) => /^ {4}environment:/.test(l))?.split(":")[1]?.trim();

  return {
    title,
    declared: true,
    local: true,
    environment,
    tools: list("tools"),
    capabilities: list("capabilities"),
  };
}

// ── Output ──────────────────────────────────────────────────────────────────

const tick = (ok) => (ok ? "✓" : "✗");
let missing = 0;

function line(ok, name, detail) {
  if (!ok) missing += 1;
  console.log(`  ${tick(ok)} ${name.padEnd(22)}${detail ? ` ${detail}` : ""}`);
}

function fullReport() {
  console.log("EgyKode Lab Environment Doctor\n");
  const groups = {
    Core: ["git", "bash", "python"],
    Containers: ["docker", "docker-compose"],
    Kubernetes: ["kubectl", "kind", "helm"],
    IaC: ["terraform", "ansible"],
    AWS: ["aws"],
  };
  for (const [group, tools] of Object.entries(groups)) {
    console.log(group);
    for (const t of tools) {
      const r = TOOLS[t]();
      line(r.ok, t, r.ok ? version(r.out) : "not found");
    }
    console.log("");
  }
  console.log("Capabilities");
  for (const [name, probe] of Object.entries(CAPABILITIES)) {
    const r = probe();
    line(r.ok, name, r.detail);
  }
}

function labReport(labId) {
  const req = labRequirements(labId);
  if (!req) {
    console.log(`No lab found with id "${labId}".`);
    console.log("Run without an argument to check the whole environment.");
    process.exit(1);
  }

  console.log(`Lab: ${req.title}\n`);

  if (!req.declared) {
    console.log("  This lab does not declare its environment yet.");
    console.log("  Checking the whole environment instead:\n");
    fullReport();
    return;
  }

  if (req.tools.length) {
    console.log("Tools");
    for (const t of req.tools) {
      const probe = TOOLS[t];
      if (!probe) {
        line(false, t, "unknown tool — check the lab's environment block");
        continue;
      }
      const r = probe();
      line(r.ok, t, r.ok ? version(r.out) : "not found");
    }
    console.log("");
  }

  if (req.capabilities.length) {
    console.log("Capabilities");
    for (const c of req.capabilities) {
      const probe = CAPABILITIES[c];
      if (!probe) {
        line(false, c, "unknown capability — check the lab's environment block");
        continue;
      }
      const r = probe();
      line(r.ok, c, r.detail);
      // The fix, where there is one worth suggesting. Suggestions only — this
      // script does not run them.
      // Suggestions name the wrapper, not raw kind. `./egykode start k8s`
      // also joins the controller to the cluster's network and writes it a
      // working kubeconfig; a bare `kind create cluster` leaves the container
      // pointed at 127.0.0.1, which is itself.
      if (!r.ok && (c === "kubernetes-cluster" || c === "kubernetes-multinode")) {
        console.log("      try: ./egykode start k8s");
      }
      if (!r.ok && (c === "networkpolicy-enforced" || c === "metrics-server")) {
        console.log("      try: ./egykode cluster calico");
      }
      if (!r.ok && c === "docker-daemon") {
        console.log("      try: start Docker Desktop, or `sudo systemctl start docker`");
      }
    }
  }
}

// ── Entry ───────────────────────────────────────────────────────────────────

const arg = process.argv[2];
if (arg) labReport(arg);
else fullReport();

console.log("");
if (missing === 0) {
  console.log("Everything checked is present.");
} else {
  console.log(`${missing} item${missing === 1 ? "" : "s"} missing or unavailable.`);
  console.log("Nothing was installed or changed — this only reports.");
}
