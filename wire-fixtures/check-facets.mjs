// SPDX-License-Identifier: Apache-2.0
//
// The fourth question: **is every runtime-semantics claim in this home
// demonstrated by something that can fail?**
//
//   emit.mjs                 — do the bytes come out the way the text says?
//   check-manifest.mjs       — does the manifest describe the tree it sits in?
//   check-cross-artefact.mjs — do the artefacts agree with each other?
//   this                     — does each declared facet value have a passing
//                              family vector, and does that vector's own
//                              content actually exhibit the value it claims?
//
// A facet is a statement about what an evaluator does at runtime: whether
// it can lose a message, whether it can deliver one twice, whether work in
// flight survives a restart, what it does when two authors edit one
// composition at once. Those are exactly the claims a specification cannot
// check by reading a document, and exactly the claims that are worth the
// most when they are true — which is why they are the ones most likely to
// be asserted rather than shown. Section 11.3 is the rule: a profile MUST
// NOT declare a value no registered family demonstrates for it. This is
// that rule, run.
//
//   node check-facets.mjs
//
// TWO INDEPENDENT RECOMPUTATIONS HAPPEN HERE, and both are deliberate.
//
//   1. The canonical encoder below is a SECOND implementation of section 4,
//      written beside emit.mjs's rather than shared with it. That looks like
//      duplication and is triangulation: the derived digests in the vectors
//      (`expect.projection`, `expect.fold`) are computed by one encoder and
//      checked by the other, so an encoder that drifts is caught by the run
//      that would otherwise bless it. A checker that imported the emitter's
//      encoder could only ever confirm the emitter agrees with itself.
//
//   2. The replay rule and the fold rule are re-derived here from section
//      12 rather than read out of the vectors. A vector states its outcome;
//      this recomputes what the outcome must be and compares. A digest
//      somebody typed is a digest nobody checked.
//
// Exits non-zero naming every violation found, rather than stopping at the
// first.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const failures = [];
const fail = (m) => failures.push(m);

const manifest = JSON.parse(readFileSync(join(here, "manifest.json"), "utf8"));

// ── a second §4 encoder, written from the text ───────────────────────

const enc = {
  str(s) {
    let out = '"';
    for (const ch of s) {
      const c = ch.codePointAt(0);
      if (ch === '"') out += '\\"';
      else if (ch === "\\") out += "\\\\";
      else if (ch === "\n") out += "\\n";
      else if (ch === "\r") out += "\\r";
      else if (ch === "\t") out += "\\t";
      else if (c < 0x20) out += "\\u" + c.toString(16).padStart(4, "0");
      else out += ch;
    }
    return out + '"';
  },
  int(n) {
    if (!Number.isInteger(n)) throw new Error(`§4.4: not an integer: ${n}`);
    if (n < -2147483648 || n > 2147483647) throw new Error(`§4.4: out of 32-bit range: ${n}`);
    return String(n);
  },
  obj(pairs) {
    return (
      "{" +
      pairs
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => enc.str(k) + ":" + v)
        .join(",") +
      "}"
    );
  },
  arr(items) {
    return "[" + items.join(",") + "]";
  },
};

/** §6 — the citation object, members in declaration order. */
const citation = (c) =>
  c == null
    ? null
    : enc.obj([
        ["spec", enc.str(c.spec)],
        ["version", enc.str(c.version)],
        ["corpusHead", c.corpusHead == null ? null : enc.str(c.corpusHead)],
      ]);

/** §5 — each kind's members, in the order that section states them. A facet
 *  vector's composition is a core composition; a kind it does not carry has no
 *  encoder here, and meeting one is an error rather than a guess. */
const kindMembers = {
  appRoot: (n) => [
    ["base", enc.str(n.base)],
    ["layers", enc.arr((n.layers ?? []).map(enc.str))],
  ],
  serverConfig: () => [],
  companionSelection: (n) => [
    ["slot", enc.str(n.slot)],
    ["impl", enc.str(n.impl)],
  ],
  moduleRef: (n) => [
    ["view", enc.str(n.view)],
    ["viewSpec", citation(n.viewSpec)],
    ["surfaceKind", n.surfaceKind == null ? null : enc.str(n.surfaceKind)],
  ],
  dataType: (n) => [["name", enc.str(n.name)]],
  portAllocation: (n) => [
    ["server", enc.int(n.server)],
    ["client", n.client == null ? null : enc.int(n.client)],
  ],
  connectorRef: (n) => [
    ["impl", enc.str(n.impl)],
    ["oauth", enc.str(n.oauth)],
    ["rateLimited", enc.str(n.rateLimited)],
  ],
  configKnob: (n) => [
    ["key", enc.str(n.key)],
    ["value", enc.str(n.value)],
  ],
  extensionRef: (n) => [
    ["namespace", enc.str(n.namespace)],
    ["extensionKind", enc.str(n.extensionKind)],
    [
      "fields",
      enc.arr(
        (n.fields ?? []).map((f) =>
          enc.obj([
            ["name", enc.str(f.name)],
            ["value", enc.str(f.value)],
          ]),
        ),
      ),
    ],
  ],
};

/** §3.1 — `kind` first, the kind's members, then `id`, then `children`. */
const node = (n) => {
  const members = kindMembers[n.kind];
  if (!members) throw new Error(`no encoder for kind ${JSON.stringify(n.kind)}`);
  return enc.obj([
    ["kind", enc.str(n.kind)],
    ...members(n),
    ["id", enc.str(n.id)],
    ["children", enc.arr((n.children ?? []).map(node))],
  ]);
};

const digestOfTree = (tree) => createHash("sha256").update(Buffer.from(node(tree), "utf8")).digest("hex");

// ── the registrations ────────────────────────────────────────────────

const axes = manifest.facetAxes ?? {};
const facetFamilies = manifest.facetFamilies ?? {};
const facetProfiles = manifest.facetProfiles ?? {};
const declarations = manifest.facetDeclarations ?? {};
const declaredFamilies = new Set(manifest.families ?? []);
const profileNames = new Set(Object.keys(manifest.profiles ?? {}));

const withoutDiscriminator = new Map(
  (manifest.facetValuesWithoutDiscriminator ?? []).map((e) => [`${e.axis}/${e.value}`, e.reason]),
);

if (!Object.keys(axes).length) fail("no facet axes are registered; §11.1 states at least one");

for (const [family, reg] of Object.entries(facetFamilies)) {
  if (!declaredFamilies.has(family)) fail(`facet family "${family}" is registered but not declared in families`);
  if (!reg.vectorShape) fail(`facet family "${family}" registers no vector shape (§12)`);
  if (!reg.passCriteria) fail(`facet family "${family}" registers no pass criteria (§12)`);
  for (const axis of reg.exercises ?? []) {
    if (!(axis in axes)) fail(`facet family "${family}" claims to exercise axis "${axis}", which §11.1 does not register`);
  }
  if (!(reg.exercises ?? []).length) fail(`facet family "${family}" exercises no axis, so nothing it contains is a demonstration`);
}

for (const [profile, fams] of Object.entries(facetProfiles)) {
  if (!profileNames.has(profile)) fail(`facetProfiles names profile "${profile}", which the profile partition does not declare`);
  for (const f of fams) {
    if (!(f in facetFamilies)) fail(`profile "${profile}" is scoped to facet family "${f}", which is not registered`);
  }
}

