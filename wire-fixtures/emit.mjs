// SPDX-License-Identifier: Apache-2.0
//
// A second, deliberately minimal emitter for the app-composition
// conformance corpus — written against APP_COMPOSITION_WIRE.md and the
// documents beside it alone, in a different language and runtime from any
// reference implementation.
//
// Its job is triangulation, not coverage. One emitter cannot tell its own
// accidents from the format: whatever it happens to do becomes "the
// format" simply because it is the only thing producing bytes, and the
// corpus then records the accident as though it were the rule. So this
// script takes the same compositions as UNSORTED, UNDECORATED input
// models — members in whatever order was convenient to type, optional
// members spelled `null` — applies the ordering, omission and encoding
// rules as the specification states them, and compares its output byte
// for byte against the committed fixtures.
//
// A divergence is a SPECIFICATION defect by definition: either a rule is
// missing, or a rule that is stated is not the rule being followed. It is
// not fixed in either emitter before asking what the text left open.
//
// Zero dependencies; Node's own crypto and fs only.
//
//   node emit.mjs             # check against the committed corpus
//   node emit.mjs --write     # rewrite the round-trip vectors and the
//                             # manifest's derived sha256 fields
//   node emit.mjs --self-test # prove this checker can go red
//
// REJECT AND ACCEPT VECTORS ARE NOT EMITTED. A reject vector is a
// document a reader must refuse, so reproducing its bytes demonstrates
// nothing about the refusal; an accept vector is deliberately not what a
// writer produces (that is the whole of what it tests). Both are
// hand-authored, and check-manifest.mjs is what holds them to the tree.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// ── §4 canonical encoding ────────────────────────────────────────────
//
// Eleven lines, which is the argument §4.7 makes for stating the rules
// rather than pointing at a JCS library and hoping.

/** §4.3 — the escape table, and nothing else. `/` is not escaped. */
const str = (s) => {
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
};

/** §4.4 — signed 32-bit integers, shortest decimal, nothing else. */
const int = (n) => {
  if (!Number.isInteger(n)) throw new Error(`§4.4: not an integer: ${n}`);
  if (n < -2147483648 || n > 2147483647) throw new Error(`§4.4: out of 32-bit range: ${n}`);
  return String(n);
};

/** §4.2 — declaration order, never sorted. §4.5 — an absent member is omitted. */
const obj = (pairs) =>
  "{" +
  pairs
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => str(k) + ":" + v)
    .join(",") +
  "}";

/** §4.6 — arrays carry the composition's own order. */
const arr = (items) => "[" + items.join(",") + "]";

/** §4.5 — the format's one boolean-valued member rides as a string. */
const wireBool = (b) => str(b ? "true" : "false");

const sha256Hex = (bytes) => createHash("sha256").update(bytes).digest("hex");

// ── §6 the citation ──────────────────────────────────────────────────

const citation = (c) =>
  c == null
    ? null
    : obj([
        ["spec", str(c.spec)],
        ["version", str(c.version)],
        ["corpusHead", c.corpusHead == null ? null : str(c.corpusHead)],
      ]);

// ── §5.4 a declared fact table ───────────────────────────────────────

// §5.4 — a disclosure, a column, and a fact table's definition. Every
// OPTIONAL member is `null` in the input model when the composition states
// none, and omitted (§4.5).
const disclosure = (d) =>
  obj([
    ["class", str(d.class)],
    ["policy", d.policy == null ? null : str(d.policy)],
  ]);

const column = (c) =>
  obj([
    ["metric", str(c.metric)],
    ["shape", str(c.shape)],
    ["disclosure", c.disclosure == null ? null : disclosure(c.disclosure)],
  ]);

const definition = (d) =>
  d == null
    ? null
    : obj([
        ["schemaVersion", int(d.schemaVersion)],
        ["hierarchy", str(d.hierarchy)],
        ["level", str(d.level)],
        ["columns", arr(d.columns.map(column))],
        ["periodGrain", str(d.periodGrain)],
        ["producingOperation", str(d.producingOperation)],
        ["refreshCadenceSeconds", int(d.refreshCadenceSeconds)],
        ["historyMode", str(d.historyMode)],
        ["disclosure", disclosure(d.disclosure)],
        ["requirement", str(d.requirement)],
      ]);

// §5.4 — a description: the text, then the described members in the
// composition's order, the array omitted when no member is described.
const description = (d, entriesMember, keyMember) =>
  d == null
    ? null
    : obj([
        ["text", str(d.text)],
        [
          entriesMember,
          nonEmpty(d[entriesMember], (e) =>
            obj([
              [keyMember, str(e[keyMember])],
              ["text", str(e.text)],
            ]),
          ),
        ],
      ]);

const factTable = (t) =>
  obj([
    ["id", str(t.id)],
    ["subjects", arr(t.subjects.map(str))],
    ["metrics", arr(t.metrics.map(str))],
    ["grains", arr(t.grains.map(str))],
    ["definition", definition(t.definition)],
    ["description", description(t.description, "columns", "metric")],
  ]);

// §5.4 — the definitions a unit registers.
const optStr = (v) => (v == null ? null : str(v));

/** §M5.12 (draft 0.4) — an OPTIONAL path array: absent unless it names something. */
const optPaths = (xs) => {
  if (xs == null) return null;
  if (xs.length === 0) throw new Error("§M5.12: an OPTIONAL author path array is written only when it names something");
  return arr(xs.map(str));
};

const metricDefinition = (m) =>
  obj([
    ["id", str(m.id)],
    ["name", str(m.name)],
    ["unit", str(m.unit)],
    ["dimensionality", str(m.dimensionality)],
    ["direction", str(m.direction)],
    ["displayFormat", str(m.displayFormat)],
    [
      "staleness",
      obj([
        ["policy", str(m.staleness.policy)],
        ["windowSeconds", m.staleness.windowSeconds == null ? null : int(m.staleness.windowSeconds)],
      ]),
    ],
    ["producingOperation", optStr(m.producingOperation)],
    ["canonicalMethod", optStr(m.canonicalMethod)],
    ["recomputePolicy", optStr(m.recomputePolicy)],
    [
      "rollUp",
      m.rollUp == null
        ? null
        : obj([
            ["kind", str(m.rollUp.kind)],
            ["tolerance", optStr(m.rollUp.tolerance)],
          ]),
    ],
    ["context", optStr(m.context)],
  ]);

const subjectDefinition = (d) =>
  obj([
    ["id", str(d.id)],
    ["name", str(d.name)],
    ["levels", arr(d.levels.map(str))],
    ["calendar", optStr(d.calendar)],
    ["description", description(d.description, "levels", "level")],
  ]);

/** An EMPTY list is omitted, never spelled `[]` (§5.4). */
const nonEmpty = (xs, render) => (xs == null || xs.length === 0 ? null : arr(xs.map(render)));

// §5.4 — an owned entity and its classified fields: the name, the
// disclosure, then the fields (omitted when empty); a field is its path, its
// level, `auditOnRead` as the format's boolean string, then the key id.
const classifiedField = (f) =>
  obj([
    ["fieldPath", str(f.fieldPath)],
    ["level", str(f.level)],
    ["auditOnRead", wireBool(f.auditOnRead)],
    ["encryptionKeyId", optStr(f.encryptionKeyId)],
  ]);

const ownedEntity = (e) =>
  obj([
    ["name", str(e.name)],
    ["disclosure", disclosure(e.disclosure)],
    ["fields", nonEmpty(e.fields, classifiedField)],
  ]);

// §5.4 — a disclosure policy: the reference, the mode, the permitted
// surfaces (REQUIRED, written as `[]` when empty: a sealed policy is a stance,
// not an absence), then the contributor scope when stated.
const disclosurePolicy = (p) =>
  obj([
    ["policyRef", str(p.policyRef)],
    ["mode", str(p.mode)],
    ["permitSurfaces", arr((p.permitSurfaces ?? []).map(str))],
    ["contributorScope", optStr(p.contributorScope)],
  ]);

// ── §5 the node kinds ────────────────────────────────────────────────
//
// One entry per kind, giving its members IN DECLARATION ORDER. This map
// is the emitter's whole reading of §5: everything else here is the
// envelope. Adding a kind to the specification and not to this map is
// caught by the tag-coverage assertion at the bottom of this file.