// A profile in scope of a facet family declares its facets, and a profile
// that declares facets is in scope of a family. Either one alone is a
// declaration nobody runs or a run nobody declared.
for (const profile of Object.keys(facetProfiles)) {
  if (!(profile in declarations)) fail(`profile "${profile}" is scoped to facet families but carries no facet declaration (§11.2)`);
}
for (const profile of Object.keys(declarations)) {
  if (!(profile in facetProfiles)) fail(`profile "${profile}" carries a facet declaration but is in scope of no facet family`);
}

// §11.4 — a declaration carries EVERY registered axis. An axis a profile
// provides nothing on is declared empty, with its reason; an axis that is
// simply absent is indistinguishable from one somebody forgot.
for (const [profile, decl] of Object.entries(declarations)) {
  for (const axis of Object.keys(axes)) {
    if (!(axis in decl)) {
      fail(`profile "${profile}" declares nothing for axis "${axis}"; §11.4 requires every axis, empty with a reason where it provides none`);
      continue;
    }
    const entry = decl[axis];
    if (!entry.note) fail(`profile "${profile}", axis "${axis}": the declaration carries no note`);
    for (const value of entry.honoured ?? []) {
      if (!axes[axis].includes(value)) fail(`profile "${profile}" honours "${value}" on axis "${axis}", which is not in that axis's vocabulary`);
      if (withoutDiscriminator.has(`${axis}/${value}`)) {
        fail(
          `profile "${profile}" honours ${axis}=${value}, which §12 states no discriminator for — ` +
            `so the claim cannot be exhibited by any vector (${withoutDiscriminator.get(`${axis}/${value}`)})`,
        );
      }
    }
  }
  for (const axis of Object.keys(decl)) {
    if (!(axis in axes)) fail(`profile "${profile}" declares axis "${axis}", which §11.1 does not register`);
  }
}

for (const [key, reason] of withoutDiscriminator) {
  const [axis, value] = key.split("/");
  if (!(axis in axes) || !axes[axis].includes(value)) fail(`facetValuesWithoutDiscriminator names ${key}, which is not a registered facet value`);
  if (!reason) fail(`facetValuesWithoutDiscriminator: ${key} carries no reason`);
}

// ── the vectors ──────────────────────────────────────────────────────

const cmpCodePoints = (a, b) => {
  const x = [...a];
  const y = [...b];
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const d = x[i].codePointAt(0) - y[i].codePointAt(0);
    if (d !== 0) return d;
  }
  return x.length - y.length;
};

/** §12.1 — the replay rule, re-derived rather than read. */
const replay = (doc) => {
  const steps = doc.session.steps;
  const atStep = doc.kill.atStep;
  const survives = (s, i) => i + 1 !== atStep || s.journaled === "true";
  const appended = steps.filter((s) => s.step === "append");
  const surviving = steps.filter((s, i) => s.step === "append" && survives(s, i));
  const performers = steps
    .map((s, i) => [s, i + 1])
    .filter(([s]) => s.step === "perform")
    .map(([s, i]) =>
      i !== atStep
        ? { performer: s.performer, invocations: 1, delivered: 1 }
        : s.journaled === "true"
          ? { performer: s.performer, invocations: 2, delivered: s.dedupe === "none" ? 2 : 1 }
          : { performer: s.performer, invocations: 1, delivered: 0 },
    );
  return {
    atStep,
    killedStep: steps[atStep - 1],
    divergent: surviving.length !== appended.length,
    projection: { ...doc.session.root, children: surviving.map((s) => s.node) },
    performers,
  };
};

/** §12.2 — the total order and the interference rule, likewise. */
const fold = (doc) => {
  const ops = [];
  for (const l of doc.lanes) for (const o of l.ops) ops.push({ ...o, lane: l.lane });
  ops.sort((a, b) => a.stamp - b.stamp || cmpCodePoints(a.lane, b.lane));

  const interference = [];
  for (let i = 0; i < ops.length; i++) {
    for (let j = i + 1; j < ops.length; j++) {
      const a = ops[i];
      const b = ops[j];
      if (a.lane === b.lane) continue;
      if (a.op === "write" && b.op === "write" && a.target === b.target && a.member === b.member && a.value !== b.value) {
        interference.push(`${a.lane} and ${b.lane} both write ${a.target}.${a.member}`);
      }
      if (a.op === "append" && b.op === "append" && a.node.id === b.node.id) {
        interference.push(`${a.lane} and ${b.lane} both append a node with id "${a.node.id}"`);
      }
    }
  }

  const tree = JSON.parse(JSON.stringify(doc.base));
  const write = (n, target, member, value) => {
    if (n.id === target) n[member] = value;
    (n.children ?? []).forEach((c) => write(c, target, member, value));
  };
  for (const o of ops) {
    if (o.op === "append") tree.children.push(o.node);
    else write(tree, o.target, o.member, o.value);
  }

  return { ops, interference, tree, laneCount: doc.lanes.filter((l) => l.ops.length).length };
};

/**
 * §12.5 — the four conditions, re-derived rather than read. Each is
 * INDEPENDENT and all four are computed: an implementation that stopped
 * at the first would report a re-bound quote and a foreign measurement
 * identically, and a checker that did the same could not tell the
 * corpus's four reject vectors apart.
 *
 * Note two of them co-fire BY CONSTRUCTION and that is not a defect: the
 * integrity value covers the measurement and the binding, so a vector
 * that edits either also fails to re-derive. The specification says so;
 * what matters is that the class the vector NAMES is among the ones
 * found.
 */
const attest = (doc) => {
  const q = doc.quote;
  // The quote's members up to but excluding `integrity`, in the order
  // §12.5 states them, under this file's own §4 encoder — the second
  // implementation, so a drifted emitter is caught rather than blessed.
  const sealed = enc.obj([
    ["format", enc.str(q.format)],
    ["measurement", enc.str(q.measurement)],
    ["bound", enc.str(q.bound)],
    ["notAfter", q.notAfter == null ? null : enc.int(q.notAfter)],
    ["body", enc.str(q.body)],
  ]);
  const integrity = createHash("sha256").update(Buffer.from(sealed, "utf8")).digest("hex");
  const bound = digestOfTree(doc.composition);
  const observedAt = doc.policy.observedAt;

  const faults = [];
  if (integrity !== q.integrity) faults.push("quote-unverifiable");
  if (bound !== q.bound) faults.push("binding-mismatched");
  if (!(doc.policy.measurements ?? []).includes(q.measurement)) faults.push("measurement-outside-policy");
  if (q.notAfter != null && !(observedAt < q.notAfter)) faults.push("quote-stale");

  return { integrity, bound, faults, windowed: q.notAfter != null };
};

const sameShape = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * §12.6 — the placement resolution, re-derived here from the section
 * text rather than read out of the vector. A vector states the region it
 * is sealed within and the routes that admitted its crossings; this
 * recomputes both from the placement and compares. A placement somebody
 * typed the answer into is a placement nobody resolved.
 */
const place = (doc) => {
  const regions = doc.placement?.regions ?? [];
  const routes = doc.placement?.routes ?? [];
  const regionOf = (site) => regions.find((r) => r.site === site)?.region;
  const routeFor = (from, to) => routes.find((r) => r.from === from && r.to === to);

  const unplaced = [];
  const crossings = [];
  const pinFaults = [];

  for (const f of doc.flows ?? []) {
    for (const site of [f.from, f.to]) {
      if (regionOf(site) === undefined && !unplaced.includes(site)) unplaced.push(site);
    }
    const a = regionOf(f.from);
    const b = regionOf(f.to);
    // A term that does not resolve yields no crossing: a fact derived from
    // one would be invented, and the missing region is already a fault.
    if (a === undefined || b === undefined) continue;
    if (f.pin != null && f.pin !== a) pinFaults.push(f.id);
    crossings.push({ id: f.id, from: a, to: b, route: routeFor(a, b)?.id, crosses: a !== b });
  }

  const faults = [];
  if (unplaced.length) faults.push("region-undeclared");
  if (crossings.some((c) => c.crosses && c.route === undefined)) faults.push("egress-undeclared");
  if (pinFaults.length) faults.push("pin-mismatched");

  const distinctRegions = [...new Set(crossings.flatMap((c) => [c.from, c.to]))];
  return {
    faults,
    crossings,
    flowCount: (doc.flows ?? []).length,
    distinctRegions,
    outcome: faults.length ? "refuse" : distinctRegions.length === 1 ? "sealed" : "routed",
    region: distinctRegions.length === 1 ? distinctRegions[0] : undefined,
    routes: [...new Set(crossings.map((c) => c.route).filter((r) => r !== undefined))].sort(cmpCodePoints),
  };
};

// ── §12.7, re-derived from the section text ──────────────────────────
//
// A SECOND implementation of the family's evaluation rule, written here
// from §12.7 rather than shared with emit.mjs's — the same triangulation
// the §4 encoder above gets and for the same reason. The results and the
// footprint triples in the vectors are derived by one implementation and
// checked by the other, so an evaluator that drifts is caught by the run
// that would otherwise bless it. This one works on rows as RECORDS keyed
// by column name where the emitter works on positional arrays, which is
// what keeps it a second reading of the text rather than a transcription
// of the first.

/** Key-order-independent structural equality — two renderings of one record must compare equal. */
const canon = (x) => {
  if (Array.isArray(x)) return "[" + x.map(canon).join(",") + "]";
  if (x && typeof x === "object") {
    return "{" + Object.keys(x).sort().map((k) => JSON.stringify(k) + ":" + canon(x[k])).join(",") + "}";
  }
  return JSON.stringify(x);
};

// §12.7 — a cell is an integer, a string, or the NULL cell a bounded-frame
// window's partition-leading row necessarily produces. Its boolean rides as the
// string §4.5 requires; there is no JSON `true` or `null` anywhere in the format.
const scalarOf = (c) => ("null" in c ? null : "int" in c ? c.int : c.string);
const cellOf = (v) =>
  v === null ? { null: "true" } : typeof v === "number" ? { int: v } : { string: v };

/** A vector's table read as records, keeping the column order and the declared types beside them. */
const readTable = (t) => ({
  names: t.columns.map((c) => c.name),
  types: new Map(t.columns.map((c) => [c.name, c.type])),
  rows: t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c.name, scalarOf(r.cells[i])]))),
});

const writeTable = (t) => ({
  columns: t.names.map((n) => ({ name: n, type: t.types.get(n) })),
  rows: t.rows.map((r) => ({ cells: t.names.map((n) => cellOf(r[n])) })),
});

const scalarIn = (e, row) => {
  if (e.expr === "column") {
    if (!(e.name in row)) throw new Error(`§12.7: no column "${e.name}"`);
    return row[e.name];
  }
  if (e.expr === "literal") return e.int;
  if (e.expr === "binary") {
    const l = scalarIn(e.left, row);
    const r = scalarIn(e.right, row);
    if (e.op === "greaterThan") return l > r;
    if (e.op === "multiply") return l * r;
    throw new Error(`§12.7: unregistered operator "${e.op}"`);
  }
  throw new Error(`§12.7: unregistered expression "${e.expr}"`);
};

/** The buckets a `groupBy` induces, in first-appearance order — a Map preserves insertion order. */
const bucketsOf = (step, t) => {
  const out = new Map();
  t.rows.forEach((r, i) => {
    const k = canon(step.keys.map((n) => r[n]));
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(i);
  });
  return out;
};

const aggregated = (fn, values) => {
  if (fn === "count") return values.length;
  if (fn === "sum") return values.reduce((x, y) => x + y, 0);
  if (fn === "first") return values[0];
  throw new Error(`§12.7: unregistered aggregate "${fn}"`);
};

/**
 * One step, and what it cost in ROW EVALUATIONS. A `groupBy`, a `sort`, a
 * `window` and a `join` cost none: not one of them evaluates an expression of
 * the algebra, so charging them would put two different things on one scale.
 */
const stepped = (step, t) => {
  if (step.verb === "filter") {
    return { cost: t.rows.length, out: { ...t, rows: t.rows.filter((r) => scalarIn(step.where, r) === true) } };
  }
  if (step.verb === "derive") {
    const rows = t.rows.map((r) => ({ ...r, [step.column]: scalarIn(step.value, r) }));
    const types = new Map(t.types);
    types.set(step.column, rows.every((r) => typeof r[step.column] === "number") ? "int" : "string");
    const names = t.names.includes(step.column) ? t.names : [...t.names, step.column];
    return { cost: t.rows.length, out: { names, types, rows } };
  }
  if (step.verb === "groupBy") {
    const buckets = bucketsOf(step, t);
    const names = [...step.keys, ...step.aggregates.map((a) => a.name)];
    const types = new Map();
    for (const k of step.keys) types.set(k, t.types.get(k));
    for (const a of step.aggregates) types.set(a.name, a.fn === "first" ? t.types.get(a.of) : "int");
    const rows = [...buckets.values()].map((idxs) => {
      const row = {};
      for (const k of step.keys) row[k] = t.rows[idxs[0]][k];
      for (const a of step.aggregates) row[a.name] = aggregated(a.fn, idxs.map((i) => t.rows[i][a.of]));
      return row;
    });
    return { cost: 0, out: { names, types, rows } };
  }
  if (step.verb === "sort") {
    const carried = t.rows.map((r, i) => [r, i]);
    carried.sort(([a, i], [b, j]) => {
      for (const by of step.by) {
        const raw = a[by.column] < b[by.column] ? -1 : a[by.column] > b[by.column] ? 1 : 0;
        const d = by.direction === "descending" ? -raw : raw;
        if (d !== 0) return d;
      }
      return i - j;
    });
    return { cost: 0, out: { ...t, rows: carried.map(([r]) => r) } };
  }
  if (step.verb === "window") {
    if (step.fn !== "lag") throw new Error(`§12.7: unregistered window function "${step.fn}"`);
    const partitions = new Map();
    t.rows.forEach((r, i) => {
      const k = canon(step.partitionBy.map((n) => r[n]));
      if (!partitions.has(k)) partitions.set(k, []);
      partitions.get(k).push(i);
    });
    // The partition-leading row has no predecessor, so its frame value is
    // absent. That null is what the frame says, not an edge case to tidy.
    const framed = t.rows.map(() => null);
    for (const idxs of partitions.values()) {
      const ordered = [...idxs].sort((x, y) => {
        for (const by of step.orderBy) {
          const a = t.rows[x][by.column];
          const b = t.rows[y][by.column];
          const d = (a < b ? -1 : a > b ? 1 : 0) * (by.direction === "descending" ? -1 : 1);
          if (d !== 0) return d;
        }
        return x - y;
      });
      ordered.forEach((row, pos) => {
        framed[row] = pos === 0 ? null : t.rows[ordered[pos - 1]][step.of];
      });
    }
    const types = new Map(t.types);
    // The appended column carries the type of the column it READS — never one
    // inferred from its values, or a partition-leading null would decide it.
    types.set(step.as, t.types.get(step.of));
    return {
      cost: 0,
      out: {
        names: t.names.includes(step.as) ? t.names : [...t.names, step.as],
        types,
        // Emitted in the order they were handed over, one for one.
        rows: t.rows.map((r, i) => ({ ...r, [step.as]: framed[i] })),
      },
    };
  }
  if (step.verb === "join") {
    if (step.how !== "semi") throw new Error(`§12.7: unregistered join kind "${step.how}"`);
    const right = readTable(step.source);
    const keys = new Set(right.rows.map((r) => canon(step.on.map((p) => r[p.right]))));
    return {
      cost: 0,
      out: { ...t, rows: t.rows.filter((r) => keys.has(canon(step.on.map((p) => r[p.left])))) },
    };
  }
  throw new Error(`§12.7: unregistered verb "${step.verb}"`);
};