const kindMembers = {
  // §5.1
  appRoot: (n) => [
    ["base", str(n.base)],
    ["layers", arr((n.layers ?? []).map(str))],
    // §5.1 — the application's human title, after `layers`, and omitted when
    // the composition states none (§4.5).
    ["displayName", optStr(n.displayName)],
    // §5.1 — the application's machine name, after `displayName`, and omitted
    // when the composition states none (§4.5).
    ["shortName", optStr(n.shortName)],
    // §5.1 — the declared build units, after `shortName`, in the order the
    // composition states them, and omitted when it declares none (§4.5).
    ["projects", n.projects == null || n.projects.length === 0 ? null : arr(n.projects.map(str))],
  ],
  // §5.2
  serverConfig: () => [],
  // §5.3
  companionSelection: (n) => [
    ["slot", str(n.slot)],
    ["impl", str(n.impl)],
  ],
  // §5.4
  moduleRef: (n) => [
    ["view", str(n.view)],
    ["viewSpec", citation(n.viewSpec)],
    ["surfaceKind", n.surfaceKind == null ? null : str(n.surfaceKind)],
    // An EMPTY list is omitted, never spelled `[]` — §5.4 refuses the empty
    // array (`fact-tables-empty`), so a writer has one spelling for "none".
    ["factTables", n.factTables == null || n.factTables.length === 0 ? null : arr(n.factTables.map(factTable))],
    // The definitions a unit registers, after the tables, on the same rule.
    ["metricDefinitions", nonEmpty(n.metricDefinitions, metricDefinition)],
    ["subjectDefinitions", nonEmpty(n.subjectDefinitions, subjectDefinition)],
    // §5.4 — the entities the unit owns, then its AI exposure, each omitted
    // when the composition states none.
    ["entities", nonEmpty(n.entities, ownedEntity)],
    ["aiExposure", optStr(n.aiExposure)],
    // §5.4 — the disclosure policies the unit owns, omitted when it declares
    // none.
    ["disclosurePolicies", nonEmpty(n.disclosurePolicies, disclosurePolicy)],
    // MODULE_AUTHORING_WIRE.md §M7 — the body's content address, last, and
    // omitted when the composition commits to none (§4.5).
    ["bodyAddress", optStr(n.bodyAddress)],
  ],
  // §5.5
  dataType: (n) => [["name", str(n.name)]],
  // §5.6
  portAllocation: (n) => [
    ["server", int(n.server)],
    ["client", n.client == null ? null : int(n.client)],
  ],
  // §5.7
  connectorRef: (n) => [
    ["impl", str(n.impl)],
    ["oauth", str(n.oauth)],
    ["rateLimited", wireBool(n.rateLimited)],
  ],
  // §5.8
  configKnob: (n) => [
    ["key", str(n.key)],
    ["value", str(n.value)],
  ],
  // §5.10 / §7.2 — field entries in AUTHORING order, never sorted.
  extensionRef: (n) => [
    ["namespace", str(n.namespace)],
    ["extensionKind", str(n.extensionKind)],
    [
      "fields",
      arr(
        (n.fields ?? []).map((f) =>
          obj([
            ["name", str(f.name)],
            ["value", str(f.value)],
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
  return obj([
    ["kind", str(n.kind)],
    ...members(n),
    ["id", str(n.id)],
    ["children", arr((n.children ?? []).map(node))],
  ]);
};

// ── the input models ─────────────────────────────────────────────────
//
// Deliberately written with members in a haphazard order and with
// optionals spelled `null` rather than omitted, so that the encoder above
// is what imposes §4.2 and §4.5 rather than the way these happen to be
// typed. An input model that already looked like the output would
// triangulate nothing.

const UI_SPEC = "fuaran-ui-specification";
const UI_VERSION = "0.2.0";
const UI_CORPUS_HEAD = "b2f7ab96812ec3c8d1393fe89f9cb8f3040641a74b568615adbe113079b2ed64";

const leaf = (id, kind, rest = {}) => ({ id, kind, children: [], ...rest });
const root = (id, base, layers, children) => ({ layers, children, kind: "appRoot", id, base });

const knob = (id, key, value) => leaf(id, "configKnob", { value, key });
const slot = (id, s, impl) => leaf(id, "companionSelection", { impl, slot: s });
const dataType = (id, name) => leaf(id, "dataType", { name });
const bareModule = (id) => leaf(id, "moduleRef", { view: "bareFeliz", viewSpec: null, surfaceKind: null });

// ── MODULE_AUTHORING_WIRE.md — the module document (DRAFT) ────────────
//
// The same §4 primitives, a second envelope map. The module document is
// specified in a sibling document because its stability differs (§M2), and
// it is encoded by exactly these rules (§M4.1) — so this section adds
// member maps and nothing else: no new escaping, ordering or omission rule.

/** §M6.3 — a case of an evaluator's union: the case, then its argument when it takes one. */
const caseObj = (c) =>
  obj([
    ["case", str(c.case)],
    ["argument", optStr(c.argument)],
  ]);

/** §M6.3 — an OPTIONAL array where `[]` is a VALUE: omitted only when absent. */
const optArr = (xs, render) => (xs == null ? null : arr(xs.map(render)));

const toolParameter = (p) =>
  obj([
    ["name", str(p.name)],
    ["type", str(p.type)],
    ["description", str(p.description)],
    ["required", wireBool(p.required)],
    ["default", optStr(p.default)],
  ]);

const toolAction = (a) =>
  obj([
    ["moduleId", str(a.moduleId)],
    ["actionKey", str(a.actionKey)],
    ["description", str(a.description)],
    ["payloadSchema", optStr(a.payloadSchema)],
  ]);

const toolDefinition = (d) =>
  d == null
    ? null
    : obj([
        ["description", str(d.description)],
        ["parameters", arr(d.parameters.map(toolParameter))],
        ["emitsActions", optArr(d.emitsActions, toolAction)],
        ["location", str(d.location)],
        ["surface", str(d.surface)],
        ["isLiveInterface", wireBool(d.isLiveInterface)],
        ["resultBudget", caseObj(d.resultBudget)],
        ["effects", optArr(d.effects, caseObj)],
        // §M6.3 — the owned entities the tool reads, each the unit then the
        // entity; OPTIONAL, and `[]` is a value.
        [
          "reads",
          optArr(d.reads, (r) =>
            obj([
              ["module", str(r.module)],
              ["entity", str(r.entity)],
            ]),
          ),
        ],
      ]);

const moveTable = (t) =>
  t == null
    ? null
    : obj([
        ["states", arr(t.states.map(str))],
        ["initial", str(t.initial)],
        [
          "moves",
          arr(
            t.moves.map((mv) =>
              obj([
                ["from", str(mv.from)],
                ["to", arr(mv.to.map(str))],
              ]),
            ),
          ),
        ],
      ]);

/** §M6 — one member map per handler case, in declaration order. */
const handlerMembers = {
  crudOverDataType: (h) => [["dataType", str(h.dataType)]],
  stateTransition: (h) => [
    ["dataType", str(h.dataType)],
    ["field", str(h.field)],
    ["table", moveTable(h.table)],
  ],
  aiToolHandler: (h) => [
    ["tool", str(h.tool)],
    ["definition", toolDefinition(h.definition)],
    ["executor", optStr(h.executor)],
  ],
  notificationEmit: (h) => [["topic", str(h.topic)]],
  customHandler: (h) => [["note", str(h.note)]],
  logicTreeHandler: (h) => [["ref", str(h.ref)]],
};

const handlerObj = (h) => {
  const members = handlerMembers[h.kind];
  if (!members) throw new Error(`no encoder for handler kind ${JSON.stringify(h.kind)}`);
  return obj([["kind", str(h.kind)], ...members(h)]);
};

const bound = (n) => [["bound", optStr(n.bound)]];

/**
 * §M5.11 — a data flow step: §12.7's own step encoder, over the verbs this
 * draft revision registers. `join` is §12.7's and is refused here (§M1.2);
 * the encoder is reused rather than restated, so the two families cannot
 * spell one step two ways.
 */
const moduleFlowVerbs = new Set(["filter", "derive", "groupBy", "sort", "window"]);
const flowStep = (s) => {
  if (!moduleFlowVerbs.has(s.verb)) throw new Error(`§M5.11: verb "${s.verb}" is not registered for a module data flow`);
  return pipelineStep(s);
};

/** §M5 — one member map per module node kind, in declaration order. */
const moduleKindMembers = {
  moduleRoot: (n) => [
    ["view", str(n.view)],
    ["viewSpec", citation(n.viewSpec)],
    ["host", str(n.host)],
    ["determinism", str(n.determinism)],
    // §M5.1 — the unit's identity, OPTIONAL and last, so every 0.1 document
    // keeps its bytes and its content address.
    ["namespace", optStr(n.namespace)],
    ["platformVersion", optStr(n.platformVersion)],
    // §M5.1 (draft 0.4) — the package identity and the registration name,
    // OPTIONAL and after the 0.2 identity, so every 0.3 document keeps its bytes.
    ["packageId", optStr(n.packageId)],
    ["registration", optStr(n.registration)],
  ],
  dataTypeParam: bound,
  columnCount: bound,
  apiParam: bound,
  substrateParam: bound,
  queryTargetParam: bound,
  handler: (n) => [["handler", handlerObj(n.handler)]],
  viewBody: (n) => [["contentHash", str(n.contentHash)]],
  // §M5.9–§M5.11 — the declarations and the data flow (draft 0.2).
  // §M5.9 (draft 0.4) — `owner`, OPTIONAL and closed: `author` or absent.
  dataTypeDecl: (n) => [
    ["name", str(n.name)],
    ["owner", optStr(n.owner)],
  ],
  routeDecl: (n) => [["route", str(n.route)]],
  dataFlow: (n) => [
    ["input", arr(n.input.map(tableColumn))],
    ["pipeline", arr(n.pipeline.map(flowStep))],
  ],
  // §M5.12 — the author body (draft 0.3): two REQUIRED string arrays, `[]` a
  // value, each in the author's order.
  // Draft 0.4 adds three OPTIONAL path arrays between them, written only when
  // they name something (an empty one is refused, §M5.12).
  authorBody: (n) => [
    ["sources", arr(n.sources.map(str))],
    ["shared", optPaths(n.shared)],
    ["client", optPaths(n.client)],
    ["assets", optPaths(n.assets)],
    ["packages", arr(n.packages.map(str))],
  ],
};

/** §M3.1 — the composition's node envelope, over the module kinds. */
const moduleNode = (n) => {
  const members = moduleKindMembers[n.kind];
  if (!members) throw new Error(`no encoder for module kind ${JSON.stringify(n.kind)}`);
  return obj([
    ["kind", str(n.kind)],
    ...members(n),
    ["id", str(n.id)],
    ["children", arr((n.children ?? []).map(moduleNode))],
  ]);
};

// The input models, typed out of order with optionals spelled `null`, on
// the same terms as the composition models above.

const mroot = (id, view, host, determinism, children, viewSpec = null) => ({
  children,
  determinism,
  id,
  viewSpec,
  kind: "moduleRoot",
  host,
  view,
});
const mleaf = (id, kind, rest = {}) => ({ id, kind, children: [], ...rest });
const mhandler = (id, h) => mleaf(id, "handler", { handler: h });
const handlerModule = (id, determinism, h) =>
  mroot(id, "bareFeliz", "writesHost", determinism, [mhandler(id + "-h", h)]);

const fullDefinition = () => ({
  effects: [{ argument: null, case: "readFacts" }, { case: "writeState", argument: "orders" }],
  resultBudget: { argument: "4000", case: "resultBudgetChars" },
  isLiveInterface: true,
  surface: "both",
  location: "serverResident",
  emitsActions: [
    { payloadSchema: "{}", description: "open the order", actionKey: "open", moduleId: "orders" },
    { moduleId: "orders", actionKey: "close", description: "close it", payloadSchema: null },
  ],
  parameters: [
    { default: null, required: true, type: "string", description: "the order", name: "orderId" },
    { name: "tone", type: "string", description: "how to say it", required: false, default: "plain" },
  ],
  description: "Summarise an order",
});

// §M5.11's expression models, typed out of member order. Local rather than
// §12.7's helpers further down, which are not yet defined when this table is
// built.
const fcol = (name) => ({ name, expr: "column" });
const flit = (n) => ({ int: n, expr: "literal" });
const fbin = (op, left, right) => ({ right, left, op, expr: "binary" });

const moduleDocuments = {
  // ── module-document/ — the root and the parameter kinds ────────────

  // The smallest module there is: a root and nothing under it.
  "module-document/empty-root": mroot("empty-root", "bareFeliz", "pure", "deterministic", []),

  // Every parameter kind, open and bound, and a view body — the vector a
  // writer that emits `"bound":null` for an open hole diverges on.
  "module-document/every-parameter": mroot("every-parameter", "bareFeliz", "readsHost", "deterministic", [
    mleaf("dt-open", "dataTypeParam", { bound: null }),
    mleaf("dt-bound", "dataTypeParam", { bound: "Order" }),
    mleaf("cc-open", "columnCount"),
    mleaf("cc-bound", "columnCount", { bound: "12" }),
    mleaf("api-open", "apiParam"),
    mleaf("api-bound", "apiParam", { bound: "orders-api" }),
    mleaf("sub-open", "substrateParam"),
    mleaf("sub-bound", "substrateParam", { bound: "VectorStore" }),
    mleaf("qt-open", "queryTargetParam"),
    mleaf("qt-bound", "queryTargetParam", { bound: "orders.byCustomer" }),
    mleaf("body", "viewBody", { contentHash: "6025113844bc69d9dfaab2c9b6a404e849d32bc4530d43c3c72450d5584070c6" }),
  ]),

  // A citation-bearing view with its citation, and a COMPOSED determinism
  // set — the canonical label of {clock, network}, factors in fixed order.
  "module-document/cited-view-composed-effect": mroot(
    "cited-view-composed-effect",
    "fuaranUI",
    "writesHost",
    "clock+network",
    [mhandler("orders-crud", { dataType: "Order", kind: "crudOverDataType" })],
    { corpusHead: UI_CORPUS_HEAD, version: UI_VERSION, spec: UI_SPEC },
  ),

  // ── draft 0.2 — identity, declarations and the data flow ───────────

  // The document that stands alone: the unit's identity on the root, the
  // types and the route it declares, and a handler over a DECLARED type —
  // the vector §M10's derived signature is read from. Members typed out of
  // order; the encoder restores the declared order.
  "module-document/identity-and-declarations": {
    ...mroot("mod.orders", "bareFeliz", "writesHost", "deterministic", [
      mleaf("decl-order", "dataTypeDecl", { name: "Order" }),
      mleaf("decl-line", "dataTypeDecl", { name: "OrderLine" }),
      mleaf("route-orders", "routeDecl", { route: "/api/orders" }),
      mleaf("dt", "dataTypeParam", { bound: "Customer" }),
      mleaf("sub", "substrateParam", { bound: "BlobStore" }),
      mleaf("qt", "queryTargetParam", { bound: "customers.byId" }),
      mhandler("orders-crud", { kind: "crudOverDataType", dataType: "Order" }),
    ]),
    platformVersion: "0.24.1",
    namespace: "Orders",
  },

  // A data flow using every registered verb, expression form and token,
  // and a root naming its namespace and NO platform version — the optional
  // member present once and absent once across the two 0.2 vectors.
  "module-document/data-flow": {
    ...mroot("mod.sales", "bareFeliz", "readsHost", "deterministic", [
      mleaf("decl-sale", "dataTypeDecl", { name: "Sale" }),
      mleaf("flow", "dataFlow", {
        pipeline: [
          { where: fbin("greaterThan", fcol("qty"), flit(0)), verb: "filter" },
          { value: fbin("multiply", fcol("qty"), fcol("price")), column: "amount", verb: "derive" },
          {
            verb: "window",
            partitionBy: ["region"],
            orderBy: [{ direction: "ascending", column: "qty" }],
            fn: "lag",
            of: "amount",
            as: "previous",
          },
          {
            aggregates: [
              { of: "id", fn: "count", name: "n" },
              { name: "total", fn: "sum", of: "amount" },
              { name: "firstSale", of: "id", fn: "first" },
            ],
            keys: ["region"],
            verb: "groupBy",
          },
          { by: [{ column: "total", direction: "descending" }], verb: "sort" },
        ],
        input: [
          { type: "string", name: "id" },
          { name: "region", type: "string" },
          { name: "qty", type: "int" },
          { name: "price", type: "int" },
        ],
      }),
    ]),
    namespace: "Sales",
  },

  // `pipeline: []` is a VALUE (§M5.11): a flow that reshapes nothing and
  // still states the input it reads. A writer that omits the empty array
  // diverges here.
  "module-document/data-flow-empty-pipeline": mroot("mod.passthrough", "bareFeliz", "readsHost", "deterministic", [
    mleaf("flow", "dataFlow", { input: [{ name: "id", type: "string" }], pipeline: [] }),
  ]),

  // §M5.12 — a unit whose two escapes share one author body of several
  // sources, in compile order, under a multi-segment namespace and with no
  // declared data type. Members typed out of order.
  "module-document/author-body": {
    ...mroot("mod.trade", "bareFeliz", "writesHost", "clock+network", [
      mleaf("route-upload", "routeDecl", { route: "/api/trade/upload" }),
      mhandler("briefing", { note: "the weekly briefing's cadence", kind: "customHandler" }),
      mhandler("ingestion", { note: "the delivery routes", kind: "customHandler" }),
      mleaf("body", "authorBody", {
        packages: ["Example.Facts.Server", "Example.DataSources.Workbook"],
        sources: ["Body/Contract.src", "Body/Workbook.src", "Body/Ingestion.src", "Body/Briefing.src"],
      }),
    ]),
    platformVersion: "0.30.0",
    namespace: "Example.Modules.Client.Trade",
  },

  // `sources: []` is a VALUE (§M5.12): a body of one source per escape that
  // still references a package. A writer that omits the empty array diverges.
  "module-document/author-body-no-sources": mroot("mod.notes", "bareFeliz", "writesHost", "deterministic", [
    mhandler("reconcile", { kind: "customHandler", note: "hand-written reconciliation" }),
    mleaf("body", "authorBody", { packages: ["Example.Facts.Server"], sources: [] }),
  ]),

  // §M5.1 (draft 0.4) — a unit whose three identities differ: the package it
  // is distributed under, the namespace its code lives in, and the name it
  // registers under. Members typed out of order.
  "module-document/distinct-identities": {
    ...mroot("mod.category", "bareFeliz", "writesHost", "network", []),
    registration: "CategoryAnalysis",
    packageId: "Example.Modules.CategoryAnalysis",
    platformVersion: "0.20.0",
    namespace: "CategoryAnalysis",
  },

  // §M5.9 / §M5.12 (draft 0.4) — a unit captured from code that already
  // defines its types and its client: two data types the author body owns,
  // escapes that register them, and an author body with a shared tier, a
  // server tier, a client tier and the assets the client reads. Members typed
  // out of order; the encoder restores the declared order.
  "module-document/author-tiers": {
    ...mroot("mod.category", "bareFeliz", "writesHost", "network", [
      mleaf("type-a", "dataTypeDecl", { owner: "author", name: "CategoryData" }),
      mhandler("datatype-a", { note: "the file processor of CategoryData", kind: "customHandler" }),
      mleaf("type-b", "dataTypeDecl", { owner: "author", name: "ShareData" }),
      mhandler("datatype-b", { note: "the file processor of ShareData", kind: "customHandler" }),
      mleaf("body", "authorBody", {
        packages: ["Example.Algorithms", "Example.Numerics", "Example.Views"],
        assets: ["Client/icons/category.svg", "Client/icons/share.svg"],
        client: ["Client/Model.src", "Client/Icons.src", "Client/View.src", "Client/Register.src"],
        sources: ["Body/Analysis.src"],
        shared: ["Shared/Types.src"],
      }),
    ]),
    registration: "CategoryAnalysis",
    packageId: "Example.Modules.CategoryAnalysis",
    namespace: "CategoryAnalysis",
  },

  // ── 1.0 — the two real modules the profile was promoted on (§M2) ───
  //
  // Each is a real module's document with its names made neutral and its
  // shape kept: the same nodes in the same order, the same handler cases,
  // the same root members present and absent, and author bodies of the same
  // lengths. Every handler in both is the escape, which is §M2 step 3's
  // record. Members typed out of order; the encoder restores the order.

  // The first: three routes, two escapes and a nine-source author body, no
  // declared data type, a multi-segment namespace, no package id.
  "module-document/real-module-ledger": {
    ...mroot("Ledger", "bareFeliz", "writesHost", "clock+network", [
      mleaf("route-upload", "routeDecl", { route: "/api/ledger/upload" }),
      mleaf("route-derive", "routeDecl", { route: "/api/ledger/derive" }),
      mleaf("route-ingestions", "routeDecl", { route: "/api/ledger/ingestions" }),
      mhandler("briefing", {
        note: "the weekly briefing's cadence and the change narrative's trigger, an observer ahead of the delivery routes",
        kind: "customHandler",
      }),
      mhandler("ingestion", {
        kind: "customHandler",
        note: "the delivery routes (upload, derive, ingestions), applied by the host with its settings",
      }),
      mleaf("body", "authorBody", {
        packages: ["Example.Facts.Server", "Example.DataSources.Workbook"],
        sources: [
          "Body/Contract.src",
          "Body/Workbook.src",
          "Body/Quality.src",
          "Body/Facts.src",
          "Body/Ingestion.src",
          "Body/Derivation.src",
          "Body/Api.src",
          "Body/Questions.src",
          "Body/Briefing.src",
        ],
      }),
    ]),
    platformVersion: "0.30.0",
    namespace: "Example.Modules.Client.Ledger",
  },

  // The second: two owned types each read by an escape, two model-facing
  // tools whose executors are code, two bound substrates, a remote interface
  // composed in code, a view body, and a tiered author body. Its package id
  // differs from its namespace and its registration does not.
  "module-document/real-module-category": {
    ...mroot("CategoryAnalysis", "bareFeliz", "writesHost", "network", [
      mleaf("type-CategoryData", "dataTypeDecl", { owner: "author", name: "CategoryData" }),
      mhandler("datatype-CategoryData", {
        kind: "customHandler",
        note: "the file reader of data type `CategoryData`: the reduction declares the type and registers no reader, so the author body registers it",
      }),
      mleaf("type-ShareData", "dataTypeDecl", { name: "ShareData", owner: "author" }),
      mhandler("datatype-ShareData", {
        note: "the file reader of data type `ShareData`: the reduction declares the type and registers no reader, so the author body registers it",
        kind: "customHandler",
      }),
      mhandler("tool-category-fit", {
        note: "model-facing tool `category.fit`: its definition and its executor, a numerical routine in the author body",
        kind: "customHandler",
      }),
      mhandler("tool-share-fit", {
        kind: "customHandler",
        note: "model-facing tool `share.fit`: its definition and its executor, a numerical routine in the author body",
      }),
      mleaf("substrate-ModelProvider", "substrateParam", { bound: "ModelProvider" }),
      mleaf("substrate-BlobStore", "substrateParam", { bound: "BlobStore" }),
      mhandler("opaque-Handlers", {
        kind: "customHandler",
        note: "one remote interface registered in code: its routes are composed by the body and cannot be enumerated from it",
      }),
      mleaf("view", "viewBody", {
        contentHash: "sha256:c1d31b871474ce5a9d7e36716dba2f06d91cbc5c6c1f1567fa64d94e92c2a4a6",
      }),
      mleaf("body", "authorBody", {
        packages: [
          "Example.Algorithms",
          "Example.Numerics",
          "Example.Platform.Core",
          "Example.Ai.Core",
          "Example.Platform.Client",
          "Example.Ai.Client",
          "Example.Views",
          "Example.Script.Core",
          "Example.Views.Types",
          "Example.Views.Dom.Types",
        ],
        assets: ["Client/icons/category.svg", "Client/icons/share.svg"],
        client: [
          "Client/Model.src",
          "Client/Icons.src",
          "Client/CategoryView.src",
          "Client/ShareView.src",
          "Client/Register.src",
        ],
        shared: ["Shared/Types.src"],
        sources: ["Body/Analysis.src"],
      }),
    ]),
    packageId: "Example.Modules.CategoryAnalysis",
    platformVersion: "0.20.0",
    namespace: "CategoryAnalysis",
  },

  // ── module-handler/ — one vector per handler case and posture ──────

  "module-handler/crud-over-data-type": handlerModule("crud", "deterministic", {
    dataType: "Invoice",
    kind: "crudOverDataType",
  }),

  // A transition that declares no table: representable, so that it can be
  // refused by name at reduction rather than reduced to "any move" (§M6.2).
  "module-handler/state-transition-without-table": handlerModule("transition-bare", "deterministic", {
    table: null,
    field: "Status",
    dataType: "Job",
    kind: "stateTransition",
  }),

  "module-handler/state-transition-with-table": handlerModule("transition-table", "deterministic", {
    table: {
      moves: [
        { to: ["sent"], from: "draft" },
        { from: "sent", to: ["paid", "draft"] },
      ],
      initial: "draft",
      states: ["draft", "sent", "paid"],
    },
    field: "Status",
    dataType: "Invoice",
    kind: "stateTransition",
  }),

  "module-handler/ai-tool-bare": handlerModule("tool-bare", "network", {
    executor: null,
    definition: null,
    tool: "summarise_order",
    kind: "aiToolHandler",
  }),

  // Every member of a definition, every optional present and absent once.
  "module-handler/ai-tool-with-definition-and-executor": handlerModule("tool-full", "network", {
    executor: "orders-logic",
    definition: fullDefinition(),
    tool: "summarise_order",
    kind: "aiToolHandler",
  }),

  // §M6.3's one meaningful empty array: a tool declaring NO effects and NO
  // actions, which is not the same document as one declaring nothing.
  "module-handler/ai-tool-empty-arrays": handlerModule("tool-empty", "network", {
    executor: "orders-logic",
    definition: { ...fullDefinition(), effects: [], emitsActions: [], isLiveInterface: false },
    tool: "peek_order",
    kind: "aiToolHandler",
  }),

  // §M6.3 — a tool stating the owned entities it reads: two edges, given
  // out of order; the encoder restores the unit-then-entity order.
  "module-handler/ai-tool-with-reads": handlerModule("tool-reads", "network", {
    executor: "orders-logic",
    definition: {
      ...fullDefinition(),
      reads: [
        { entity: "OrderSummary", module: "Orders" },
        { module: "Billing", entity: "Invoice" },
      ],
    },
    tool: "summarise_order",
    kind: "aiToolHandler",
  }),

  // §M6.3 — a tool declaring that it reads NO owned entity: `reads` written
  // as [], which is not the same document as the member omitted.
  "module-handler/ai-tool-reads-none": handlerModule("tool-reads-none", "network", {
    executor: "orders-logic",
    definition: { ...fullDefinition(), reads: [] },
    tool: "peek_order",
    kind: "aiToolHandler",
  }),

  "module-handler/notification-emit": handlerModule("notify", "deterministic", {
    topic: "orders.overdue",
    kind: "notificationEmit",
  }),

  "module-handler/custom-handler": handlerModule("custom", "network", {
    note: "hand-written reconciliation",
    kind: "customHandler",
  }),

  "module-handler/logic-tree-handler": handlerModule("logic", "network", {
    ref: "orders-logic",
    kind: "logicTreeHandler",
  }),
};

/** §M4.2 — a module document's content address: SHA-256 over its canonical bytes. */
const moduleAddress = (id) => sha256Hex(Buffer.from(moduleNode(moduleDocuments[id]), "utf8"));

/** §M7 — the module vector the composition vector cites, by content address. */
const CITED_MODULE = "module-document/cited-view-composed-effect";

const documents = {
  // ── document/ — whole compositions, core vocabulary ────────────────

  "document/minimal": root("minimal", "serverApp", [], []),

  "document/neutral-vocabulary": root("neutral-vocabulary", "serverApp", ["forms"], [
    {
      kind: "serverConfig",
      id: "serverConfig",
      children: [
        leaf("ds-directory", "connectorRef", { rateLimited: false, oauth: "noOAuth", impl: "PublicDirectory" }),
        leaf("ds-ledger", "connectorRef", { impl: "Ledger", oauth: "oauth2", rateLimited: true }),
        knob("knob-entityStore", "EntityStore", "enabled"),
        knob("knob-baseUrl", "PublicBaseUrl", "http://localhost:13400"),
      ],
    },
    dataType("Entry", "Entry"),
    dataType("Tag", "Tag"),
    bareModule("Directory"),
    leaf("Ingest", "moduleRef", { view: "bareFeliz", surfaceKind: "webhook" }),
    leaf("ports", "portAllocation", { server: 13400, client: null }),
  ]),

  // ── node/ — one minimal composition per core kind ──────────────────

  "node/server-config": root("node-server-config", "serverApp", [], [
    { kind: "serverConfig", id: "serverConfig", children: [] },
  ]),

  "node/companion-selection": root("node-companion-selection", "serverApp", ["ai"], [
    {
      kind: "serverConfig",
      id: "serverConfig",
      children: [slot("ai", "aiProvider", "Claude"), slot("sched", "jobScheduler", "InProcess")],
    },
  ]),

  "node/data-type": root("node-data-type", "serverApp", [], [dataType("Habit", "Habit")]),

  "node/config-knob": root("node-config-knob", "serverApp", [], [
    {
      kind: "serverConfig",
      id: "serverConfig",
      children: [knob("knob-processProfile", "ProcessProfile", "WebOnly")],
    },
  ]),

  // Both spellings of the optional client band, side by side: the pair is
  // what separates an emitter that omits an absent member from one that
  // happens never to have been handed a composition without it.
  "node/port-allocation": root("node-port-allocation", "serverApp", [], [
    leaf("ports", "portAllocation", { server: 13000, client: 23000 }),
  ]),

  "node/port-allocation-server-only": root("node-port-allocation-server-only", "serverApp", [], [
    leaf("ports", "portAllocation", { client: null, server: 13970 }),
  ]),

  "node/connector-ref": root("node-connector-ref", "serverApp", [], [
    {
      kind: "serverConfig",
      id: "serverConfig",
      children: [
        leaf("ds-a", "connectorRef", { impl: "Alpha", oauth: "oauth1a", rateLimited: true }),
        leaf("ds-b", "connectorRef", { impl: "Beta", oauth: "noOAuth", rateLimited: false }),
      ],
    },
  ]),

  "node/module-ref-surface-kinds": root("node-module-ref-surface-kinds", "serverApp", [], [
    leaf("Portal", "moduleRef", { view: "bareFeliz", surfaceKind: "view" }),
    leaf("Hook", "moduleRef", { surfaceKind: "webhook", view: "bareFeliz" }),
    leaf("Contract", "moduleRef", { view: "bareFeliz", surfaceKind: "api" }),
    bareModule("Undeclared"),
  ]),

  // MODULE_AUTHORING_WIRE.md §M7 — a unit whose reference COMMITS to its
  // body's bytes, beside one that commits to none. The address is not typed
  // here: it is computed from the cited module vector's own canonical bytes,
  // so the pair cannot drift apart without this emitter diverging.
  "node/module-ref-body-address": root("node-module-ref-body-address", "serverApp", [], [
    leaf("cited-view-composed-effect", "moduleRef", {
      bodyAddress: moduleAddress(CITED_MODULE),
      viewSpec: { corpusHead: UI_CORPUS_HEAD, spec: UI_SPEC, version: UI_VERSION },
      view: "fuaranUI",
    }),
    leaf("Uncommitted", "moduleRef", { bodyAddress: null, view: "bareFeliz" }),
  ]),

  // §5.1 — a root that states the title the application is known by. Every
  // other vector's root states none, so the pair that separates an emitter
  // that omits the absent member from one that writes it unconditionally is
  // this vector against document/minimal. The input model spells the member
  // first, so the encoder is what puts it after `layers`.
  "node/app-root-display-name": {
    displayName: "Expense Receipts",
    ...root("node-app-root-display-name", "serverApp", ["forms"], [dataType("Entry", "Entry")]),
  },

  // §5.1 — a root that states the application's machine name. Every vector
  // without a client shell states none, so this vector against
  // document/minimal separates an emitter that omits the absent member from
  // one that writes it unconditionally; and the root states a title too, so
  // the encoder is what puts `shortName` after `displayName` (the input
  // model spells it first).
  "node/app-root-short-name": {
    shortName: "ExpenseReceipts",
    displayName: "Expense Receipts",
    ...root("node-app-root-short-name", "serverApp", ["forms"], [dataType("Entry", "Entry")]),
  },

  // §5.1 — a root that declares build units no node produces. Every other
  // vector declares none, so this vector against document/minimal separates
  // an emitter that omits the absent member from one that writes `[]`; the
  // input model spells the member first and lists the paths out of sorted
  // order, so the encoder is what puts `projects` after `shortName` and
  // nothing sorts the entries.
  "node/app-root-projects": {
    projects: ["tools/Seed/Seed.fsproj", "src/Modules/Ledger/Ledger.fsproj"],
    shortName: "ExpenseReceipts",
    ...root("node-app-root-projects", "serverApp", ["forms"], [dataType("Entry", "Entry")]),
  },

  // §5.4 — a unit that declares the fact tables it writes, beside one that
  // declares none: the pair is what separates an emitter that omits an empty
  // `factTables` from one that was never handed a unit without it. The
  // composition also carries the profile's fact tier, so it is well-formed
  // there too. Fact-table members are typed out of declaration order.
  "node/module-ref-fact-tables": root("node-module-ref-fact-tables", "serverApp", [], [
    {
      kind: "serverConfig",
      id: "serverConfig",
      children: [knob("knob-factStore", "FactStore", "EnabledFactStore")],
    },
    leaf("Trading", "moduleRef", {
      factTables: [
        { grains: ["day"], metrics: ["revenue", "units"], id: "trade.daily", subjects: ["store"] },
        { subjects: ["store", "region"], id: "trade.weekly", grains: ["week", "month"], metrics: ["revenue"] },
      ],
      surfaceKind: null,
      view: "bareFeliz",
    }),
    leaf("Catalogue", "moduleRef", { view: "bareFeliz", factTables: [], surfaceKind: "api" }),
  ]),

  // §5.4 — a unit stating its fact table in full: the table's definition
  // (one column overriding the table's disclosure, one not), the metrics it
  // registers (one with every optional member, one with none) and the
  // subject hierarchy (with a calendar) — beside a unit registering only a
  // hierarchy with no calendar and no levels. Every object is typed out of
  // declaration order, and every absent optional is spelled `null`.
  // §5.4 — a unit's owned entities and its AI exposure: one entity bare, one
  // carrying classified fields (a key present and absent, both audit
  // spellings), a restricted disclosure with its policy; beside a unit
  // stating only an exposure. Objects typed out of declaration order.
  // §5.4 — a unit's disclosure policies: one permitting two surfaces, one
  // sealed (its empty permitSurfaces WRITTEN, not omitted) with a contributor
  // scope; beside a unit declaring none. Objects typed out of declaration
  // order, absent optionals spelled `null`.
  "node/module-ref-disclosure-policies": root("node-module-ref-disclosure-policies", "serverApp", [], [
    leaf("Trade", "moduleRef", {
      disclosurePolicies: [
        { permitSurfaces: ["retrieval", "toolResult"], contributorScope: null, mode: "plain", policyRef: "trade-figures" },
        { contributorScope: "acme", policyRef: "partner-sealed", permitSurfaces: [], mode: "taintPropagating" },
      ],
      view: "bareFeliz",
    }),
    leaf("Catalogue", "moduleRef", { view: "bareFeliz", disclosurePolicies: [] }),
  ]),

  "node/module-ref-entities": root("node-module-ref-entities", "serverApp", [], [
    leaf("Orders", "moduleRef", {
      aiExposure: "notQueryable",
      entities: [
        {
          fields: [
            { auditOnRead: false, level: "pii", fieldPath: "OrderId", encryptionKeyId: null },
            { level: "pii", encryptionKeyId: "pii-kek", fieldPath: "ScvKey", auditOnRead: true },
          ],
          disclosure: { policy: null, class: "internal" },
          name: "HighValueOrder",
        },
        { name: "Refund", disclosure: { class: "restricted", policy: "gdpr-art6" }, fields: [] },
      ],
      view: "bareFeliz",
    }),
    leaf("Catalogue", "moduleRef", { view: "bareFeliz", aiExposure: "queryable" }),
  ]),

  "node/module-ref-fact-definitions": root("node-module-ref-fact-definitions", "serverApp", [], [
    leaf("Trading", "moduleRef", {
      subjectDefinitions: [{ levels: ["site", "market", "shopperType"], calendar: "fiscal-445", name: "Trading", id: "trade" }],
      metricDefinitions: [
        {
          staleness: { windowSeconds: 172800, policy: "freshFor" },
          name: "Revenue",
          id: "revenue",
          context: "Net revenue after returns, in pounds \"sterling\".",
          rollUp: { tolerance: "0.01", kind: "additive" },
          unit: "GBP",
          recomputePolicy: "eager",
          dimensionality: "currency",
          canonicalMethod: "computed:trade.daily.load",
          direction: "higherIsBetter",
          producingOperation: "trade.daily.load",
          displayFormat: "C0",
        },
        {
          id: "orders",
          displayFormat: "",
          direction: "neutral",
          dimensionality: "count",
          unit: "count",
          name: "Orders",
          staleness: { policy: "untilSuperseded", windowSeconds: null },
          producingOperation: null,
          canonicalMethod: null,
          recomputePolicy: null,
          rollUp: null,
          context: null,
        },
      ],
      factTables: [
        {
          grains: ["day"],
          definition: {
            requirement: "required",
            disclosure: { policy: null, class: "internal" },
            columns: [
              { shape: "scalar", metric: "orders", disclosure: null },
              { disclosure: { class: "restricted", policy: "finance" }, metric: "revenue", shape: "scalar" },
            ],
            refreshCadenceSeconds: 86400,
            level: "shopperType",
            historyMode: "appendByRun",
            producingOperation: "trade.daily.load",
            periodGrain: "day",
            hierarchy: "trade",
            schemaVersion: 1,
          },
          metrics: ["orders", "revenue"],
          id: "trade.daily",
          subjects: ["trade"],
        },
      ],
      surfaceKind: null,
      view: "bareFeliz",
    }),
    leaf("Geography", "moduleRef", {
      view: "bareFeliz",
      factTables: [],
      metricDefinitions: [],
      subjectDefinitions: [{ id: "geo", name: "Geography", levels: [], calendar: null }],
    }),
  ]),

  // Stated with its members, with its text alone (the empty array OMITTED),
  // and not at all, which is a table as it always was. The member follows
  // `definition`, and the columns keep the composition's order, not the
  // table's and not a sorted one.
  "node/module-ref-fact-table-description": root("node-module-ref-fact-table-description", "serverApp", [], [
    leaf("Trading", "moduleRef", {
      view: "bareFeliz",
      factTables: [
        {
          description: {
            columns: [
              { text: "Net of returns.", metric: "revenue" },
              { metric: "orders", text: "Placed, not delivered." },
            ],
            text: "Daily trading by shopper type.",
          },
          definition: {
            requirement: "required",
            disclosure: { policy: null, class: "internal" },
            columns: [
              { shape: "scalar", metric: "orders", disclosure: null },
              { shape: "scalar", metric: "revenue", disclosure: null },
            ],
            refreshCadenceSeconds: 86400,
            level: "shopperType",
            historyMode: "appendByRun",
            producingOperation: "trade.daily.load",
            periodGrain: "day",
            hierarchy: "trade",
            schemaVersion: 1,
          },
          grains: ["day"],
          metrics: ["orders", "revenue"],
          subjects: ["trade"],
          id: "trade.daily",
        },
        {
          description: { columns: [], text: "Weekly trading, for the board." },
          grains: ["week"],
          metrics: ["revenue"],
          subjects: ["trade"],
          id: "trade.weekly",
        },
        { grains: ["month"], metrics: ["revenue"], subjects: ["trade"], id: "trade.monthly" },
      ],
    }),
  ]),

  // The same three statements on a subject definition: the member follows
  // `calendar`, and the levels keep the composition's order.
  "node/module-ref-subject-description": root("node-module-ref-subject-description", "serverApp", [], [
    leaf("Trading", "moduleRef", {
      view: "bareFeliz",
      subjectDefinitions: [
        {
          description: {
            levels: [
              { text: "A shopper segment.", level: "shopperType" },
              { level: "site", text: "One physical store." },
            ],
            text: "Sites, markets and shopper types.",
          },
          calendar: "fiscal-445",
          levels: ["site", "market", "shopperType"],
          name: "Trading",
          id: "trade",
        },
        {
          description: { levels: [], text: "Countries and regions." },
          calendar: null,
          levels: ["country", "region"],
          name: "Geography",
          id: "geo",
        },
        { calendar: null, levels: ["channel"], name: "Channel", id: "channel" },
      ],
    }),
  ]),

  // A composition whose strings exercise §4.3's escape table end to end.
  // The escapes a reader must ACCEPT but never emit are in accept/.
  "node/escapes": root("node-escapes", "serverApp", [], [
    dataType("escapes", 'quote " backslash \\ tab \t newline \n cr \r unit-sep \u001f slash / café \u{1f5ff}'),
  ]),

  // ── citation/ — §6 ────────────────────────────────────────────────

  "citation/pinned": root("citation-pinned", "serverApp", [], [
    leaf("Typed", "moduleRef", {
      view: "fuaranUI",
      surfaceKind: null,
      viewSpec: { corpusHead: UI_CORPUS_HEAD, spec: UI_SPEC, version: UI_VERSION },
    }),
  ]),

  "citation/pinned-no-corpus-head": root("citation-pinned-no-corpus-head", "serverApp", [], [
    leaf("Typed", "moduleRef", {
      viewSpec: { spec: UI_SPEC, corpusHead: null, version: "0.1.0" },
      view: "fuaranUI",
    }),
  ]),

  // The three view tokens together, so an emitter that appends the pin
  // unconditionally diverges here rather than in somebody's build.
  "citation/mixed-bindings": root("citation-mixed-bindings", "serverApp", [], [
    bareModule("Bare"),
    leaf("Typed", "moduleRef", {
      view: "fuaranUI",
      viewSpec: { spec: UI_SPEC, version: UI_VERSION, corpusHead: UI_CORPUS_HEAD },
    }),
    leaf("Escaped", "moduleRef", { view: "custom", viewSpec: null, surfaceKind: "api" }),
  ]),

  // ── extension/ — §7 ───────────────────────────────────────────────

  "extension/reserved-populated": root("extension-reserved-populated", "serverApp", [], [
    leaf("logic", "extensionRef", {
      extensionKind: "logic-tree",
      namespace: "fuaran.program",
      fields: [{ name: "ref", value: "approval-flow-v3" }],
    }),
  ]),

  "extension/reserved-with-demand-digest": root("extension-reserved-with-demand-digest", "serverApp", [], [
    leaf("logic", "extensionRef", {
      namespace: "fuaran.program",
      extensionKind: "logic-tree",
      // Declaration order, not alphabetical: `demandDigest` sorts before
      // `ref` and the committed bytes must not.
      fields: [
        { name: "ref", value: "approval-flow-v3" },
        { value: "5f1d1b1e0f7c4a2b9d3e6c8a0b4f7e2d1c5a8b3e6f9d2c4a7b0e3f6c9a2d5b8e", name: "demandDigest" },
      ],
    }),
  ]),

  // The conformance ladder's claim facet (CONFORMANCE_LADDER.md §L5),
  // riding the registered `fuaran.stack/rung-claim` declaration. Nothing
  // here knows what a rung IS — the value space is the ladder's — which
  // is exactly what the extension mechanism buys: the claim reached the
  // wire without a node kind and without a line in §5.
  "extension/rung-claim": root("extension-rung-claim", "serverApp", [], [
    leaf("Stack", "extensionRef", {
      extensionKind: "rung-claim",
      namespace: "fuaran.stack",
      fields: [{ name: "rungs", value: "composition+ui" }],
    }),
    leaf("Typed", "moduleRef", {
      view: "fuaranUI",
      viewSpec: { spec: UI_SPEC, version: UI_VERSION, corpusHead: UI_CORPUS_HEAD },
    }),
  ]),

  // Two rungs, comma-separated in the ladder's REGISTRATION order, which
  // is not alphabetical order. An emitter that sorted them would produce
  // a different document making the same statement — and a composition's
  // bytes are what a stored content address folds.
  "extension/rung-claim-stacked": root("extension-rung-claim-stacked", "serverApp", ["peer"], [
    leaf("Stack", "extensionRef", {
      namespace: "fuaran.stack",
      extensionKind: "rung-claim",
      fields: [{ name: "rungs", value: "composition+ui,composition+federation" }],
    }),
    leaf("Typed", "moduleRef", {
      view: "fuaranUI",
      viewSpec: { spec: UI_SPEC, version: UI_VERSION, corpusHead: null },
    }),
  ]),

  // §7.4's third row: an author naming the evaluator profile that may
  // reduce this composition. A DIFFERENT PARTITION from the two vectors
  // above — that field's values are the ladder's rungs, this one's are
  // §8.5's profiles — which is why it is a second declaration rather
  // than a second field on the first.
  "extension/placement-claim": root("extension-placement-claim", "serverApp", [], [
    leaf("Placement", "extensionRef", {
      namespace: "fuaran.placement",
      extensionKind: "profile-claim",
      fields: [{ name: "profiles", value: "local-first-host" }],
    }),
    dataType("Note", "Note"),
  ]),

  // Two profiles in one claim, and the set reads as an ALTERNATIVE:
  // either placement may reduce this composition. Spelled in §8.5's
  // REGISTRATION order, which is not alphabetical — the pair with the
  // vector above separates an emitter that preserves the authored
  // spelling from one that sorts, exactly as the rung pair does.
  "extension/placement-claim-alternative": root("extension-placement-claim-alternative", "serverApp", [], [
    leaf("Placement", "extensionRef", {
      namespace: "fuaran.placement",
      extensionKind: "profile-claim",
      fields: [{ name: "profiles", value: "server-app-host,local-first-host" }],
    }),
    dataType("Note", "Note"),
  ]),

  // §7.3 — a declaration this document does not carry, which a reader
  // must carry opaquely rather than refuse. Round-tripping it byte for
  // byte IS the proof of opaque carriage.
  "extension/unknown-declaration": root("extension-unknown-declaration", "serverApp", [], [
    leaf("unknown", "extensionRef", {
      namespace: "example.vendor",
      extensionKind: "some-future-thing",
      fields: [
        { name: "zeta", value: "1" },
        { name: "alpha", value: "2" },
      ],
    }),
  ]),

  "extension/no-fields": root("extension-no-fields", "serverApp", [], [
    leaf("empty", "extensionRef", { namespace: "example.vendor", extensionKind: "marker", fields: [] }),
  ]),
};

// ── §11 / §12 the facet families ─────────────────────────────────────
//
// A facet vector is not a composition. It is a SCENARIO — a session that
// is killed and replayed, or a set of divergent authorship lanes that are
// folded — whose outcome a facet claim is certified against. It carries
// composition nodes inside it and is encoded by the same §4 rules, so the
// corpus has one canonical encoding and not two.
//
// THE DERIVED MEMBERS ARE COMPUTED HERE, NEVER TYPED. `expect.projection`,
// `expect.performers` and `expect.fold` follow from the scenario by the
// rules §12 states, so they are computed from the model below and
// recomputed independently by check-facets.mjs from its own reading of
// those rules. A digest somebody typed is a digest nobody checked.

/** §11.1 — one claim: an axis and a value from that axis's vocabulary. */
const facetClaim = (c) =>
  obj([
    ["axis", str(c.axis)],
    ["value", str(c.value)],
  ]);

/** §12.1 — a session step: an append of a node, or a named performance. */
const sessionStep = (s) =>
  obj([
    ["step", str(s.step)],
    ["node", s.node == null ? null : node(s.node)],
    ["performer", s.performer == null ? null : str(s.performer)],
    ["dedupe", s.dedupe == null ? null : str(s.dedupe)],
    ["journaled", wireBool(s.journaled)],
  ]);

/**
 * §12.1 — the appends that survive the kill and the replay. A step before
 * the kill point completed; a step after it runs normally; the step IN
 * FLIGHT at the kill is re-executed if and only if it was journaled,
 * because an unjournaled step left no record that it was owed.
 */
const survivingAppends = (steps, atStep) =>
  steps.filter((s, i) => s.step === "append" && (i + 1 !== atStep || s.journaled)).map((s) => s.node);

/** §12.1 — the effect ledger the run leaves behind, per performer. */
const effectLedger = (steps, atStep) =>
  steps
    .map((s, i) => [s, i + 1])
    .filter(([s]) => s.step === "perform")
    .map(([s, i]) =>
      i !== atStep
        ? { performer: s.performer, invocations: 1, delivered: 1 }
        : s.journaled
          ? { performer: s.performer, invocations: 2, delivered: s.dedupe === "none" ? 2 : 1 }
          : { performer: s.performer, invocations: 1, delivered: 0 },
    );

const projectionOf = (v) => ({ ...v.root, children: survivingAppends(v.steps, v.atStep) });

const digestOfTree = (tree) => sha256Hex(Buffer.from(node(tree), "utf8"));

const killAndReplay = (v) =>
  obj([
    ["family", str("kill-and-replay")],
    ["demonstrates", arr(v.demonstrates.map(facetClaim))],
    [
      "session",
      obj([
        ["root", node(v.root)],
        ["steps", arr(v.steps.map(sessionStep))],
      ]),
    ],
    ["kill", obj([["atStep", int(v.atStep)]])],
    [
      "expect",
      obj([
        ["outcome", str(v.outcome)],
        ["projection", v.outcome === "refuse" ? null : str(digestOfTree(projectionOf(v)))],
        [
          "performers",
          arr(
            effectLedger(v.steps, v.atStep).map((p) =>
              obj([
                ["performer", str(p.performer)],
                ["invocations", int(p.invocations)],
                ["delivered", int(p.delivered)],
              ]),
            ),
          ),
        ],
      ]),
    ],
  ]);

/**
 * §12.2 — ordinal code-point comparison of two lane ids. Spelled out
 * rather than left to the runtime's `<`, which compares UTF-16 code units
 * and gives a different answer above the Basic Multilingual Plane.
 */
const cmpCodePoints = (a, b) => {
  const x = [...a];
  const y = [...b];
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const d = x[i].codePointAt(0) - y[i].codePointAt(0);
    if (d !== 0) return d;
  }
  return x.length - y.length;
};

/** §12.2 — one lane op: an append, or a write of one member of one node. */
const laneOp = (o) =>
  obj([
    ["op", str(o.op)],
    ["stamp", int(o.stamp)],
    ["node", o.node == null ? null : node(o.node)],
    ["target", o.target == null ? null : str(o.target)],
    ["member", o.member == null ? null : str(o.member)],
    ["value", o.value == null ? null : str(o.value)],
  ]);

/** §12.2 — the total order: ascending stamp, ties by lane id. */
const orderedOps = (lanes) => {
  const ops = [];
  for (const l of lanes) for (const o of l.ops) ops.push({ ...o, lane: l.lane });
  return ops.sort((a, b) => a.stamp - b.stamp || cmpCodePoints(a.lane, b.lane));
};

const writeMember = (tree, target, member, value) => {
  const visit = (n) => {
    if (n.id === target) n[member] = value;
    (n.children ?? []).forEach(visit);
  };
  visit(tree);
};

const foldOf = (v) => {
  const tree = JSON.parse(JSON.stringify(v.base));
  for (const o of orderedOps(v.lanes)) {
    if (o.op === "append") tree.children.push(o.node);
    else writeMember(tree, o.target, o.member, o.value);
  }
  return tree;
};

const partitionAndFold = (v) =>
  obj([
    ["family", str("partition-and-fold")],
    ["demonstrates", arr(v.demonstrates.map(facetClaim))],
    ["base", node(v.base)],
    [
      "lanes",
      arr(
        v.lanes.map((l) =>
          obj([
            ["lane", str(l.lane)],
            ["ops", arr(l.ops.map(laneOp))],
          ]),
        ),
      ),
    ],
    [
      "expect",
      obj([
        ["outcome", str(v.outcome)],
        ["fold", v.outcome === "refuse" ? null : str(digestOfTree(foldOf(v)))],
      ]),
    ],
  ]);

// ── §12.5 the attestation quote ──────────────────────────────────────
//
// The derived members here are the BINDING and the INTEGRITY, and both
// are computed rather than typed for the reason every other derived
// member in this file is: a digest somebody typed is a digest nobody
// checked. The binding is the digest of the composition the model names
// — which for the mismatch vector is a DIFFERENT composition, also named
// in the model and also hashed here, so even the fault is derived.
//
// The integrity value is the digest of the quote's own §4 encoding up to
// but excluding `integrity` itself. It is not a signature and the
// specification says so: a fixture carrying a real one would either
// publish a private key or publish a blob nobody offline can check.
// What the family certifies is that an implementation RE-DERIVES the
// value it was handed instead of reading it, which is the failure that
// survives every cryptosystem.

/** §12.5 — the quote's members, in the order the section states them. */
const quoteMembers = (q, notAfter, body) => [
  ["format", str(q.format)],
  ["measurement", str(q.measurement)],
  ["bound", str(q.bound)],
  ["notAfter", notAfter == null ? null : int(notAfter)],
  ["body", str(body)],
];

/**
 * §12.5 — the quote, sealed. `afterSealing` is the bytes appended to the
 * body AFTER the integrity value was taken: absent for every honest
 * quote, and the whole content of the unverifiable one. Modelling the
 * fault this way keeps the reject vector's integrity value derived too,
 * so it cannot drift into accidentally matching.
 */
const sealedQuote = (q) => {
  const sealed = obj(quoteMembers(q, q.notAfter, q.body));
  const integrity = sha256Hex(Buffer.from(sealed, "utf8"));
  return obj([...quoteMembers(q, q.notAfter, q.body + (q.afterSealing ?? "")), ["integrity", str(integrity)]]);
};

// The measurements and the two instants are TYPED rather than derived,
// and that is the correct side of the line: they are the scenario's
// inputs — what the environment reported and when the relying party
// looked — where the binding and the integrity are consequences of
// them. An input a fixture invents is a fixture; a consequence a
// fixture invents is a fiction.
const MEASUREMENT_ADMITTED = "3f5a1c7e94b2d80a6f13c4e2b7098d5a1e6c3f8b2d47a09e5c1b8f3672ad4e90";
const MEASUREMENT_FOREIGN = "c81d4f60a3e75b29d0f8146c3b57e9a24d1069f8b3c72e5a08d46b1927fe5c03";
const OBSERVED_IN_WINDOW = 1787000000;
const WINDOW_ENDS = 1787003600;
const OBSERVED_AFTER_WINDOW = 1787007200;

/** The composition a quote is about — deliberately small, since what the family certifies is the
 * BINDING to it rather than anything inside it. */
const attestedComposition = (id) =>
  root(id, "serverApp", [], [
    {
      kind: "serverConfig",
      id: "serverConfig",
      children: [knob("knob-entityStore", "EntityStore", "enabled")],
    },
    dataType("Entry", "Entry"),
  ]);

const attestationQuote = (v) => {
  const bound = digestOfTree(v.boundTo ?? v.composition);
  return obj([
    ["family", str("attestation-quote")],
    ["demonstrates", arr(v.demonstrates.map(facetClaim))],
    ["composition", node(v.composition)],
    [
      "policy",
      obj([
        ["measurements", arr(v.policy.measurements.map(str))],
        ["observedAt", int(v.policy.observedAt)],
      ]),
    ],
    ["quote", sealedQuote({ ...v.quote, bound })],
    ["expect", obj([["outcome", str(v.outcome)]])],
  ]);
};

// A fresh base per vector: `foldOf` clones before applying, but a shared
// literal between vectors would still be one edit away from coupling two
// scenarios that are supposed to be independent.
const foldBase = () =>
  root("fold-base", "serverApp", [], [
    {
      kind: "serverConfig",
      id: "serverConfig",
      children: [knob("knob-processProfile", "ProcessProfile", "AllInOne")],
    },
  ]);

const independentLanes = () => [
  { lane: "lane-a", ops: [{ op: "append", stamp: 1, node: dataType("Entry", "Entry") }] },
  { lane: "lane-b", ops: [{ op: "append", stamp: 2, node: dataType("Tag", "Tag") }] },
];

// The `local-first-host` fold scenario. A separate base and separate
// lanes from the two above, rather than the same ones re-pointed: a
// demonstration is scoped to a profile (§11.3), so sharing the literal
// would make the two profiles' evidence one edit away from being one
// piece of evidence counted twice.
//
// The lanes are named for DEVICES because that is what a lane is on this
// placement — the ids are ordinary strings and the total order treats
// them as such, but a reader meeting `lane-a` here would take the
// partition for a partition of one store.
const localFirstBase = () =>
  root("local-first-base", "serverApp", [], [
    {
      kind: "serverConfig",
      id: "serverConfig",
      children: [knob("knob-processProfile", "ProcessProfile", "AllInOne")],
    },
  ]);

const offlineLanes = () => [
  { lane: "device-a", ops: [{ op: "append", stamp: 1, node: dataType("Note", "Note") }] },
  { lane: "device-b", ops: [{ op: "append", stamp: 2, node: dataType("Highlight", "Highlight") }] },
];

// ── §12.6 the placement locality ─────────────────────────────────────
//
// The derived members here are the OUTCOME and what supports it — the
// region a flow is sealed within, or the routes that admitted its
// crossings — and they are RESOLVED from the vector's own placement
// rather than typed, for the reason every derived member in this file
// is. A placement somebody typed the answer into is a placement nobody
// resolved.
//
// The model states the outcome it means and this refuses to encode a
// model whose content resolves to a different one. That is not belt and
// braces: the three reject vectors differ from the two positive ones by
// a single member each, so a perturbation that fixed the fault while
// leaving the label alone would otherwise emit a "reject" vector nothing
// rejects.

const regionAssignment = (r) =>
  obj([
    ["site", str(r.site)],
    ["region", str(r.region)],
  ]);

const regionRoute = (r) =>
  obj([
    ["id", str(r.id)],
    ["from", str(r.from)],
    ["to", str(r.to)],
    ["basis", str(r.basis)],
  ]);

/**
 * §12.6 — one flow. `pin` is the flow's OWN claim about where it runs and
 * is omitted when it makes none, on §4.5's rule: a flow that says nothing
 * about its region and one that says "no region" are not the same flow.
 */
const siteFlow = (f) =>
  obj([
    ["id", str(f.id)],
    ["from", str(f.from)],
    ["to", str(f.to)],
    ["carries", arr(f.carries.map(str))],
    ["pin", f.pin == null ? null : str(f.pin)],
  ]);

/** §12.6 — resolve every flow against the placement, from the model's own content. */
const resolvePlacement = (v) => {
  const regionOf = (site) => v.placement.regions.find((r) => r.site === site)?.region;
  const routeFor = (from, to) => v.placement.routes.find((r) => r.from === from && r.to === to);

  const unplaced = [];
  const crossings = [];
  const pinFaults = [];

  for (const f of v.flows) {
    for (const site of [f.from, f.to]) {
      if (regionOf(site) === undefined && !unplaced.includes(site)) unplaced.push(site);
    }
    const a = regionOf(f.from);
    const b = regionOf(f.to);
    // A flow naming an unplaced site contributes NO crossing: a fact derived
    // from a term that does not resolve is an invented fact, and the missing
    // region is already reported.
    if (a === undefined || b === undefined) continue;
    if (f.pin != null && f.pin !== a) pinFaults.push(f.id);
    crossings.push({ id: f.id, from: a, to: b, route: a === b ? undefined : routeFor(a, b)?.id });
  }

  const faults = [];
  if (unplaced.length) faults.push("region-undeclared");
  if (crossings.some((c) => c.from !== c.to && c.route === undefined)) faults.push("egress-undeclared");
  if (pinFaults.length) faults.push("pin-mismatched");

  const regions = [...new Set(crossings.flatMap((c) => [c.from, c.to]))];
  return {
    faults,
    outcome: faults.length ? "refuse" : regions.length === 1 ? "sealed" : "routed",
    region: regions.length === 1 ? regions[0] : undefined,
    routes: [...new Set(crossings.map((c) => c.route).filter((r) => r !== undefined))].sort(cmpCodePoints),
  };
};

const placementLocality = (v) => {
  const run = resolvePlacement(v);
  if (run.outcome !== v.outcome) {
    throw new Error(
      `§12.6: the model records outcome "${v.outcome}" and its own content resolves to "${run.outcome}"` +
        (run.faults.length ? ` (${run.faults.join(", ")})` : ""),
    );
  }
  return obj([
    ["family", str("placement-locality")],
    ["demonstrates", arr(v.demonstrates.map(facetClaim))],
    ["composition", node(v.composition)],
    [
      "placement",
      obj([
        ["regions", arr(v.placement.regions.map(regionAssignment))],
        ["routes", arr(v.placement.routes.map(regionRoute))],
      ]),
    ],
    ["flows", arr(v.flows.map(siteFlow))],
    [
      "expect",
      obj([
        ["outcome", str(run.outcome)],
        // Both supporting members are scoped to the outcome they support and
        // omitted otherwise (§4.5). A refused placement can still happen to
        // resolve every flow it DID resolve into one region, and recording
        // that as the region it is sealed within would be recording a
        // conclusion the refusal withdrew.
        ["region", run.outcome === "sealed" ? str(run.region) : null],
        ["routes", run.outcome === "routed" ? arr(run.routes.map(str)) : null],
      ]),
    ],
  ]);
};

// The one composition and the one flow set every locality vector carries.
// SHARED deliberately: the two corpus-level pair rules (§12.6) match a
// positive vector against its perturbation on exactly these two members, so
// a vector that quietly used a different composition would not be a
// perturbation of anything and the pair would silently stop existing.
const regionalComposition = () =>
  root("regional-order-rollup", "serverApp", [], [
    {
      kind: "serverConfig",
      id: "serverConfig",
      children: [knob("knob-entityStore", "EntityStore", "enabled")],
    },
    dataType("Order", "Order"),
  ]);

// `leg-a` pins itself and `leg-b` does not, so the positive vectors exercise
// both — a flow whose own claim agrees with the placement, and one that makes
// no claim and is resolved by the placement alone.
const rollupFlows = () => [
  { id: "leg-a", from: "site-a", to: "hq", carries: ["orderCount", "revenueTotal"], pin: "eu-west" },
  { id: "leg-b", from: "site-b", to: "hq", carries: ["orderCount", "revenueTotal"] },
];

const ADEQUACY = "a recorded finding of adequacy between the two supervisory regimes";

// ── §12.7 the incremental recompute ──────────────────────────────────
//
// The derived members here are the RESULT a full evaluation over the
// changed source produces and the three footprints that account for the
// work — and they are EVALUATED from the vector's own source, pipeline
// and edit stream rather than typed, for the reason every derived member
// in this file is. A result somebody typed the answer into is a result
// nobody evaluated.
//
// The model states the class of work its refresh means and this refuses
// to encode a model whose content resolves to a different one: the two
// declining vectors differ from the propagating one by a single member
// each — one verb, one scheme — so a perturbation that fixed the decline
// while leaving the label alone would otherwise emit a vector claiming
// something its own content does not do.

/**
 * §12.7 — a cell is an integer, a string, or the NULL cell a bounded-frame
 * window's first row in a partition necessarily produces. The null cell is a
 * PRESENT cell carrying no value, which is a different thing from the absent
 * cell §12.7 still does not carry: an array element has no name to omit, so
 * absence would need a spelling §4.5 does not have, whereas this is a spelled
 * cell kind registered additively like any other member of the algebra. Its
 * boolean rides as the string §4.5 requires — there is no JSON `true` anywhere
 * in this format.
 */
const cell = (c) =>
  c === null
    ? obj([["null", wireBool(true)]])
    : typeof c === "number"
      ? obj([["int", int(c)]])
      : obj([["string", str(c)]]);

const tableColumn = (c) =>
  obj([
    ["name", str(c.name)],
    ["type", str(c.type)],
  ]);

/** §12.7 — a table: its columns, and its rows as cells co-indexed with them. */
const dataTable = (t) =>
  obj([
    ["columns", arr(t.columns.map(tableColumn))],
    ["rows", arr(t.rows.map((r) => obj([["cells", arr(r.map(cell))]])))],
  ]);

const colExpr = (e) => {
  if (e.expr === "column") return obj([["expr", str("column")], ["name", str(e.name)]]);
  if (e.expr === "literal") return obj([["expr", str("literal")], ["int", int(e.int)]]);
  if (e.expr === "binary") {
    return obj([
      ["expr", str("binary")],
      ["op", str(e.op)],
      ["left", colExpr(e.left)],
      ["right", colExpr(e.right)],
    ]);
  }
  throw new Error(`§12.7: unregistered expression "${e.expr}"`);
};

const pipelineStep = (s) => {
  if (s.verb === "filter") return obj([["verb", str("filter")], ["where", colExpr(s.where)]]);
  if (s.verb === "derive") {
    return obj([["verb", str("derive")], ["column", str(s.column)], ["value", colExpr(s.value)]]);
  }
  if (s.verb === "groupBy") {
    return obj([
      ["verb", str("groupBy")],
      ["keys", arr(s.keys.map(str))],
      [
        "aggregates",
        arr(
          s.aggregates.map((a) =>
            obj([["name", str(a.name)], ["fn", str(a.fn)], ["of", str(a.of)]]),
          ),
        ),
      ],
    ]);
  }
  if (s.verb === "sort") {
    return obj([
      ["verb", str("sort")],
      [
        "by",
        arr(s.by.map((b) => obj([["column", str(b.column)], ["direction", str(b.direction)]]))),
      ],
    ]);
  }
  if (s.verb === "window") {
    return obj([
      ["verb", str("window")],
      ["partitionBy", arr(s.partitionBy.map(str))],
      [
        "orderBy",
        arr(s.orderBy.map((b) => obj([["column", str(b.column)], ["direction", str(b.direction)]]))),
      ],
      ["fn", str(s.fn)],
      ["of", str(s.of)],
      ["as", str(s.as)],
    ]);
  }
  if (s.verb === "join") {
    return obj([
      ["verb", str("join")],
      ["how", str(s.how)],
      ["on", arr(s.on.map((p) => obj([["left", str(p.left)], ["right", str(p.right)]])))],
      ["source", dataTable(s.source)],
    ]);
  }
  throw new Error(`§12.7: unregistered verb "${s.verb}"`);
};

/**
 * §12.7 — one edit. `key` is omitted from the stream under the ordinal
 * scheme on §4.5's rule: a stream that names no key column and one that
 * names an empty one are not the same stream.
 */
const editOp = (o) => {
  if (o.op === "setCell") {
    return obj([
      ["op", str("setCell")],
      ["row", str(o.row)],
      ["column", str(o.column)],
      ["value", cell(o.value)],
    ]);
  }
  if (o.op === "appendRow") return obj([["op", str("appendRow")], ["cells", arr(o.cells.map(cell))]]);
  if (o.op === "removeRow") return obj([["op", str("removeRow")], ["row", str(o.row)]]);
  throw new Error(`§12.7: unregistered edit op "${o.op}"`);
};

const editStream = (e) =>
  obj([
    ["scheme", str(e.scheme)],
    ["key", e.scheme === "identity" ? str(e.key) : null],
    ["ops", arr(e.ops.map(editOp))],
  ]);

/** §12.7 — the footprint record: what it ran against, what it produced, and what it recomputed. */
const footprint = (f) =>
  obj([
    ["sourceRows", int(f.sourceRows)],
    ["resultRows", int(f.resultRows)],
    [
      "recompute",
      obj([
        ["kind", str(f.recompute.kind)],
        ["rowsEvaluated", f.recompute.rowsEvaluated == null ? null : int(f.recompute.rowsEvaluated)],
        [
          "groupsRecomputed",
          f.recompute.groupsRecomputed == null ? null : int(f.recompute.groupsRecomputed),
        ],
        ["reason", f.recompute.reason == null ? null : str(f.recompute.reason)],
        ["verb", f.recompute.verb == null ? null : str(f.recompute.verb)],
      ]),
    ],
  ]);

// ── §12.7's rule, re-derived from the section text ───────────────────

const columnIndex = (columns, name) => {
  const i = columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`§12.7: no column "${name}"`);
  return i;
};

const evalCell = (e, row, columns) => {
  if (e.expr === "column") return row[columnIndex(columns, e.name)];
  if (e.expr === "literal") return e.int;
  if (e.expr === "binary") {
    const l = evalCell(e.left, row, columns);
    const r = evalCell(e.right, row, columns);
    if (e.op === "greaterThan") return l > r;
    if (e.op === "multiply") return l * r;
    throw new Error(`§12.7: unregistered operator "${e.op}"`);
  }
  throw new Error(`§12.7: unregistered expression "${e.expr}"`);
};

/** §12.7 — a derived column's type is read off the values it holds. */
const inferredType = (values) => (values.every((v) => typeof v === "number") ? "int" : "string");

const aggregateOf = (fn, values) => {
  if (fn === "count") return values.length;
  if (fn === "sum") return values.reduce((a, b) => a + b, 0);
  if (fn === "first") return values[0];
  throw new Error(`§12.7: unregistered aggregate "${fn}"`);
};

/** §12.7 — the groups a `groupBy` step induces, in first-appearance order. */
const groupsOf = (step, columns, rows) => {
  const keyIx = step.keys.map((k) => columnIndex(columns, k));
  const order = [];
  const members = new Map();
  rows.forEach((r, i) => {
    const k = JSON.stringify(keyIx.map((j) => r[j]));
    if (!members.has(k)) {
      members.set(k, []);
      order.push(k);
    }
    members.get(k).push(i);
  });
  return { keyIx, order, members };
};

const applyGroupBy = (step, columns, rows) => {
  const { keyIx, order, members } = groupsOf(step, columns, rows);
  const outColumns = [
    ...step.keys.map((k) => ({ name: k, type: columns[columnIndex(columns, k)].type })),
    ...step.aggregates.map((a) => ({
      name: a.name,
      type: a.fn === "count" || a.fn === "sum" ? "int" : columns[columnIndex(columns, a.of)].type,
    })),
  ];
  const outRows = order.map((k) => {
    const idxs = members.get(k);
    return [
      ...keyIx.map((j) => rows[idxs[0]][j]),
      ...step.aggregates.map((a) =>
        aggregateOf(a.fn, idxs.map((i) => rows[i][columnIndex(columns, a.of)])),
      ),
    ];
  });
  return { columns: outColumns, rows: outRows };
};

const applySort = (step, columns, rows) => {
  const carried = rows.map((r, i) => ({ r, i }));
  carried.sort((x, y) => {
    for (const by of step.by) {
      const j = columnIndex(columns, by.column);
      const a = x.r[j];
      const b = y.r[j];
      let d = a < b ? -1 : a > b ? 1 : 0;
      if (by.direction === "descending") d = -d;
      if (d !== 0) return d;
    }
    return x.i - y.i;
  });
  return carried.map((c) => c.r);
};

/**
 * §12.7 — the rows a `window` step's partitions induce, and the appended column
 * it computes over each partition's own order. The step emits the rows it was
 * HANDED, in the order it was handed them, one for one — the appended value is
 * what it computes, not the row's position — so nothing downstream reads a
 * different order from what a `sort`-free pipeline would have handed it.
 *
 * The step evaluates no expression of the algebra, so it contributes NOTHING to
 * `rowsEvaluated`, exactly as a `sort` and a `groupBy` do not.
 */
const applyWindow = (step, columns, rows) => {
  if (step.fn !== "lag") throw new Error(`§12.7: unregistered window function "${step.fn}"`);
  const partIx = step.partitionBy.map((k) => columnIndex(columns, k));
  const ofIx = columnIndex(columns, step.of);
  const partitions = new Map();
  rows.forEach((r, i) => {
    const k = JSON.stringify(partIx.map((j) => r[j]));
    if (!partitions.has(k)) partitions.set(k, []);
    partitions.get(k).push(i);
  });
  const values = rows.map(() => null);
  for (const idxs of partitions.values()) {
    const ordered = [...idxs].sort((x, y) => {
      for (const by of step.orderBy) {
        const j = columnIndex(columns, by.column);
        let d = rows[x][j] < rows[y][j] ? -1 : rows[x][j] > rows[y][j] ? 1 : 0;
        if (by.direction === "descending") d = -d;
        if (d !== 0) return d;
      }
      return x - y;
    });
    // A bounded frame's first row in a partition has no predecessor, so the
    // null is not an edge case to be tidied away — it is what the frame says.
    ordered.forEach((row, pos) => {
      values[row] = pos === 0 ? null : rows[ordered[pos - 1]][ofIx];
    });
  }
  return {
    // The appended column's type is the type of the column it reads. It is NOT
    // inferred from the values, because a partition-leading null would infer a
    // column's type from the absence of its own value.
    columns: [...columns, { name: step.as, type: columns[ofIx].type }],
    rows: rows.map((r, i) => [...r, values[i]]),
  };
};

/**
 * §12.7 — a FILTERING join: each left row is kept or dropped on whether its key
 * matches the joined relation, and the row that is kept is emitted unchanged.
 * Evaluates no expression of the algebra, so it too contributes nothing.
 */
const applyJoin = (step, columns, rows) => {
  if (step.how !== "semi") throw new Error(`§12.7: unregistered join kind "${step.how}"`);
  const rightKey = (r) =>
    JSON.stringify(step.on.map((p) => r[columnIndex(step.source.columns, p.right)]));
  const leftKey = (r) => JSON.stringify(step.on.map((p) => r[columnIndex(columns, p.left)]));
  const keys = new Set(step.source.rows.map(rightKey));
  return { columns, rows: rows.filter((r) => keys.has(leftKey(r))) };
};

/**
 * §12.7 — a full evaluation of the pipeline over a table. `evaluations`
 * counts ROW EVALUATIONS AT STEPS: a row passing through three steps is
 * evaluated three times, a row a filter drops is not evaluated by the
 * steps after it, and a `groupBy` contributes none because what it
 * recomputes is groups. A `sort`, a `window` and a `join` contribute none
 * for the same reason: none of them evaluates an expression of the algebra.
 *
 * ONE SCALE, and a declined evaluation is counted on it too. Reading a
 * declined evaluation's cost off `sourceRows` charged it for a single pass,
 * so a decline compared against its own full baseline read as having done
 * LESS work than the thing it fell back to.
 */
const evaluate = (pipeline, table) => {
  let columns = table.columns;
  let rows = table.rows;
  let evaluations = 0;
  for (const step of pipeline) {
    if (step.verb === "filter") {
      evaluations += rows.length;
      rows = rows.filter((r) => evalCell(step.where, r, columns) === true);
    } else if (step.verb === "derive") {
      evaluations += rows.length;
      const values = rows.map((r) => evalCell(step.value, r, columns));
      columns = [...columns, { name: step.column, type: inferredType(values) }];
      rows = rows.map((r, i) => [...r, values[i]]);
    } else if (step.verb === "groupBy") {
      const g = applyGroupBy(step, columns, rows);
      columns = g.columns;
      rows = g.rows;
    } else if (step.verb === "sort") {
      rows = applySort(step, columns, rows);
    } else if (step.verb === "window") {
      const w = applyWindow(step, columns, rows);
      columns = w.columns;
      rows = w.rows;
    } else if (step.verb === "join") {
      rows = applyJoin(step, columns, rows).rows;
    } else {
      throw new Error(`§12.7: unregistered verb "${step.verb}"`);
    }
  }
  return { table: { columns, rows }, evaluations };
};

/**
 * §12.7 — the pipeline's incrementality, computed before any evaluation happens.
 *
 * A step propagates a delta when its output for a named row is a function of
 * that row alone (`filter`, `derive`) — or when it computes NOTHING per row and
 * merely reorders (`sort`), because the row's cells are unchanged and its
 * position is recoverable by merging the named rows into the order the previous
 * evaluation already produced.
 *
 * A step declines when it computes a value for a row from rows the stream does
 * not name (`window`, which reads a frame of the row's neighbours) or from a
 * relation the stream does not describe (`join`, whose verdict for a row reads
 * the joined relation as well as the row).
 */
const classifyPipeline = (pipeline) => {
  for (let i = 0; i < pipeline.length; i++) {
    const s = pipeline[i];
    if (s.verb === "filter" || s.verb === "derive" || s.verb === "sort") continue;
    if (s.verb === "groupBy") {
      if (i === pipeline.length - 1) continue;
      return { strategy: "referenceOnly", reason: "aggregateStepNotLast", verb: "groupBy" };
    }
    return { strategy: "referenceOnly", reason: "stepNotRowLocal", verb: s.verb };
  }
  const last = pipeline[pipeline.length - 1];
  return { strategy: last && last.verb === "groupBy" ? "rowLocalThenGroups" : "rowLocal" };
};

/**
 * §12.7 — apply the edit stream to the source, in order, against the
 * table as it stands. Returns the changed source and the identities the
 * stream named; a removed row is named and is present in nothing, which
 * is why the refresh's count is not the number of ops.
 */
const applyEdits = (source, edits) => {
  const columns = source.columns;
  const keyIx = edits.scheme === "identity" ? columnIndex(columns, edits.key) : -1;
  let rows = source.rows.map((r) => [...r]);
  const named = new Set();

  const locate = (ref) => {
    const i =
      edits.scheme === "ordinal"
        ? Number(ref)
        : rows.findIndex((r) => String(r[keyIx]) === ref);
    if (!Number.isInteger(i) || i < 0 || i >= rows.length) {
      throw new Error(`§12.7: the edit stream names row "${ref}", which the source does not carry`);
    }
    return i;
  };

  for (const o of edits.ops) {
    if (o.op === "setCell") {
      const i = locate(o.row);
      const j = columnIndex(columns, o.column);
      rows[i] = rows[i].map((c, k) => (k === j ? o.value : c));
      if (keyIx >= 0) named.add(String(rows[i][keyIx]));
    } else if (o.op === "appendRow") {
      if (o.cells.length !== columns.length) {
        throw new Error("§12.7: an appended row carries a different number of cells from the source's columns");
      }
      rows = [...rows, [...o.cells]];
      if (keyIx >= 0) named.add(String(o.cells[keyIx]));
    } else if (o.op === "removeRow") {
      const i = locate(o.row);
      if (keyIx >= 0) named.add(String(rows[i][keyIx]));
      rows = rows.filter((_, k) => k !== i);
    } else {
      throw new Error(`§12.7: unregistered edit op "${o.op}"`);
    }
  }
  return { after: { columns, rows }, named, keyIx };
};

/**
 * §12.7 — the whole rule for one vector: the changed source, the result a
 * full evaluation over it produces, and the three footprints.
 */
const recomputeRun = (v) => {
  const plan = classifyPipeline(v.pipeline);
  const { after, named, keyIx } = applyEdits(v.source, v.edits);

  const primed = evaluate(v.pipeline, v.source);
  const full = evaluate(v.pipeline, after);

  // A `fullRecompute` carries what the REFERENCE EVALUATOR itself evaluated
  // over the changed source, on the one scale every other case is counted on.
  const declined = (reason, verb) => ({
    kind: "fullRecompute",
    rowsEvaluated: full.evaluations,
    reason,
    verb,
  });
  const wholeOf = (run, table, recompute) => ({
    sourceRows: table.rows.length,
    resultRows: run.table.rows.length,
    recompute,
  });

  // A PRIME IS `primed`, whatever the plan says. Priming a declined pipeline is
  // not a fall-back — there was no prior state to fall back from, and a prime
  // evaluates everything either way. The decline and its reason belong to the
  // REFRESH, where the fall-back actually happens; a consumer that wants to know
  // beforehand asks the plan, not the footprint.
  const declinedByPipeline = plan.strategy === "referenceOnly";
  const primeRecompute = { kind: "primed", rowsEvaluated: primed.evaluations };
  const fullRecomputeRec = { kind: "primed", rowsEvaluated: full.evaluations };

  let refreshRecompute;
  if (declinedByPipeline) {
    refreshRecompute = declined(plan.reason, plan.verb);
  } else if (v.edits.scheme === "ordinal") {
    refreshRecompute = declined("ordinalAddressing", undefined);
  } else if (!v.edits.ops.length) {
    refreshRecompute = { kind: "reusedPrior" };
  } else {
    // The row-local prefix, walked over the NAMED rows alone.
    let columns = after.columns;
    let rows = after.rows.filter((r) => named.has(String(r[keyIx])));
    let evaluations = 0;
    let groupStep = null;
    for (const step of v.pipeline) {
      if (step.verb === "filter") {
        evaluations += rows.length;
        rows = rows.filter((r) => evalCell(step.where, r, columns) === true);
      } else if (step.verb === "derive") {
        evaluations += rows.length;
        const values = rows.map((r) => evalCell(step.value, r, columns));
        columns = [...columns, { name: step.column, type: inferredType(values) }];
        rows = rows.map((r, i) => [...r, values[i]]);
      } else if (step.verb === "sort") {
        // The named rows are merged into the order the previous evaluation
        // produced. Nothing is evaluated, so nothing is counted.
        rows = applySort(step, columns, rows);
      } else if (step.verb === "groupBy") {
        groupStep = step;
        break;
      }
    }
    if (groupStep) {
      // A group is recomputed when its ORDERED membership moved, never
      // merely because a row in it was named: `first`, `last` and a
      // floating-point sum all move when members are only reordered.
      const beforePrefix = { columns: v.source.columns, rows: v.source.rows };
      const afterPrefix = { columns: after.columns, rows: after.rows };
      const prefix = v.pipeline.slice(0, v.pipeline.indexOf(groupStep));
      const b = evaluate(prefix, beforePrefix);
      const a = evaluate(prefix, afterPrefix);
      const membership = (run) => {
        const g = groupsOf(groupStep, run.table.columns, run.table.rows);
        const idIx = columnIndex(run.table.columns, v.edits.key);
        return new Map(
          g.order.map((k) => [k, g.members.get(k).map((i) => String(run.table.rows[i][idIx]))]),
        );
      };
      const mb = membership(b);
      const ma = membership(a);
      let groupsRecomputed = 0;
      for (const k of new Set([...mb.keys(), ...ma.keys()])) {
        if (JSON.stringify(mb.get(k)) !== JSON.stringify(ma.get(k))) groupsRecomputed += 1;
      }
      refreshRecompute = { kind: "groupsRecomputed", rowsEvaluated: evaluations, groupsRecomputed };
    } else {
      refreshRecompute = { kind: "rowsRecomputed", rowsEvaluated: evaluations };
    }
  }

  return {
    plan,
    after,
    result: full.table,
    prime: wholeOf(primed, v.source, primeRecompute),
    full: wholeOf(full, after, fullRecomputeRec),
    refresh: { sourceRows: after.rows.length, resultRows: full.table.rows.length, recompute: refreshRecompute },
  };
};

const incrementalRecompute = (v) => {
  const run = recomputeRun(v);
  if (run.refresh.recompute.kind !== v.refreshKind) {
    throw new Error(
      `§12.7: the model records a "${v.refreshKind}" refresh and its own content resolves to ` +
        `"${run.refresh.recompute.kind}"`,
    );
  }
  return obj([
    ["family", str("incremental-recompute")],
    ["demonstrates", arr(v.demonstrates.map(facetClaim))],
    ["composition", node(v.composition)],
    ["dataType", str(v.dataType)],
    ["pipeline", arr(v.pipeline.map(pipelineStep))],
    ["source", dataTable(v.source)],
    ["edits", editStream(v.edits)],
    [
      "expect",
      obj([
        ["outcome", str("equivalent")],
        ["result", dataTable(run.result)],
        ["prime", footprint(run.prime)],
        ["full", footprint(run.full)],
        ["refresh", footprint(run.refresh)],
      ]),
    ],
  ]);
};

// The one composition, source and edit every vector of this family is
// built from. SHARED deliberately: §12.7's pair rule matches the
// row-local vector against its re-addressed partner on exactly the
// composition, the pipeline, the source and the row named, so a vector
// that quietly used a different one would not be a partner to anything
// and the pair would silently stop existing.
const evaluatedComposition = () =>
  root("regional-order-rollup-analytics", "serverApp", [], [
    {
      kind: "serverConfig",
      id: "serverConfig",
      children: [knob("knob-entityStore", "EntityStore", "enabled")],
    },
    dataType("Order", "Order"),
  ]);

const ORDER_COLUMNS = [
  { name: "id", type: "string" },
  { name: "a", type: "int" },
  { name: "b", type: "int" },
];

const orderSource = () => ({
  columns: ORDER_COLUMNS,
  rows: [
    ["r1", 3, 0],
    ["r2", -2, 1],
    ["r3", 5, 0],
    ["r4", 1, 1],
    ["r5", -4, 2],
    ["r6", 2, 2],
  ],
});

const colOf = (name) => ({ expr: "column", name });
const litOf = (n) => ({ expr: "literal", int: n });
const binOf = (op, left, right) => ({ expr: "binary", op, left, right });

/** Row-local throughout: a filter and a derived column. */
const rowLocalPipeline = () => [
  { verb: "filter", where: binOf("greaterThan", colOf("a"), litOf(0)) },
  { verb: "derive", column: "d", value: binOf("multiply", colOf("a"), litOf(2)) },
];

/** A row-local prefix and a final maintained aggregate. */
const groupingPipeline = () => [
  { verb: "filter", where: binOf("greaterThan", colOf("a"), litOf(-5)) },
  { verb: "derive", column: "d", value: binOf("multiply", colOf("a"), litOf(2)) },
  {
    verb: "groupBy",
    keys: ["b"],
    aggregates: [
      { name: "n", fn: "count", of: "a" },
      { name: "s", fn: "sum", of: "d" },
      { name: "f", fn: "first", of: "id" },
    ],
  },
];

/** The same filter, followed by a step that reorders and computes nothing. */
const orderDependentPipeline = () => [
  { verb: "filter", where: binOf("greaterThan", colOf("a"), litOf(0)) },
  { verb: "sort", by: [{ column: "a", direction: "ascending" }] },
];

/**
 * The same filter, followed by a bounded-frame window: each row's `prev` is the
 * value of `a` in the row before it within its own partition's order. The frame
 * is a fixed neighbourhood of the row and the step emits its input rows one for
 * one — and it still reads rows the edit stream does not name.
 */
const windowPipeline = () => [
  { verb: "filter", where: binOf("greaterThan", colOf("a"), litOf(0)) },
  {
    verb: "window",
    partitionBy: ["b"],
    orderBy: [{ column: "a", direction: "ascending" }],
    fn: "lag",
    of: "a",
    as: "prev",
  },
];

/**
 * The same filter, followed by a FILTERING join against a two-row lookup. Each
 * left row is kept or dropped and emitted unchanged, so the decline is not
 * about the shape of the output: it is that the verdict for a row reads a
 * relation the edit stream describes nothing about.
 */
const joinPipeline = () => [
  { verb: "filter", where: binOf("greaterThan", colOf("a"), litOf(0)) },
  {
    verb: "join",
    how: "semi",
    on: [{ left: "b", right: "k" }],
    source: { columns: [{ name: "k", type: "int" }], rows: [[0], [2]] },
  },
];

/** The one point edit, spelled by identity and by position. */
const pointEditByIdentity = () => ({
  scheme: "identity",
  key: "id",
  ops: [{ op: "setCell", row: "r4", column: "a", value: 9 }],
});

const pointEditByOrdinal = () => ({
  scheme: "ordinal",
  ops: [{ op: "setCell", row: "3", column: "a", value: 9 }],
});

const facetVectors = {
  // ── kill-and-replay — §12.1 ───────────────────────────────────────

  // The default posture of this profile's evaluators: an in-process
  // performer whose intent is never written down, killed mid-performance
  // and never retried. The loss is the demonstration.
  "kill-and-replay/lost-in-flight": {
    encode: killAndReplay,
    demonstrates: [
      { axis: "delivery", value: "atMostOnce" },
      { axis: "restart", value: "lostOnRestart" },
    ],
    root: root("session-lost-in-flight", "serverApp", [], []),
    steps: [
      { step: "append", journaled: true, node: dataType("Reminder", "Reminder") },
      { step: "perform", performer: "notify", dedupe: "none", journaled: false },
      { step: "append", journaled: true, node: dataType("ReminderLog", "ReminderLog") },
    ],
    atStep: 2,
    outcome: "replayed",
  },

  // The same session with the performer's intent journaled: the replay
  // is owed the work, re-enters it, and nothing dedupes the repeat. The
  // duplicate is the demonstration, and it is the price of never losing.
  "kill-and-replay/retried-duplicate": {
    encode: killAndReplay,
    demonstrates: [
      { axis: "delivery", value: "atLeastOnce" },
      { axis: "idempotency", value: "nonIdempotent" },
      { axis: "restart", value: "retriedAfterRestart" },
    ],
    root: root("session-retried-duplicate", "serverApp", [], []),
    steps: [
      { step: "append", journaled: true, node: dataType("Reminder", "Reminder") },
      { step: "perform", performer: "notify", dedupe: "none", journaled: true },
      { step: "append", journaled: true, node: dataType("ReminderLog", "ReminderLog") },
    ],
    atStep: 2,
    outcome: "replayed",
  },

  // An operation that is safe to repeat because repeating it is the same
  // operation — not because anything remembered it. The distinction is
  // the whole of what separates `idempotent` from `idempotentWithStore`,
  // and the step's `dedupe` member is where it is written down.
  "kill-and-replay/repeatable-read": {
    encode: killAndReplay,
    demonstrates: [{ axis: "idempotency", value: "idempotent" }],
    root: root("session-repeatable-read", "serverApp", [], []),
    steps: [
      { step: "append", journaled: true, node: dataType("Entry", "Entry") },
      { step: "perform", performer: "recomputeIndex", dedupe: "repeatable", journaled: true },
      { step: "append", journaled: true, node: dataType("EntryIndex", "EntryIndex") },
    ],
    atStep: 2,
    outcome: "replayed",
  },

  // The family's own falsifier: a kill on an append whose intent was
  // never journaled, so the replay CANNOT reproduce the projection. The
  // obligation is to say so, not to emit the shorter composition.
  "kill-and-replay/reject-unrecoverable-append": {
    encode: killAndReplay,
    demonstrates: [],
    root: root("session-unrecoverable-append", "serverApp", [], []),
    steps: [
      { step: "append", journaled: true, node: dataType("Entry", "Entry") },
      { step: "append", journaled: false, node: dataType("Tag", "Tag") },
      { step: "append", journaled: true, node: dataType("EntryTag", "EntryTag") },
    ],
    atStep: 2,
    outcome: "refuse",
  },

  // ── partition-and-fold — §12.2 ────────────────────────────────────

  "partition-and-fold/independent-lanes": {
    encode: partitionAndFold,
    demonstrates: [{ axis: "convergence", value: "convergentFold" }],
    base: foldBase(),
    lanes: independentLanes(),
    outcome: "folded",
  },

  // The same two lanes, presented in the other order. Its fold digest is
  // the previous vector's, and the pair is what separates a fold from a
  // concatenation in arrival order — a concatenation reproduces either
  // one of them alone.
  "partition-and-fold/arrival-order-immaterial": {
    encode: partitionAndFold,
    demonstrates: [{ axis: "convergence", value: "convergentFold" }],
    base: foldBase(),
    lanes: independentLanes().reverse(),
    outcome: "folded",
  },

  // Both ops at one stamp, so only the lane-id tiebreak decides. The node
  // ids are chosen so that ordering by arrival and ordering by content
  // both give the OTHER answer.
  "partition-and-fold/stamp-tie-lane-order": {
    encode: partitionAndFold,
    demonstrates: [{ axis: "convergence", value: "convergentFold" }],
    base: foldBase(),
    lanes: [
      { lane: "lane-b", ops: [{ op: "append", stamp: 1, node: dataType("Alpha", "Alpha") }] },
      { lane: "lane-a", ops: [{ op: "append", stamp: 1, node: dataType("Beta", "Beta") }] },
    ],
    outcome: "folded",
  },

  // Two lanes writing one member of one node to different values. A total
  // order exists over these ops and is deliberately NOT used to pick a
  // winner: ordering independent work is what the order is for, and
  // silently resolving interference with it is what this vector forbids.
  "partition-and-fold/reject-conflicting-write": {
    encode: partitionAndFold,
    demonstrates: [{ axis: "convergence", value: "convergentFold" }],
    base: foldBase(),
    lanes: [
      {
        lane: "lane-a",
        ops: [{ op: "write", stamp: 1, target: "knob-processProfile", member: "value", value: "WebOnly" }],
      },
      {
        lane: "lane-b",
        ops: [{ op: "write", stamp: 2, target: "knob-processProfile", member: "value", value: "WorkerOnly" }],
      },
    ],
    outcome: "refuse",
  },

  // Perfectly foldable lanes, refused — because the holder admits one
  // authorship stream and folds nothing. The vector's content is
  // deliberately the independent-lane case: a holder that passes this by
  // folding it has not demonstrated `singleWriter`, it has demonstrated
  // being something else.
  "partition-and-fold/reject-single-writer": {
    encode: partitionAndFold,
    demonstrates: [{ axis: "convergence", value: "singleWriter" }],
    base: foldBase(),
    lanes: independentLanes(),
    outcome: "refuse",
  },

  // ── durable-session-host — the same two families, a second profile ─
  //
  // A facet vector is scoped to a PROFILE, so a second profile
  // demonstrates its own declaration or demonstrates nothing: the
  // vectors above certify `server-app-host` and say nothing about
  // anybody else, which is §11.3 working rather than duplication.
  // What earns this profile its own set is two values — the whole of
  // the difference between the two declarations — and they are the two
  // that cost a mechanism rather than a word.

  // The floor, and it is declared deliberately. A durable placement does
  // not make every step durable: a performer whose intent was never
  // journaled leaves no record that it was owed, so the replay cannot
  // know to resume it. Declaring the weak values beside the strong ones
  // is what keeps the strong ones legible.
  "kill-and-replay/durable-lost-unjournaled": {
    encode: killAndReplay,
    demonstrates: [
      { axis: "delivery", value: "atMostOnce" },
      { axis: "restart", value: "lostOnRestart" },
    ],
    root: root("session-lost-unjournaled", "serverApp", [], []),
    steps: [
      { step: "append", journaled: true, node: dataType("Reminder", "Reminder") },
      { step: "perform", performer: "notify", dedupe: "none", journaled: false },
      { step: "append", journaled: true, node: dataType("ReminderLog", "ReminderLog") },
    ],
    atStep: 2,
    outcome: "replayed",
  },

  // Journaled, and nothing dedupes the repeat: the replay is owed the
  // work and the effect takes twice. The price of never losing, priced.
  "kill-and-replay/durable-journaled-retry-duplicate": {
    encode: killAndReplay,
    demonstrates: [
      { axis: "delivery", value: "atLeastOnce" },
      { axis: "idempotency", value: "nonIdempotent" },
      { axis: "restart", value: "retriedAfterRestart" },
    ],
    root: root("session-journaled-retry-duplicate", "serverApp", [], []),
    steps: [
      { step: "append", journaled: true, node: dataType("Invoice", "Invoice") },
      { step: "perform", performer: "dispatch", dedupe: "none", journaled: true },
      { step: "append", journaled: true, node: dataType("InvoiceLog", "InvoiceLog") },
    ],
    atStep: 2,
    outcome: "replayed",
  },

  // THE VECTOR THIS PROFILE EXISTS FOR. Entered twice, took effect once,
  // and the reason is `dedupe: store` — the session's own journaled
  // state remembered the first attempt. `server-app-host` declines both
  // values this carries, on the stated ground that its family composes
  // no such store; that ground does not hold for a durable placement,
  // and this is where the difference stops being an argument.
  "kill-and-replay/durable-store-deduped-once": {
    encode: killAndReplay,
    demonstrates: [
      { axis: "delivery", value: "exactlyOnceEffective" },
      { axis: "idempotency", value: "idempotentWithStore" },
    ],
    root: root("session-store-deduped-once", "serverApp", [], []),
    steps: [
      { step: "append", journaled: true, node: dataType("Payment", "Payment") },
      { step: "perform", performer: "charge", dedupe: "store", journaled: true },
      { step: "append", journaled: true, node: dataType("PaymentLog", "PaymentLog") },
    ],
    atStep: 2,
    outcome: "replayed",
  },

  // The control for the vector above, and it is not optional. Both read
  // as entered twice and took effect once; only `dedupe` separates a
  // store that remembers from an operation that simply has no second
  // effect. Without the pair, an evaluator whose operations happen to be
  // repeatable certifies a store it does not have.
  "kill-and-replay/durable-repeatable-read": {
    encode: killAndReplay,
    demonstrates: [{ axis: "idempotency", value: "idempotent" }],
    root: root("session-repeatable-read", "serverApp", [], []),
    steps: [
      { step: "append", journaled: true, node: dataType("Balance", "Balance") },
      { step: "perform", performer: "read", dedupe: "repeatable", journaled: true },
      { step: "append", journaled: true, node: dataType("BalanceLog", "BalanceLog") },
    ],
    atStep: 2,
    outcome: "replayed",
  },

  // The family's own falsifier, scoped to this profile rather than
  // inherited on trust — a durable placement is exactly the kind of
  // evaluator that might be assumed to have no unrecoverable replay, and
  // the assumption is what the vector exists to refuse.
  "kill-and-replay/durable-reject-unrecoverable-append": {
    encode: killAndReplay,
    demonstrates: [],
    root: root("session-reject-unrecoverable-append", "serverApp", [], []),
    steps: [
      { step: "append", journaled: true, node: dataType("Ledger", "Ledger") },
      { step: "append", journaled: false, node: dataType("LedgerEntry", "LedgerEntry") },
      { step: "append", journaled: true, node: dataType("LedgerIndex", "LedgerIndex") },
    ],
    atStep: 2,
    outcome: "refuse",
  },

  // One session is one authorship stream: the live session is the
  // writer, and there is never a second one to fold against. The lanes
  // are deliberately NON-interfering — a holder refusing a conflicting
  // pair might be refusing the conflict rather than the concurrency.
  "partition-and-fold/durable-reject-concurrent-authorship": {
    encode: partitionAndFold,
    demonstrates: [{ axis: "convergence", value: "singleWriter" }],
    base: root("durable-fold-base", "serverApp", [], [
      {
        kind: "serverConfig",
        id: "serverConfig",
        children: [knob("knob-processProfile", "ProcessProfile", "AllInOne")],
      },
    ]),
    lanes: [
      { lane: "lane-a", ops: [{ op: "append", stamp: 1, node: dataType("Session", "Session") }] },
      { lane: "lane-b", ops: [{ op: "append", stamp: 2, node: dataType("SessionTag", "SessionTag") }] },
    ],
    outcome: "refuse",
  },


  // ── local-first-host — the placement that FOLDS ───────────────────
  //
  // The third profile's set, and the axis that earns it is `convergence`.
  // Both placements above declare `singleWriter` — one because it is
  // handed a composition value, the other because a session admits one
  // writer by construction — and neither ground survives a device that
  // must stay usable while it can reach nothing else.
  //
  // Note what the fold vectors here are NOT: they are not the `core`
  // vectors re-pointed. §11.3 scopes a demonstration to a profile, and a
  // vector certifying `core`'s store-side fold says nothing about an
  // evaluator whose lanes accumulate on separate devices — which is the
  // realistic misreading the gate's own self-test perturbs for.

  // Two devices, each authoring while it can reach nothing else, folded
  // on reconnect under the total order. The base case: no device's work
  // is lost and no order is invented.
  "partition-and-fold/local-first-offline-lanes": {
    encode: partitionAndFold,
    demonstrates: [{ axis: "convergence", value: "convergentFold" }],
    base: localFirstBase(),
    lanes: offlineLanes(),
    outcome: "folded",
  },

  // The same two lanes, reconnecting in the other order, folding to the
  // same digest. Which device reconnects first is the one thing about a
  // partition nobody controls, so a holder whose answer depends on it
  // has not folded — and it reproduces either vector alone perfectly.
  "partition-and-fold/local-first-reconnect-order-immaterial": {
    encode: partitionAndFold,
    demonstrates: [{ axis: "convergence", value: "convergentFold" }],
    base: localFirstBase(),
    lanes: offlineLanes().reverse(),
    outcome: "folded",
  },

  // THE HALF THAT IS NOT A FORMALITY. Two devices changed one setting
  // to different values while neither could see the other. A total order
  // exists over these ops and using it here would produce a composition
  // neither author wrote, silently, with a digest that reproduces on
  // every machine. §12.2 requires this half of `convergentFold`
  // separately for exactly that reason: a holder that folds correctly
  // and takes the later stamp passes the two vectors above byte for
  // byte.
  "partition-and-fold/local-first-reject-conflicting-write": {
    encode: partitionAndFold,
    demonstrates: [{ axis: "convergence", value: "convergentFold" }],
    base: localFirstBase(),
    lanes: [
      {
        lane: "device-a",
        ops: [{ op: "write", stamp: 3, target: "knob-processProfile", member: "value", value: "WebOnly" }],
      },
      {
        lane: "device-b",
        ops: [{ op: "write", stamp: 4, target: "knob-processProfile", member: "value", value: "WorkerOnly" }],
      },
    ],
    outcome: "refuse",
  },

  // The delivery, idempotency and restart values, in one session,
  // because on this placement they are one mechanism seen three ways.
  // An operation is written to its writer's lane BEFORE it is presented,
  // so the interrupted presentation is owed and re-entered
  // (`retriedAfterRestart`), never dropped (`atLeastOnce`) — and takes
  // effect once because presenting an op the fold already has is
  // presenting the same op, not because anything remembered it
  // (`idempotent`, `dedupe: repeatable`, and NOT `store`).
  "kill-and-replay/local-first-resend-after-reconnect": {
    encode: killAndReplay,
    demonstrates: [
      { axis: "delivery", value: "atLeastOnce" },
      { axis: "idempotency", value: "idempotent" },
      { axis: "restart", value: "retriedAfterRestart" },
    ],
    root: root("session-local-first-resend", "serverApp", [], []),
    steps: [
      { step: "append", journaled: true, node: dataType("Note", "Note") },
      { step: "perform", performer: "presentLane", dedupe: "repeatable", journaled: true },
      { step: "append", journaled: true, node: dataType("NoteIndex", "NoteIndex") },
    ],
    atStep: 2,
    outcome: "replayed",
  },

  // The family's own falsifier, scoped here rather than inherited on
  // trust — and it matters more on this placement than on either of the
  // others. An operation that never reached a lane cannot be recovered
  // from one, and a device that carried on with the gap would present a
  // composition that folds perfectly against every peer and is missing
  // something nobody can name. The obligation is to say so.
  "kill-and-replay/local-first-reject-unrecoverable-append": {
    encode: killAndReplay,
    demonstrates: [],
    root: root("session-local-first-unrecoverable-append", "serverApp", [], []),
    steps: [
      { step: "append", journaled: true, node: dataType("Note", "Note") },
      { step: "append", journaled: false, node: dataType("Highlight", "Highlight") },
      { step: "append", journaled: true, node: dataType("NoteIndex", "NoteIndex") },
    ],
    atStep: 2,
    outcome: "refuse",
  },

  // ── edge-worker-host — the placement that is PINNED ───────────────
  //
  // The fourth profile's set, and the axis that earns it is `locality`.
  // Everything else this placement does, one of the three above already
  // does: it journals to a store, it re-enters interrupted work, it
  // admits one writer. What none of them can say is WHERE, and where is
  // the question a deployment at a named point of presence exists to
  // answer.
  //
  // Its delivery and idempotency declarations stop one value short of
  // `durable-session-host`'s, and the shortfall is the honest part: the
  // durable store here is the PLATFORM's, so an effective-exactly-once
  // claim would be a claim about somebody else's product. The three
  // sessions below are what is left when that claim is declined.

  // The floor. A performer whose intent never reached the platform's
  // store leaves no record that it was owed, so the next activation
  // cannot know to resume it. Declared deliberately: a placement that
  // named only its strong values would be describing a different one.
  "kill-and-replay/edge-lost-unjournaled": {
    encode: killAndReplay,
    demonstrates: [
      { axis: "delivery", value: "atMostOnce" },
      { axis: "restart", value: "lostOnRestart" },
    ],
    root: root("session-edge-lost-unjournaled", "serverApp", [], []),
    steps: [
      { step: "append", journaled: true, node: dataType("Visit", "Visit") },
      { step: "perform", performer: "notifySubscriber", dedupe: "none", journaled: false },
      { step: "append", journaled: true, node: dataType("VisitLog", "VisitLog") },
    ],
    atStep: 2,
    outcome: "replayed",
  },

  // Journaled first, and nothing dedupes the repeat. This is the vector
  // that prices the profile's whole posture: the record reaches the
  // store before the work is attempted, so the work is never lost — and
  // the platform's store is not asked to remember whether the attempt
  // already happened, so it takes twice.
  "kill-and-replay/edge-journaled-retry-duplicate": {
    encode: killAndReplay,
    demonstrates: [
      { axis: "delivery", value: "atLeastOnce" },
      { axis: "idempotency", value: "nonIdempotent" },
      { axis: "restart", value: "retriedAfterRestart" },
    ],
    root: root("session-edge-journaled-retry", "serverApp", [], []),
    steps: [
      { step: "append", journaled: true, node: dataType("Order", "Order") },
      { step: "perform", performer: "dispatchWebhook", dedupe: "none", journaled: true },
      { step: "append", journaled: true, node: dataType("OrderLog", "OrderLog") },
    ],
    atStep: 2,
    outcome: "replayed",
  },

  // Entered twice, took effect once, and NOTHING remembered anything —
  // the operation simply has no second effect. Beside the vector above
  // it is what separates this profile's `idempotent` from the
  // `idempotentWithStore` it declines: both read as safe to repeat, and
  // only `dedupe` says whose safety it is.
  "kill-and-replay/edge-repeatable-read": {
    encode: killAndReplay,
    demonstrates: [{ axis: "idempotency", value: "idempotent" }],
    root: root("session-edge-repeatable-read", "serverApp", [], []),
    steps: [
      { step: "append", journaled: true, node: dataType("Cart", "Cart") },
      { step: "perform", performer: "readProjection", dedupe: "repeatable", journaled: true },
      { step: "append", journaled: true, node: dataType("CartLog", "CartLog") },
    ],
    atStep: 2,
    outcome: "replayed",
  },

  // The fence. A runtime that can start a second copy of a session it
  // believed gone is the failure this placement actually has, and the
  // answer is that an activation the store hands out is presented by
  // every write and a superseded one is REFUSED. The lanes are
  // deliberately non-interfering, on the same argument the other
  // single-writer vectors make: a holder that refused a conflicting pair
  // might be refusing the conflict rather than the concurrency.
  "partition-and-fold/edge-reject-concurrent-authorship": {
    encode: partitionAndFold,
    demonstrates: [{ axis: "convergence", value: "singleWriter" }],
    base: root("edge-fold-base", "serverApp", [], [
      {
        kind: "serverConfig",
        id: "serverConfig",
        children: [knob("knob-processProfile", "ProcessProfile", "AllInOne")],
      },
    ]),
    lanes: [
      { lane: "activation-1", ops: [{ op: "append", stamp: 1, node: dataType("Cart", "Cart") }] },
      { lane: "activation-2", ops: [{ op: "append", stamp: 2, node: dataType("CartTag", "CartTag") }] },
    ],
    outcome: "refuse",
  },

  // ── placement-locality — §12.6 ────────────────────────────────────
  //
  // Three of these five share one composition and one flow set, and
  // differ only in the placement. That is the design rather than an
  // economy: the strongest thing this family can say is that MOVING A
  // SITE ACROSS A BORDER changes the answer, and it can only say it if
  // everything else is held still.

  // Every site in one region, so nothing the flow carries crosses a
  // boundary at all. The sentence this whole leg exists to be able to
  // say, and the one an operational promise cannot make.
  "placement-locality/edge-sealed-in-region": {
    encode: placementLocality,
    demonstrates: [{ axis: "locality", value: "regionSealed" }],
    composition: regionalComposition(),
    placement: {
      regions: [
        { site: "hq", region: "eu-west" },
        { site: "site-a", region: "eu-west" },
        { site: "site-b", region: "eu-west" },
      ],
      routes: [],
    },
    flows: rollupFlows(),
    outcome: "sealed",
  },

  // One site moved across a border, and a route that names THAT ORDERED
  // PAIR and carries its basis. Note what a route is not: it is not a
  // permission to cross in general, and a route in the other direction
  // would not admit this crossing — permission to receive is not
  // permission to send.
  "placement-locality/edge-routed-across-boundary": {
    encode: placementLocality,
    demonstrates: [{ axis: "locality", value: "regionRouted" }],
    composition: regionalComposition(),
    placement: {
      regions: [
        { site: "hq", region: "eu-west" },
        { site: "site-a", region: "eu-west" },
        { site: "site-b", region: "uk" },
      ],
      routes: [{ id: "uk-to-eu-west", from: "uk", to: "eu-west", basis: ADEQUACY }],
    },
    flows: rollupFlows(),
    outcome: "routed",
  },

  // ONE PERTURBATION, READ FROM TWO DIRECTIONS, and the control for both
  // vectors above. Against the routed vector it is the same placement
  // with the route taken away, which separates an evaluator that checks
  // a route from one that admits every crossing. Against the sealed
  // vector it is the same composition and flows with one site moved over
  // a border, which separates an evaluator that resolves regions from
  // one that answers "sealed" because nothing ever asked it not to.
  "placement-locality/edge-reject-undeclared-egress": {
    encode: placementLocality,
    demonstrates: [],
    composition: regionalComposition(),
    placement: {
      regions: [
        { site: "hq", region: "eu-west" },
        { site: "site-a", region: "eu-west" },
        { site: "site-b", region: "uk" },
      ],
      routes: [],
    },
    flows: rollupFlows(),
    outcome: "refuse",
  },

  // A flow naming a site the placement is silent about. The refusal is
  // the whole content: the tempting readings — treat it as elsewhere,
  // treat it as local — both turn the one site nobody thought about into
  // the one site that certifies clean.
  "placement-locality/edge-reject-unplaced-site": {
    encode: placementLocality,
    demonstrates: [],
    composition: regionalComposition(),
    placement: {
      regions: [
        { site: "hq", region: "eu-west" },
        { site: "site-a", region: "eu-west" },
      ],
      routes: [],
    },
    flows: rollupFlows(),
    outcome: "refuse",
  },

  // The flow says one thing and the placement says another, and the
  // crossing itself is perfectly routed — so the disagreement is the
  // only fault, which is what makes this vector about the pin rather
  // than about egress. Neither side is preferred: one of them is out of
  // date and nothing in the document says which.
  "placement-locality/edge-reject-pin-contradicts-placement": {
    encode: placementLocality,
    demonstrates: [],
    composition: regionalComposition(),
    placement: {
      regions: [
        { site: "hq", region: "eu-west" },
        { site: "site-a", region: "uk" },
        { site: "site-b", region: "eu-west" },
      ],
      routes: [{ id: "uk-to-eu-west", from: "uk", to: "eu-west", basis: ADEQUACY }],
    },
    flows: rollupFlows(),
    outcome: "refuse",
  },

  // ── attestation-quote — §12.5 ─────────────────────────────────────
  //
  // Two formats across the six vectors, deliberately: the family's
  // claim is that the binding, the measurement and the window are
  // format-independent facts, and a corpus with one format would be
  // certifying independence with nothing to be independent of.

  // Evidence with no window. It says what was launched, which is a
  // smaller sentence than "this is what is running now" and is the
  // whole of what `attestedAtLaunch` means.
  "attestation-quote/bound-at-launch": {
    encode: attestationQuote,
    demonstrates: [{ axis: "attestation", value: "attestedAtLaunch" }],
    composition: attestedComposition("reading-log"),
    policy: { measurements: [MEASUREMENT_ADMITTED], observedAt: OBSERVED_IN_WINDOW },
    quote: {
      format: "detached-claims/v1",
      measurement: MEASUREMENT_ADMITTED,
      notAfter: null,
      body: "6d65617375726564206174206c61756e6368",
    },
    outcome: "attested",
  },

  // Evidence inside its window. Paired with the vector below, which is
  // the SAME quote observed after it — a verifier that ignores the
  // window reproduces this one perfectly, so only the pair separates it
  // from one that checks.
  "attestation-quote/fresh-within-window": {
    encode: attestationQuote,
    demonstrates: [{ axis: "attestation", value: "attestedWithinWindow" }],
    composition: attestedComposition("training-analysis"),
    policy: { measurements: [MEASUREMENT_ADMITTED], observedAt: OBSERVED_IN_WINDOW },
    quote: {
      format: "attached-report/v1",
      measurement: MEASUREMENT_ADMITTED,
      notAfter: WINDOW_ENDS,
      body: "7265706f72742d626f64792d7631",
    },
    outcome: "attested",
  },

  // The other half of the pair, and the family's re-validation
  // falsifier. Nothing about the quote moved; the observation did. The
  // obligation is to refuse it as stale rather than to keep reading it
  // as current — a lapsed quote downgrades to what was LAUNCHED, and an
  // implementation that let it answer the other question has stopped
  // checking rather than started trusting.
  "attestation-quote/reject-stale-quote": {
    encode: attestationQuote,
    demonstrates: [],
    composition: attestedComposition("training-analysis"),
    policy: { measurements: [MEASUREMENT_ADMITTED], observedAt: OBSERVED_AFTER_WINDOW },
    quote: {
      format: "attached-report/v1",
      measurement: MEASUREMENT_ADMITTED,
      notAfter: WINDOW_ENDS,
      body: "7265706f72742d626f64792d7631",
    },
    outcome: "refuse",
  },

  // A perfectly intact quote from an environment the relying party does
  // not admit. The policy is the RELYING PARTY'S: an attester that
  // decided which measurements were acceptable would be certifying
  // itself.
  "attestation-quote/reject-measurement-outside-policy": {
    encode: attestationQuote,
    demonstrates: [],
    composition: attestedComposition("reading-log"),
    policy: { measurements: [MEASUREMENT_ADMITTED], observedAt: OBSERVED_IN_WINDOW },
    quote: {
      format: "detached-claims/v1",
      measurement: MEASUREMENT_FOREIGN,
      notAfter: null,
      body: "6d65617375726564206174206c61756e6368",
    },
    outcome: "refuse",
  },

  // A quote that is genuine, current, and about SOMETHING ELSE. This is
  // the transplant rather than the forgery: every signature on it would
  // verify, and it still does not say anything about the composition it
  // arrived beside.
  "attestation-quote/reject-binding-names-another-composition": {
    encode: attestationQuote,
    demonstrates: [],
    composition: attestedComposition("reading-log"),
    boundTo: attestedComposition("training-analysis"),
    policy: { measurements: [MEASUREMENT_ADMITTED], observedAt: OBSERVED_IN_WINDOW },
    quote: {
      format: "attached-report/v1",
      measurement: MEASUREMENT_ADMITTED,
      notAfter: WINDOW_ENDS,
      body: "7265706f72742d626f64792d7631",
    },
    outcome: "refuse",
  },

  // The body moved after the integrity value was taken, so the value
  // covers content the document no longer carries. An implementation
  // that READ the integrity value rather than re-deriving it passes
  // every other vector here and this one too — which is exactly why the
  // family carries it.
  "attestation-quote/reject-unverifiable-quote": {
    encode: attestationQuote,
    demonstrates: [],
    composition: attestedComposition("reading-log"),
    policy: { measurements: [MEASUREMENT_ADMITTED], observedAt: OBSERVED_IN_WINDOW },
    quote: {
      format: "detached-claims/v1",
      measurement: MEASUREMENT_ADMITTED,
      notAfter: null,
      body: "6d65617375726564206174206c61756e6368",
      afterSealing: "00",
    },
    outcome: "refuse",
  },

  // ── incremental-recompute — §12.7 ─────────────────────────────────
  //
  // Every one of these shares one composition and one source, and four
  // share one edit. That is the design rather than an economy: the
  // strongest thing this family can say is that RE-ADDRESSING THE SAME
  // CHANGE — or putting THE SAME CHANGE through a different step —
  // changes what may be reused, and it can only say it if everything
  // else is held still.

  // One cell of one row. The refresh re-evaluates that row at each step
  // it reaches — twice, not once, because a row passing through two
  // steps is evaluated by both — and carries every other row's value.
  "incremental-recompute/point-edit-row-local": {
    encode: incrementalRecompute,
    demonstrates: [{ axis: "recompute", value: "rowLocal" }],
    composition: evaluatedComposition(),
    dataType: "Order",
    pipeline: rowLocalPipeline(),
    source: orderSource(),
    edits: pointEditByIdentity(),
    refreshKind: "rowsRecomputed",
  },

  // Two rows appended and one removed in one stream. The removed row is
  // evaluated by nothing — it is carried OUT of the result rather than
  // recomputed — and one appended row does not survive the filter, so
  // the second step never sees it. Neither fact is the number of ops,
  // which is what makes this vector worth having beside the one above.
  "incremental-recompute/bulk-edit-row-local": {
    encode: incrementalRecompute,
    demonstrates: [{ axis: "recompute", value: "rowLocal" }],
    composition: evaluatedComposition(),
    dataType: "Order",
    pipeline: rowLocalPipeline(),
    source: orderSource(),
    edits: {
      scheme: "identity",
      key: "id",
      ops: [
        { op: "appendRow", cells: ["r7", 8, 0] },
        { op: "appendRow", cells: ["r8", -1, 1] },
        { op: "removeRow", row: "r2" },
      ],
    },
    refreshKind: "rowsRecomputed",
  },

  // A change to a GROUPING KEY, which is the edit that travels furthest:
  // it passes through the filter and the derived column and lands on the
  // aggregate, disturbing the group it left and the group it joined
  // while the third is carried untouched.
  "incremental-recompute/chain-edit-group-local": {
    encode: incrementalRecompute,
    demonstrates: [{ axis: "recompute", value: "groupLocal" }],
    composition: evaluatedComposition(),
    dataType: "Order",
    pipeline: groupingPipeline(),
    source: orderSource(),
    edits: {
      scheme: "identity",
      key: "id",
      ops: [{ op: "setCell", row: "r4", column: "b", value: 2 }],
    },
    refreshKind: "groupsRecomputed",
  },

  // THE SAME EDIT against a pipeline whose second step REORDERS. A sort
  // computes nothing per row — it emits the row's own cells, in a
  // different place — and a place is recoverable by merging the named
  // rows into the order the previous evaluation already produced. So the
  // delta propagates: the filter re-evaluates the named row and the sort
  // charges nothing, which is why this costs one row-evaluation where
  // the full evaluation beside it costs six.
  "incremental-recompute/sort-merges-in-order": {
    encode: incrementalRecompute,
    demonstrates: [{ axis: "recompute", value: "rowLocal" }],
    composition: evaluatedComposition(),
    dataType: "Order",
    pipeline: orderDependentPipeline(),
    source: orderSource(),
    edits: pointEditByIdentity(),
    refreshKind: "rowsRecomputed",
  },

  // THE SAME EDIT AGAIN, against a step that computes a value for a row
  // from OTHER ROWS. A window's frame is a neighbourhood of the row in
  // its partition's order, and the stream names one row of it — so the
  // rows whose frames that row sits in are exactly the rows nobody
  // named, and there is nothing to propagate. Note the prime does NOT
  // decline: a prime evaluates everything whatever the plan says.
  "incremental-recompute/window-declines-in-full": {
    encode: incrementalRecompute,
    demonstrates: [{ axis: "recompute", value: "fullOnChange" }],
    composition: evaluatedComposition(),
    dataType: "Order",
    pipeline: windowPipeline(),
    source: orderSource(),
    edits: pointEditByIdentity(),
    refreshKind: "fullRecompute",
  },

  // AND A DIFFERENT EDIT, moving a row's key OUT of a joined relation.
  // Deliberately not the same one: `r4`'s key is already outside the
  // lookup, so re-addressing it would have measured nothing. The verdict
  // cached for `r6` is precisely what must be recomputed and every other
  // row's is precisely what could be reused — and the evaluator still
  // declines, because the verdict reads a relation the stream describes
  // nothing about, so nothing says the OTHER rows' verdicts still hold.
  "incremental-recompute/join-declines-in-full": {
    encode: incrementalRecompute,
    demonstrates: [{ axis: "recompute", value: "fullOnChange" }],
    composition: evaluatedComposition(),
    dataType: "Order",
    pipeline: joinPipeline(),
    source: orderSource(),
    edits: {
      scheme: "identity",
      key: "id",
      ops: [{ op: "setCell", row: "r6", column: "b", value: 1 }],
    },
    refreshKind: "fullRecompute",
  },

  // THE SAME SCENARIO RE-ADDRESSED, and the control for the row-local
  // vector. The composition, the pipeline, the source and the row named
  // are all unchanged; only the scheme moved. An evaluator that read the
  // ops and ignored the scheme reproduces the row-local vector perfectly
  // and is wrong the first time a row is inserted above one it cached.
  "incremental-recompute/ordinal-declines-in-full": {
    encode: incrementalRecompute,
    demonstrates: [{ axis: "recompute", value: "fullOnChange" }],
    composition: evaluatedComposition(),
    dataType: "Order",
    pipeline: rowLocalPipeline(),
    source: orderSource(),
    edits: pointEditByOrdinal(),
    refreshKind: "fullRecompute",
  },
};

// ── run ──────────────────────────────────────────────────────────────

const manifestPath = join(here, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const write = process.argv.includes("--write");
const selfTest = process.argv.includes("--self-test");

const byId = new Map(manifest.vectors.map((v) => [v.id, v]));
const failures = [];

// Every kind §5 declares must have an encoder here, and every
// encoder must be reached by at least one vector. The second half is what
// stops a kind from being "supported" by a map entry nothing exercises.
const reached = new Set();
const walk = (n) => {
  reached.add(n.kind);
  (n.children ?? []).forEach(walk);
};
Object.values(documents).forEach(walk);
for (const kind of Object.keys(kindMembers)) {
  if (!reached.has(kind)) failures.push(`kind "${kind}" has an encoder but no round-trip vector reaches it`);
}

// The same obligation for the module document (MODULE_AUTHORING_WIRE.md):
// every node kind and every handler case has an encoder, and every encoder
// is reached by a round-trip vector.
{
  const reachedModule = new Set();
  const reachedHandler = new Set();
  const walkModule = (n) => {
    reachedModule.add(n.kind);
    if (n.kind === "handler") reachedHandler.add(n.handler.kind);
    (n.children ?? []).forEach(walkModule);
  };
  Object.values(moduleDocuments).forEach(walkModule);
  for (const kind of Object.keys(moduleKindMembers)) {
    if (!reachedModule.has(kind)) failures.push(`module kind "${kind}" has an encoder but no round-trip vector reaches it`);
  }
  for (const kind of Object.keys(handlerMembers)) {
    if (!reachedHandler.has(kind)) failures.push(`handler case "${kind}" has an encoder but no round-trip vector reaches it`);
  }
}

const emitted = new Map();
for (const [id, model] of Object.entries(moduleDocuments)) {
  const vector = byId.get(id);
  if (!vector) {
    failures.push(`${id}: emitted here but enumerated by no vector in manifest.json`);
    continue;
  }
  if (vector.kind !== "round-trip") {
    failures.push(`${id}: emitted here but the manifest calls it kind ${JSON.stringify(vector.kind)}`);
    continue;
  }
  let bytes;
  try {
    bytes = Buffer.from(moduleNode(model), "utf8");
  } catch (e) {
    failures.push(`${id}: the emitter refused to encode it — ${e.message}`);
    continue;
  }
  emitted.set(id, { vector, bytes });
}
for (const [id, model] of Object.entries(documents)) {
  const vector = byId.get(id);
  if (!vector) {
    failures.push(`${id}: emitted here but enumerated by no vector in manifest.json`);
    continue;
  }
  if (vector.kind !== "round-trip") {
    failures.push(`${id}: emitted here but the manifest calls it kind ${JSON.stringify(vector.kind)}`);
    continue;
  }
  let bytes;
  try {
    bytes = Buffer.from(node(model), "utf8");
  } catch (e) {
    failures.push(`${id}: the emitter refused to encode it — ${e.message}`);
    continue;
  }
  emitted.set(id, { vector, bytes });
}

// The facet families (§11, §12). Their vectors are scenarios rather than
// compositions, so they are emitted through their own envelope encoders —
// but by the same §4 primitives, which is the point: one canonical
// encoding for everything this corpus carries.
//
// Their REJECT vectors are emitted too, unlike the reject vectors above.
// A facet reject vector is not a malformed document — it is a well-formed
// scenario whose required outcome is a refusal, so its bytes are exactly
// what a writer produces and reproducing them means something.
for (const [id, model] of Object.entries(facetVectors)) {
  const vector = byId.get(id);
  if (!vector) {
    failures.push(`${id}: emitted here but enumerated by no vector in manifest.json`);
    continue;
  }
  if (vector.kind !== "hash" && vector.kind !== "reject") {
    failures.push(`${id}: emitted here but the manifest calls it kind ${JSON.stringify(vector.kind)}`);
    continue;
  }
  let bytes;
  try {
    bytes = Buffer.from(model.encode(model), "utf8");
  } catch (e) {
    failures.push(`${id}: the emitter refused to encode it — ${e.message}`);
    continue;
  }
  emitted.set(id, { vector, bytes });
}

// Every round-trip vector in the manifest must be emitted here. Without
// this, a vector could be added to the corpus and never triangulated —
// the exact shape of a check that passes by doing nothing.
for (const v of manifest.vectors) {
  if (v.kind === "round-trip" && !emitted.has(v.id)) {
    failures.push(`${v.id}: enumerated as round-trip but this emitter has no model for it`);
  }
}

// The same obligation for the facet families, keyed off the manifest's
// own registration rather than off a second list here.
{
  const facetFamilyNames = new Set(Object.keys(manifest.facetFamilies ?? {}));
  for (const v of manifest.vectors) {
    if (facetFamilyNames.has(v.family) && !emitted.has(v.id)) {
      failures.push(`${v.id}: enumerated in facet family "${v.family}" but this emitter has no model for it`);
    }
  }
}

if (write) {
  for (const [id, { vector, bytes }] of emitted) {
    mkdirSync(dirname(join(here, vector.file)), { recursive: true });
    writeFileSync(join(here, vector.file), bytes);
    vector.sha256 = sha256Hex(bytes);
  }
  // Hand-authored vectors are never rewritten, but their recorded digest
  // is still derived, so refresh it from the file that is there.
  for (const v of manifest.vectors) {
    if (v.kind === "round-trip") continue;
    try {
      v.sha256 = sha256Hex(readFileSync(join(here, v.file)));
    } catch {
      /* check-manifest.mjs reports a missing file; do not mask it here */
    }
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`rewrote ${emitted.size} emitted vectors and refreshed the manifest's derived digests.`);
  console.log("Review the diff, then re-run without --write: verification recomputes everything independently.");
  process.exit(failures.length ? 1 : 0);
}

for (const [id, { vector, bytes }] of emitted) {
  let committed;
  try {
    committed = readFileSync(join(here, vector.file));
  } catch {
    failures.push(`${id}: enumerated file "${vector.file}" is not present`);
    continue;
  }
  if (!committed.equals(bytes)) {
    failures.push(
      `${id}: the independent emitter and the committed bytes disagree.\n` +
        `      committed: ${committed.toString("utf8")}\n` +
        `      emitted  : ${bytes.toString("utf8")}\n` +
        `      A divergence here is a SPECIFICATION defect (see the header): ask what the text left open.`,
    );
  }
  const got = sha256Hex(committed);
  if (got !== vector.sha256) failures.push(`${id}: manifest records sha256 ${vector.sha256}, file hashes to ${got}`);
}

if (selfTest) {
  // Prove the byte comparison can fail. It is run against an in-memory
  // perturbation of an already-verified document rather than against the
  // tree: a self-test that edited the committed corpus would be one
  // interrupted run away from leaving the repository broken.
  const probe = documents["document/minimal"];
  const good = node(probe);
  const bad = node({ ...probe, id: probe.id + "-perturbed" });
  if (good === bad) {
    console.error("self-test FAILED: perturbing a document did not change its bytes, so the comparison is vacuous");
    process.exit(1);
  }
  // And prove the omit-when-absent rule is what produces the difference
  // between the two port vectors, rather than the ids happening to differ.
  const withClient = node(documents["node/port-allocation"]);
  const withoutClient = node(documents["node/port-allocation-server-only"]);
  if (withClient.includes('"client"') === withoutClient.includes('"client"')) {
    console.error("self-test FAILED: the optional client band is spelled the same way present and absent (§4.5)");
    process.exit(1);
  }
  // And prove a description's empty array is omitted, not written (§5.4).
  for (const [id, member] of [
    ["node/module-ref-fact-table-description", '"columns":[]'],
    ["node/module-ref-subject-description", '"levels":[]'],
  ]) {
    if (node(documents[id]).includes(member)) {
      console.error(`self-test FAILED: ${id} spells an empty ${member} a reader must refuse (§5.4)`);
      process.exit(1);
    }
  }
  // And prove §12.7's encoder guard is live: a model whose refresh
  // class no longer matches what its own content resolves to must be
  // REFUSED rather than emitted. The declining vectors differ from the
  // propagating one by a single member each — one scheme, one verb — so
  // without this guard a perturbation that fixed the decline while
  // leaving the label alone would emit a vector claiming something its
  // content does not do.
  {
    const declining = facetVectors["incremental-recompute/ordinal-declines-in-full"];
    let refused = false;
    try {
      incrementalRecompute({ ...declining, edits: pointEditByIdentity() });
    } catch {
      refused = true;
    }
    if (!refused) {
      console.error(
        "self-test FAILED: re-addressing the declining vector by identity still encoded as a fullRecompute, " +
          "so §12.7's refresh-class guard is not live",
      );
      process.exit(1);
    }
  }
  console.log("self-test: the byte comparison, the omission rule and §12.7's refresh guard all go red as required.");
}

if (failures.length) {
  console.error(`independent emitter: ${failures.length} divergence(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

{
  const facetIds = new Set(Object.keys(facetVectors));
  const moduleIds = new Set(Object.keys(moduleDocuments));
  const facets = [...emitted.keys()].filter((id) => facetIds.has(id)).length;
  const modules = [...emitted.keys()].filter((id) => moduleIds.has(id)).length;
  console.log(
    `independent emitter: ${emitted.size - facets - modules} round-trip documents, ${modules} module documents ` +
      `and ${facets} facet vectors reproduced byte-for-byte.`,
  );
}