const wholePipeline = (pipeline, t) => {
  let cur = t;
  let cost = 0;
  for (const step of pipeline) {
    const s = stepped(step, cur);
    cost += s.cost;
    cur = s.out;
  }
  return { table: cur, cost };
};

/**
 * §12.7 — the pipeline's incrementality, before any evaluation happens.
 *
 * Propagating: a step whose output for a named row is that row's own function
 * (`filter`, `derive`), and a step that computes nothing per row and merely
 * REORDERS (`sort`) — the row's cells are unchanged and its position is
 * recovered by merging the named rows into the previous order.
 *
 * Declining: a step that computes a row's value from OTHER ROWS (`window`, over
 * a frame of the row's neighbours) or from a relation the stream describes
 * nothing about (`join`).
 */
const planOf = (pipeline) => {
  for (let i = 0; i < pipeline.length; i++) {
    const verb = pipeline[i].verb;
    if (verb === "filter" || verb === "derive" || verb === "sort") continue;
    if (verb === "groupBy") {
      if (i === pipeline.length - 1) continue;
      return { strategy: "referenceOnly", reason: "aggregateStepNotLast", verb };
    }
    return { strategy: "referenceOnly", reason: "stepNotRowLocal", verb };
  }
  const tail = pipeline.length ? pipeline[pipeline.length - 1].verb : null;
  return { strategy: tail === "groupBy" ? "rowLocalThenGroups" : "rowLocal" };
};

/** §12.7 — the positions in the ORIGINAL source that an edit stream addresses, under its own scheme. */
const addressedPositions = (source, edits) => {
  const rows = source.rows;
  return edits.ops
    .filter((o) => o.op !== "appendRow")
    .map((o) =>
      edits.scheme === "ordinal"
        ? Number(o.row)
        : rows.findIndex((r) => String(r[edits.key]) === o.row),
    );
};

const edited = (source, edits) => {
  let rows = source.rows.map((r) => ({ ...r }));
  const named = new Set();
  const at = (ref) => {
    const i =
      edits.scheme === "ordinal" ? Number(ref) : rows.findIndex((r) => String(r[edits.key]) === ref);
    if (!Number.isInteger(i) || i < 0 || i >= rows.length) {
      throw new Error(`§12.7: the edit stream names row "${ref}", which the source does not carry`);
    }
    return i;
  };
  for (const o of edits.ops) {
    if (o.op === "setCell") {
      const i = at(o.row);
      rows[i] = { ...rows[i], [o.column]: scalarOf(o.value) };
      if (edits.scheme === "identity") named.add(String(rows[i][edits.key]));
    } else if (o.op === "appendRow") {
      if (o.cells.length !== source.names.length) {
        throw new Error("§12.7: an appended row carries a different number of cells from the source's columns");
      }
      const r = Object.fromEntries(source.names.map((n, k) => [n, scalarOf(o.cells[k])]));
      rows = [...rows, r];
      if (edits.scheme === "identity") named.add(String(r[edits.key]));
    } else if (o.op === "removeRow") {
      const i = at(o.row);
      if (edits.scheme === "identity") named.add(String(rows[i][edits.key]));
      rows = rows.filter((_, k) => k !== i);
    } else {
      throw new Error(`§12.7: unregistered edit op "${o.op}"`);
    }
  }
  return { after: { ...source, rows }, named };
};

/**
 * §12.7 — the whole rule for one vector: the changed source, the result a
 * full evaluation over it produces, and the three footprints. Nothing
 * here is read out of the vector's `expect`.
 */
const recompute = (doc) => {
  const source = readTable(doc.source);
  const plan = planOf(doc.pipeline);
  const { after, named } = edited(source, doc.edits);
  const primed = wholePipeline(doc.pipeline, source);
  const full = wholePipeline(doc.pipeline, after);

  const declined = plan.strategy === "referenceOnly";
  // A `fullRecompute` is counted on the SAME scale as everything else: what the
  // reference evaluator itself evaluated over the changed source. Reading it off
  // `sourceRows` charged a declined evaluation for one pass, so it compared as
  // having done less work than the full evaluation it fell back to.
  const fellBack = (reason, verb) =>
    verb === undefined
      ? { kind: "fullRecompute", rowsEvaluated: full.cost, reason }
      : { kind: "fullRecompute", rowsEvaluated: full.cost, reason, verb };

  let refresh;
  if (declined) {
    refresh = fellBack(plan.reason, plan.verb);
  } else if (doc.edits.scheme === "ordinal") {
    refresh = fellBack("ordinalAddressing");
  } else if (!doc.edits.ops.length) {
    refresh = { kind: "reusedPrior" };
  } else {
    let cur = { ...after, rows: after.rows.filter((r) => named.has(String(r[doc.edits.key]))) };
    let cost = 0;
    let groupStep = null;
    for (const step of doc.pipeline) {
      if (step.verb === "groupBy") {
        groupStep = step;
        break;
      }
      const s = stepped(step, cur);
      cost += s.cost;
      cur = s.out;
    }
    if (!groupStep) {
      refresh = { kind: "rowsRecomputed", rowsEvaluated: cost };
    } else {
      // A group is recomputed where its ORDERED membership moved, never
      // merely because a row in it was named: `first` and a floating sum
      // both move when members are only reordered.
      const prefix = doc.pipeline.slice(0, doc.pipeline.indexOf(groupStep));
      const membership = (t) => {
        const p = wholePipeline(prefix, t).table;
        return new Map(
          [...bucketsOf(groupStep, p)].map(([k, idxs]) => [k, idxs.map((i) => String(p.rows[i][doc.edits.key]))]),
        );
      };
      const was = membership(source);
      const now = membership(after);
      let groupsRecomputed = 0;
      for (const k of new Set([...was.keys(), ...now.keys()])) {
        if (canon(was.get(k)) !== canon(now.get(k))) groupsRecomputed += 1;
      }
      refresh = { kind: "groupsRecomputed", rowsEvaluated: cost, groupsRecomputed };
    }
  }

  const resultRows = full.table.rows.length;
  return {
    plan,
    result: writeTable(full.table),
    // A PRIME IS `primed`, declined pipeline or not: there was no prior state to
    // fall back FROM, and a prime evaluates everything whatever the plan says.
    // The decline attaches to the refresh, which is where a fall-back happens.
    prime: {
      sourceRows: source.rows.length,
      resultRows: primed.table.rows.length,
      recompute: { kind: "primed", rowsEvaluated: primed.cost },
    },
    full: {
      sourceRows: after.rows.length,
      resultRows,
      recompute: { kind: "primed", rowsEvaluated: full.cost },
    },
    refresh: { sourceRows: after.rows.length, resultRows, recompute: refresh },
    resultRows,
  };
};

/**
 * §12.1 / §12.2 — the discriminator table. Each entry answers one
 * question: given this vector's own content, is the claimed value
 * actually exhibited? A demonstration nothing discriminates is an
 * assertion with a fixture next to it.
 */
const discriminators = {
  "delivery/atMostOnce": (v) =>
    v.kind === "kill-and-replay" &&
    v.run.killedStep.step === "perform" &&
    v.led().invocations === 1 &&
    v.led().delivered === 0,
  "delivery/atLeastOnce": (v) =>
    v.kind === "kill-and-replay" && v.run.killedStep.step === "perform" && v.led().invocations === 2 && v.led().delivered >= 1,
  "delivery/exactlyOnceEffective": (v) =>
    v.kind === "kill-and-replay" &&
    v.run.killedStep.step === "perform" &&
    v.run.killedStep.dedupe === "store" &&
    v.led().invocations === 2 &&
    v.led().delivered === 1,
  "idempotency/idempotent": (v) =>
    v.kind === "kill-and-replay" &&
    v.run.killedStep.dedupe === "repeatable" &&
    v.led().invocations > 1 &&
    v.led().delivered === 1,
  "idempotency/idempotentWithStore": (v) =>
    v.kind === "kill-and-replay" && v.run.killedStep.dedupe === "store" && v.led().invocations > 1 && v.led().delivered === 1,
  "idempotency/nonIdempotent": (v) =>
    v.kind === "kill-and-replay" && v.run.performers.some((p) => p.invocations > 1 && p.delivered === p.invocations),
  "restart/lostOnRestart": (v) =>
    v.kind === "kill-and-replay" && v.run.killedStep.journaled === "false" && v.led().invocations === 1,
  "restart/retriedAfterRestart": (v) =>
    v.kind === "kill-and-replay" && v.run.killedStep.journaled === "true" && v.led().invocations === 2,
  "convergence/convergentFold": (v) =>
    v.kind === "partition-and-fold" &&
    (v.doc.expect.outcome === "folded"
      ? v.run.interference.length === 0
      : v.entry.reject === "fold-conflict" && v.run.interference.length > 0),
  "convergence/singleWriter": (v) =>
    v.kind === "partition-and-fold" &&
    v.doc.expect.outcome === "refuse" &&
    v.entry.reject === "concurrent-authorship-unsupported" &&
    v.run.laneCount > 1 &&
    v.run.interference.length === 0,
  // Evidence with NO window: it says what was launched. A vector
  // carrying a window would be demonstrating the stronger value while
  // claiming the weaker one, which reads as modesty and is a claim
  // nothing separates from its neighbour.
  "attestation/attestedAtLaunch": (v) =>
    v.kind === "attestation-quote" && v.doc.expect.outcome === "attested" && !v.run.windowed && v.run.faults.length === 0,
  // Evidence INSIDE its window. The paired stale vector is required
  // separately, below, because it is a property of the corpus rather
  // than of this vector's own content.
  "attestation/attestedWithinWindow": (v) =>
    v.kind === "attestation-quote" && v.doc.expect.outcome === "attested" && v.run.windowed && v.run.faults.length === 0,
  // NOTHING crosses a boundary. The flow count is load-bearing: a vector
  // declaring one region and carrying no flow at all would satisfy every
  // other clause here while demonstrating that a placement with nothing
  // in it stays where it is. The paired vector is required separately,
  // below, because it is a property of the corpus rather than of this
  // vector's own content.
  "locality/regionSealed": (v) =>
    v.kind === "placement-locality" &&
    v.doc.expect.outcome === "sealed" &&
    v.run.faults.length === 0 &&
    v.run.flowCount > 0 &&
    v.run.distinctRegions.length === 1,
  // A boundary IS crossed, and every crossing carries a route. Both
  // halves: a vector where nothing crossed would demonstrate the value
  // above wearing this one's label, and one where a crossing went
  // unadmitted is a refusal rather than a demonstration.
  "locality/regionRouted": (v) =>
    v.kind === "placement-locality" &&
    v.doc.expect.outcome === "routed" &&
    v.run.faults.length === 0 &&
    v.run.crossings.some((c) => c.crosses) &&
    v.run.crossings.filter((c) => c.crosses).every((c) => c.route !== undefined),
  // Every clause reads the RE-DERIVED run rather than the vector's own
  // `expect`, which the loop has already compared against it. A
  // discriminator that read the recorded numbers would be asking the
  // vector whether the vector is right.
  //
  // The evaluator recomputes everything, and SAYS WHY. The reason is the
  // load-bearing half: a decline with no reason is indistinguishable
  // from an evaluator that never tried, and this family's rule derives
  // the reason rather than accepting one.
  "recompute/fullOnChange": (v) =>
    v.kind === "incremental-recompute" &&
    v.run.refresh.recompute.kind === "fullRecompute" &&
    typeof v.run.refresh.recompute.reason === "string",
  // Fewer row-evaluations than the full evaluation over the SAME changed
  // source. Strictly fewer is the whole claim: an evaluator that
  // recomputed everything and reported it as row-local would satisfy
  // every other clause here. The paired ordinal vector is required
  // separately, below, because it is a property of the corpus rather
  // than of this vector's own content.
  "recompute/rowLocal": (v) =>
    v.kind === "incremental-recompute" &&
    v.run.plan.strategy === "rowLocal" &&
    v.run.refresh.recompute.kind === "rowsRecomputed" &&
    v.run.refresh.recompute.rowsEvaluated < v.run.full.recompute.rowsEvaluated,
  // The same claim one level up, and with one clause the row case does
  // not have: FEWER GROUPS than the result carries. Without it, an
  // evaluator that recomputed every group would report `groupsRecomputed`
  // truthfully and have maintained nothing.
  "recompute/groupLocal": (v) =>
    v.kind === "incremental-recompute" &&
    v.run.plan.strategy === "rowLocalThenGroups" &&
    v.run.refresh.recompute.kind === "groupsRecomputed" &&
    v.run.refresh.recompute.groupsRecomputed < v.run.resultRows &&
    v.run.refresh.recompute.rowsEvaluated < v.run.full.recompute.rowsEvaluated,
};

const passing = [];

for (const entry of manifest.vectors ?? []) {
  if (!(entry.family in facetFamilies)) continue;
  const id = entry.id;
  let ok = true;
  const bad = (m) => {
    ok = false;
    fail(`${id}: ${m}`);
  };

  let doc;
  try {
    doc = JSON.parse(readFileSync(join(here, entry.file), "utf8"));
  } catch (e) {
    fail(`${id}: could not read "${entry.file}" — ${e.message}`);
    continue;
  }

  if (doc.family !== entry.family) bad(`the document names family "${doc.family}", the manifest says "${entry.family}"`);
  if (entry.kind !== "hash" && entry.kind !== "reject") bad(`a facet vector is kind hash or reject, not ${JSON.stringify(entry.kind)}`);
  if (entry.kind === "reject" && entry.detect !== "runtime") {
    bad(`a facet reject vector is detected at the runtime layer; the manifest says ${JSON.stringify(entry.detect)}`);
  }
  if (entry.kind === "reject" && doc.expect.outcome !== "refuse") bad("the manifest calls it a reject vector and the document expects an outcome");
  if (entry.kind === "hash" && doc.expect.outcome === "refuse") bad("the document expects a refusal and the manifest does not call it a reject vector");

  // A profile another home publishes (profileHomes, §8.5) carries its facet
  // scope and its declaration THERE, so this home checks everything the
  // vector's own content decides and leaves whether the declaration honours
  // it to the home that publishes the declaration.
  const declaredElsewhere = !(entry.profile in declarations) && entry.profile in (manifest.profileHomes ?? {});
  const familyScope = Object.entries(facetProfiles)
    .filter(([, fams]) => fams.includes(entry.family))
    .map(([p]) => p);
  if (!declaredElsewhere && !familyScope.includes(entry.profile)) {
    bad(`its profile "${entry.profile}" is not in scope of facet family "${entry.family}"`);
  }

  let run;
  if (entry.family === "kill-and-replay") {
    run = replay(doc);
    if (run.atStep < 1 || run.atStep > doc.session.steps.length) bad(`the kill point names step ${run.atStep}, which the session does not have`);
    else if (doc.expect.outcome === "replayed") {
      // The family invariant: a clean replay reproduces the projection the
      // un-killed run would have produced, byte for byte.
      if (run.divergent) bad("it claims a clean replay, but a step in flight at the kill leaves no record and cannot be recovered");
      const got = digestOfTree(run.projection);
      if (got !== doc.expect.projection) bad(`the post-replay projection hashes to ${got}, the document records ${doc.expect.projection}`);
    } else if (entry.reject === "replay-divergent" && !run.divergent) {
      // A reject vector that is not actually divergent certifies nothing:
      // an implementation passes it by refusing a document that was fine.
      bad("it is the divergent-replay falsifier and its replay is NOT divergent, so refusing it demonstrates nothing");
    }
    if (doc.expect.projection != null && doc.expect.outcome === "refuse") bad("a refused run records a projection it never produced");
    if (!sameShape(run.performers, doc.expect.performers ?? [])) {
      bad(`the effect ledger recomputes to ${JSON.stringify(run.performers)}, the document records ${JSON.stringify(doc.expect.performers)}`);
    }
  } else if (entry.family === "attestation-quote") {
    run = attest(doc);
    if (run.integrity !== doc.quote.integrity && entry.reject !== "quote-unverifiable") {
      bad(
        `the quote's integrity re-derives to ${run.integrity} and the document records ${doc.quote.integrity} — ` +
          "a value nobody can recompute is a value nobody checked",
      );
    }
    if (doc.expect.outcome === "attested") {
      if (run.faults.length) bad(`it expects an attested outcome and its own content exhibits ${run.faults.join(", ")}`);
    } else if (!run.faults.includes(entry.reject)) {
      // A reject vector that does not exhibit its own fault is passed by
      // refusing a scenario that was fine, which demonstrates nothing.
      bad(
        `it is the ${entry.reject} falsifier and its own content does not exhibit that fault` +
          (run.faults.length ? ` (it exhibits ${run.faults.join(", ")})` : " (it exhibits none at all)"),
      );
    }
  } else if (entry.family === "placement-locality") {
    run = place(doc);
    if (!run.flowCount) bad("a locality vector carries no flow, so nothing it declares is about any data moving anywhere");
    if (run.outcome !== doc.expect.outcome) {
      bad(`its placement resolves to outcome "${run.outcome}" and the document records "${doc.expect.outcome}"`);
    }
    if (doc.expect.outcome === "sealed" && doc.expect.region !== run.region) {
      bad(`it is sealed within "${run.region}" and the document records ${JSON.stringify(doc.expect.region)}`);
    }
    if (doc.expect.outcome === "routed" && JSON.stringify(doc.expect.routes ?? []) !== JSON.stringify(run.routes)) {
      bad(`its crossings are admitted by ${JSON.stringify(run.routes)} and the document records ${JSON.stringify(doc.expect.routes)}`);
    }
    if (doc.expect.outcome !== "sealed" && doc.expect.region != null) bad("a vector that is not sealed records a region it is not sealed within");
    if (doc.expect.outcome !== "routed" && doc.expect.routes != null) bad("a vector that is not routed records the routes that admitted it");
    if (doc.expect.outcome === "refuse" && !run.faults.includes(entry.reject)) {
      // Same trap as the other families': a reject vector that does not
      // exhibit its fault is passed by refusing a placement that was fine.
      bad(
        `it is the ${entry.reject} falsifier and its own content does not exhibit that fault` +
          (run.faults.length ? ` (it exhibits ${run.faults.join(", ")})` : " (it exhibits none at all)"),
      );
    }
  } else if (entry.family === "incremental-recompute") {
    try {
      run = recompute(doc);
    } catch (e) {
      bad(`its own content could not be evaluated — ${e.message}`);
      // A shape rather than null: the discriminators below still run
      // over this view, and a checker that threw here would report a
      // crash where it had found a defect.
      run = {
        plan: {},
        result: null,
        resultRows: -1,
        prime: { recompute: {} },
        full: { recompute: {} },
        refresh: { recompute: {} },
        unevaluated: true,
      };
    }
    if (!run.unevaluated) {
      if (doc.expect.outcome !== "equivalent") {
        bad(`a vector of this family records the outcome "equivalent"; the document records ${JSON.stringify(doc.expect.outcome)}`);
      }
      // The RESULT, re-derived. A result somebody typed the answer into
      // is a result nobody evaluated — and this is the one the family's
      // whole pass criterion rests on, since a refresh is graded against
      // it and nothing else.
      if (canon(run.result) !== canon(doc.expect.result)) {
        bad(
          "a full evaluation over the changed source does not produce the result the document records:\n" +
            `      derived : ${JSON.stringify(run.result)}\n` +
            `      recorded: ${JSON.stringify(doc.expect.result)}`,
        );
      }
      for (const leg of ["prime", "full", "refresh"]) {
        if (canon(run[leg]) !== canon(doc.expect[leg])) {
          bad(
            `the ${leg} footprint recomputes to ${JSON.stringify(run[leg])}, the document records ` +
              JSON.stringify(doc.expect[leg]),
          );
        }
      }
    }
  } else {
    run = fold(doc);
    if (run.laneCount < 2) bad("a fold vector carries fewer than two lanes with ops, so there is no divergence to fold");
    if (doc.expect.outcome === "folded") {
      if (run.interference.length) bad(`it expects a fold and its lanes interfere: ${run.interference.join("; ")}`);
      const got = digestOfTree(run.tree);
      if (got !== doc.expect.fold) bad(`the fold hashes to ${got}, the document records ${doc.expect.fold}`);
    } else {
      if (doc.expect.fold != null) bad("a refused fold records a result it never produced");
      if (entry.reject === "fold-conflict" && !run.interference.length) {
        bad("it is the conflict falsifier and its lanes do NOT interfere, so halting on it demonstrates nothing");
      }
      if (entry.reject === "concurrent-authorship-unsupported" && run.interference.length) {
        bad(
          "it is the single-writer falsifier and its lanes interfere — so a holder that refuses it may be refusing the " +
            "conflict rather than the concurrency, which is a different claim",
        );
      }
    }
  }

  const led = () => {
    const p = run.performers?.find((x) => x.performer === run.killedStep?.performer);
    return p ?? { invocations: -1, delivered: -1 };
  };
  const view = { kind: entry.family, entry, doc, run, led };

  const demonstrates = doc.demonstrates ?? [];
  const seen = new Set();
  for (const claim of demonstrates) {
    const key = `${claim.axis}/${claim.value}`;
    if (seen.has(key)) bad(`demonstrates ${key} twice`);
    seen.add(key);
    if (!(claim.axis in axes) || !axes[claim.axis].includes(claim.value)) {
      bad(`demonstrates ${key}, which is not a registered facet value`);
      continue;
    }
    if (!(facetFamilies[entry.family].exercises ?? []).includes(claim.axis)) {
      bad(`demonstrates an axis "${claim.axis}" its family does not exercise`);
      continue;
    }
    if (withoutDiscriminator.has(key)) {
      bad(`demonstrates ${key}, for which §12 states no discriminator (${withoutDiscriminator.get(key)})`);
      continue;
    }
    const d = discriminators[key];
    if (!d) {
      bad(`demonstrates ${key}, and this checker holds no discriminator for it — a claim nothing separates is not a demonstration`);
      continue;
    }
    if (!d(view)) bad(`declares it demonstrates ${key}, and its own content does not exhibit that value`);
    // The corpus and the declarations must not drift apart in either
    // direction: a demonstration of a value its own profile does not
    // honour is an oracle for a claim nobody makes.
    const honoured = declarations[entry.profile]?.[claim.axis]?.honoured ?? [];
    if (!declaredElsewhere && !honoured.includes(claim.value)) {
      bad(`demonstrates ${key} for profile "${entry.profile}", whose declaration does not honour that value`);
    }
  }

  if (ok) passing.push({ entry, demonstrates });
}

// Two vectors carrying the same lanes must fold the same way, whatever
// order the lanes arrived in. This is the control that separates a fold
// from a concatenation, generalised: it holds over any such pair the
// corpus happens to carry rather than over two ids named here.
{
  const byLanes = new Map();
  for (const entry of manifest.vectors ?? []) {
    if (entry.family !== "partition-and-fold") continue;
    let doc;
    try {
      doc = JSON.parse(readFileSync(join(here, entry.file), "utf8"));
    } catch {
      continue;
    }
    if (doc.expect.outcome !== "folded") continue;
    const key = JSON.stringify([
      doc.base,
      [...doc.lanes].sort((a, b) => cmpCodePoints(a.lane, b.lane)),
    ]);
    if (!byLanes.has(key)) byLanes.set(key, []);
    byLanes.get(key).push({ entry, doc });
  }
  for (const group of byLanes.values()) {
    if (group.length < 2) continue;
    const first = group[0];
    for (const other of group.slice(1)) {
      if (other.doc.expect.fold !== first.doc.expect.fold) {
        fail(
          `${other.entry.id} and ${first.entry.id} carry the same lanes and record different folds — ` +
            "the fold depends on the order the lanes arrived in, which is the hazard the family exists to exclude",
        );
      }
      if (readFileSync(join(here, other.entry.file)).equals(readFileSync(join(here, first.entry.file)))) {
        fail(`${other.entry.id} and ${first.entry.id} are byte-identical, so the pair separates nothing`);
      }
    }
  }
}

// §12.2 — BOTH HALVES OF `convergentFold`, which no single vector can
// carry either.
//
// §11.1 states the value as two things: divergent streams fold to one
// composition every holder computes identically, AND interference halts
// with a named class instead of being resolved silently. The
// discriminator above is per-vector and therefore satisfied by either
// half alone, which leaves the realistic hole: a holder that folds
// correctly and resolves interference by taking the later stamp
// reproduces every folding vector byte for byte and is exactly what the
// second half exists to refuse. So the rule is stated over a PROFILE'S
// SCOPE, on the same shape as the window pair below.
{
  for (const [profile, decl] of Object.entries(declarations)) {
    if (!(decl.convergence?.honoured ?? []).includes("convergentFold")) continue;

    const support = passing.filter(
      (p) =>
        p.entry.profile === profile &&
        p.entry.family === "partition-and-fold" &&
        p.demonstrates.some((d) => d.axis === "convergence" && d.value === "convergentFold"),
    );
    const folds = support.filter((p) => !p.entry.reject);
    const halts = support.filter((p) => p.entry.reject === "fold-conflict");

    if (!folds.length || !halts.length) {
      fail(
        `facet-undemonstrated: profile "${profile}" declares convergence=convergentFold and demonstrates ` +
          `${folds.length ? "only the folding half" : "no folding half"} — ` +
          `${halts.length ? "" : "no passing vector in its scope halts with fold-conflict. "}` +
          "§12.2 requires both, because a holder that folds correctly and resolves interference by taking the " +
          "later stamp passes every folding vector byte for byte",
      );
    }
  }
}

// §12.5 — the two corpus-level rules the family states, which no single
// vector can carry.
{
  const quotes = [];
  for (const entry of manifest.vectors ?? []) {
    if (entry.family !== "attestation-quote") continue;
    try {
      quotes.push({ entry, doc: JSON.parse(readFileSync(join(here, entry.file), "utf8")) });
    } catch {
      /* the read failure is already reported above */
    }
  }

  if (quotes.length) {
    // (1) THE WINDOW PAIR. A verifier that ignores the window
    // reproduces the in-window vector perfectly; only the pair
    // separates it from one that checks. The pair must differ in the
    // observation instant and in NOTHING else — one that also moved the
    // measurement would be separating something else.
    for (const { entry, doc } of quotes) {
      const claimsWindow = (doc.demonstrates ?? []).some((d) => d.axis === "attestation" && d.value === "attestedWithinWindow");
      if (!claimsWindow) continue;
      const partner = quotes.find(
        (o) =>
          o.entry.id !== entry.id &&
          o.entry.reject === "quote-stale" &&
          JSON.stringify(o.doc.quote) === JSON.stringify(doc.quote) &&
          JSON.stringify(o.doc.composition) === JSON.stringify(doc.composition),
      );
      if (!partner) {
        fail(
          `${entry.id}: demonstrates attestation/attestedWithinWindow and the corpus carries no vector with the SAME quote ` +
            "observed from outside the window and refused as quote-stale — without the pair, a verifier that never checks " +
            "the window passes this vector exactly as one that does",
        );
        continue;
      }
      const differs = Object.keys({ ...doc.policy, ...partner.doc.policy }).filter(
        (k) => JSON.stringify(doc.policy[k]) !== JSON.stringify(partner.doc.policy[k]),
      );
      if (differs.length !== 1 || differs[0] !== "observedAt") {
        fail(
          `${entry.id} and ${partner.entry.id} are the window pair and differ in ${differs.join(", ") || "nothing"} — ` +
            "the pair separates a checked window from an ignored one only when the observation instant is the ONLY thing that moved",
        );
      }
    }

    // (2) MORE THAN ONE FORMAT. The family's claim is that the binding,
    // the measurement and the window are format-independent facts; a
    // corpus carrying one format certifies independence with nothing to
    // be independent of.
    const formats = new Set(quotes.map((q) => q.doc.quote?.format));
    if (formats.size < 2) {
      fail(
        `the attestation-quote family carries ${formats.size} quote format(s) — §12.5 requires more than one, because a ` +
          "family certifying format-independence with a single format has nothing to be independent of",
      );
    }
  }
}

// §12.6 — the two corpus-level rules the locality family states, which
// no single vector can carry either. Both are the §12.5 window-pair
// argument at a different boundary: an evaluator that never resolves a
// region reproduces each positive vector perfectly, and only a
// perturbation that HOLDS EVERYTHING ELSE STILL separates it from one
// that does.
{
  const locality = [];
  for (const entry of manifest.vectors ?? []) {
    if (entry.family !== "placement-locality") continue;
    try {
      locality.push({ entry, doc: JSON.parse(readFileSync(join(here, entry.file), "utf8")) });
    } catch {
      /* the read failure is already reported above */
    }
  }

  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const egressRejects = locality.filter((o) => o.entry.reject === "egress-undeclared");

  for (const { entry, doc } of locality) {
    const claims = (value) => (doc.demonstrates ?? []).some((d) => d.axis === "locality" && d.value === value);

    // (1) THE ROUTE PAIR. Same composition, same regions, same flows;
    // the route is the only thing that moved. Without it, an evaluator
    // that admits every crossing passes the routed vector exactly as one
    // that looks the route up.
    if (claims("regionRouted")) {
      const partner = egressRejects.find(
        (o) =>
          o.entry.id !== entry.id &&
          same(o.doc.composition, doc.composition) &&
          same(o.doc.flows, doc.flows) &&
          same(o.doc.placement.regions, doc.placement.regions) &&
          !same(o.doc.placement.routes, doc.placement.routes),
      );
      if (!partner) {
        fail(
          `${entry.id}: demonstrates locality/regionRouted and the corpus carries no vector with the SAME placement ` +
            "and flows whose route is removed and which is refused as egress-undeclared — without the pair, an " +
            "evaluator that admits every crossing passes this vector exactly as one that checks the route",
        );
      }
    }

    // (2) THE BOUNDARY PAIR. Same composition, same flows; a site moved
    // across a border. Without it, an evaluator that never resolves a
    // region at all answers "sealed" and is right every time it is asked.
    if (claims("regionSealed")) {
      const partner = egressRejects.find(
        (o) =>
          o.entry.id !== entry.id &&
          same(o.doc.composition, doc.composition) &&
          same(o.doc.flows, doc.flows) &&
          !same(o.doc.placement.regions, doc.placement.regions),
      );
      if (!partner) {
        fail(
          `${entry.id}: demonstrates locality/regionSealed and the corpus carries no vector with the SAME composition ` +
            "and flows under a placement that moves a site across a boundary and is refused as egress-undeclared — " +
            "without the pair, an evaluator that never resolves a region answers sealed and is never caught",
        );
      }
    }
  }
}

// §12.7 — THE RE-ADDRESSING PAIR, which no single vector can carry
// either, and which is stated over a PROFILE'S SCOPE on the same shape
// as the `convergentFold` rule above rather than per vector.
//
// An evaluator that read an edit stream's ops and ignored its addressing
// SCHEME reproduces every row-local vector byte for byte, and is wrong
// the first time a row is inserted above one it had cached. Only the
// same scenario re-addressed separates it from one that reads the
// scheme — same composition, same pipeline, same source, the same row
// named — so the perturbation has to hold everything else still. Stating
// it per vector would demand a partner for each, which would be a corpus
// of pairs rather than a corpus with a control in it.
{
  // Every profile that declares rowLocal here, and every profile whose passing
  // vectors demonstrate it — so the pair is still required of a profile whose
  // declaration another home publishes.
  const claimsRowLocal = (p) => p.demonstrates.some((d) => d.axis === "recompute" && d.value === "rowLocal");
  const rowLocalProfiles = new Set([
    ...Object.entries(declarations)
      .filter(([, decl]) => (decl.recompute?.honoured ?? []).includes("rowLocal"))
      .map(([profile]) => profile),
    ...passing.filter(claimsRowLocal).map((p) => p.entry.profile),
  ]);
  for (const profile of rowLocalProfiles) {
    const inScope = passing.filter(
      (p) => p.entry.profile === profile && p.entry.family === "incremental-recompute",
    );
    const docOf = (p) => JSON.parse(readFileSync(join(here, p.entry.file), "utf8"));
    const local = inScope.filter((p) =>
      p.demonstrates.some((d) => d.axis === "recompute" && d.value === "rowLocal"),
    );

    let paired = false;
    for (const p of local) {
      const doc = docOf(p);
      const source = readTable(doc.source);
      const here_ = canon(addressedPositions(source, doc.edits));
      paired ||= inScope.some((o) => {
        if (o.entry.id === p.entry.id) return false;
        const other = docOf(o);
        if (other.edits.scheme !== "ordinal") return false;
        if (canon(other.composition) !== canon(doc.composition)) return false;
        if (canon(other.pipeline) !== canon(doc.pipeline)) return false;
        if (canon(other.source) !== canon(doc.source)) return false;
        if (other.expect.refresh.recompute.reason !== "ordinalAddressing") return false;
        return canon(addressedPositions(readTable(other.source), other.edits)) === here_;
      });
    }

    if (local.length && !paired) {
      fail(
        `facet-undemonstrated: profile "${profile}" declares recompute=rowLocal and the corpus carries no ` +
          "vector with the SAME composition, pipeline, source and named row re-addressed by ordinal and " +
          "declining as ordinalAddressing — without the pair, an evaluator that reads the ops and ignores " +
          "the scheme passes every row-local vector exactly as one that reads it",
      );
    }
  }
}

// ── §11.3 the demonstrability rule ───────────────────────────────────
//
// The whole point. Everything above establishes which vectors PASS; this
// asks whether every declared value has one.

const certified = [];
for (const [profile, decl] of Object.entries(declarations)) {
  for (const axis of Object.keys(axes)) {
    for (const value of decl[axis]?.honoured ?? []) {
      const support = passing.filter(
        (p) => p.entry.profile === profile && p.demonstrates.some((d) => d.axis === axis && d.value === value),
      );
      if (!support.length) {
        fail(
          `facet-undemonstrated: profile "${profile}" declares ${axis}=${value}, and no PASSING vector in a facet ` +
            "family scoped to that profile demonstrates it (§11.3)",
        );
      } else {
        certified.push(`${profile} ${axis}=${value} (${support.map((s) => s.entry.id).join(", ")})`);
      }
    }
  }
}

if (failures.length) {
  console.error(`facet certification failed (${failures.length}):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`facet certification: every declared value is demonstrated by a passing vector.`);
for (const c of certified) console.log(`  ${c}`);
for (const [profile, decl] of Object.entries(declarations)) {
  const empty = Object.keys(axes).filter((a) => !(decl[a]?.honoured ?? []).length);
  if (empty.length) console.log(`  ${profile} declares nothing on ${empty.join(", ")} — a statement, with its reason in the manifest`);
}
