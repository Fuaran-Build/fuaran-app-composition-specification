// SPDX-License-Identifier: Apache-2.0
//
// The third question, and the one the other two checkers structurally cannot
// answer: **do this home's artefacts still agree with each other?**
//
//   emit.mjs           — do the bytes come out the way the text says?
//   check-manifest.mjs — does the manifest describe the tree it sits in?
//   this               — do the normative text, the profile documents, their
//                        registries, the schemas and the manifest still say
//                        the same things?
//
// A specification home carries the same fact in several renderings on purpose:
// prose a person reads, a registry a program reads, a schema a validator
// reads, a manifest a harness reads. Every one of those is a place the fact can
// drift, and drift between them is the failure mode nobody notices, because
// each artefact remains internally perfect while describing a different format.
// This is what makes the promise that they agree something other than care.
//
//   node check-cross-artefact.mjs
//
// Everything here is derived by READING the documents. Nothing is a third copy
// of the fact — a checker with its own list would be one more thing to drift.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");

const failures = [];
const fail = (m) => failures.push(m);

const read = (rel) => readFileSync(join(repo, rel), "utf8").replace(/\r\n/g, "\n");

const core = read("APP_COMPOSITION_WIRE.md");
const ladderDoc = read("CONFORMANCE_LADDER.md");
const nodeSchema = JSON.parse(read("schemas/v1/node.schema.json"));
const manifest = JSON.parse(read("wire-fixtures/manifest.json"));
const moduleDoc = read("MODULE_AUTHORING_WIRE.md");

const setOf = (xs) => new Set(xs);
const missing = (a, b) => [...a].filter((x) => !b.has(x));

/** Backticked tokens in the first column of a markdown table, within a section. */
const sectionOf = (doc, heading) => {
  const start = doc.indexOf(heading);
  if (start < 0) return null;
  const rest = doc.slice(start + heading.length);
  const next = rest.search(/\n#{2,4} /);
  return next < 0 ? rest : rest.slice(0, next);
};

const firstColumnTokens = (section) =>
  [...section.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map((m) => m[1]);

// ── the facet axes: §11.1, and the manifest ──────────────────────────
//
// The axes and their vocabularies are core vocabulary (§11.1), so the
// manifest's registration is a rendering of that table and not a second
// opinion about it.

{
  const section = sectionOf(core, "### §11.1 The axes");
  if (!section) {
    fail("the core has no §11.1 section, which the manifest's facetAxes is the rendering of");
  } else {
    const rows = [...section.matchAll(/^\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|\s*$/gm)];
    const docAxes = new Map(rows.map((m) => [m[1], setOf([...m[2].matchAll(/`([^`]+)`/g)].map((v) => v[1]))]));
    const regAxes = manifest.facetAxes ?? {};
    if (!docAxes.size) fail("no facet axes could be read out of §11.1 — the table shape changed and this check went blind");
    for (const axis of Object.keys(regAxes)) {
      if (!docAxes.has(axis)) { fail(`facet axis "${axis}" is in the manifest and not in §11.1`); continue; }
      const onlyReg = missing(setOf(regAxes[axis]), docAxes.get(axis));
      const onlyDoc = missing(docAxes.get(axis), setOf(regAxes[axis]));
      if (onlyReg.length) fail(`facet axis "${axis}": the manifest registers ${onlyReg.join(", ")}, which §11.1 does not`);
      if (onlyDoc.length) fail(`facet axis "${axis}": §11.1 lists ${onlyDoc.join(", ")}, which the manifest does not`);
    }
    for (const axis of docAxes.keys()) {
      if (!(axis in regAxes)) fail(`facet axis "${axis}" is in §11.1 and not in the manifest`);
    }
    // Every registered value must be given a meaning somewhere in §11.1,
    // not merely listed in its table. A value nobody defined is a value
    // two implementations will define differently.
    const meanings = setOf([...(section.match(/^- \*\*`([a-zA-Z]+)`\*\*/gm) ?? [])].map((m) => m.replace(/^- \*\*`|`\*\*$/g, "")));
    for (const [axis, values] of Object.entries(regAxes)) {
      for (const v of values) if (!meanings.has(v)) fail(`facet value "${v}" (${axis}) is registered but §11.1 states no meaning for it`);
    }
  }
}

// The families: registered in §12 as sections, and in the manifest as data.
{
  const declaredInText = setOf([...core.matchAll(/^### §12\.\d+ `([a-z-]+)`/gm)].map((m) => m[1]));
  const inManifest = setOf(Object.keys(manifest.facetFamilies ?? {}));
  if (!declaredInText.size) fail("no facet families could be read out of §12 — the heading shape changed and this check went blind");
  const onlyText = missing(declaredInText, inManifest);
  const onlyManifest = missing(inManifest, declaredInText);
  if (onlyText.length) fail(`facet families: §12 registers ${onlyText.join(", ")}, the manifest does not`);
  if (onlyManifest.length) fail(`facet families: the manifest registers ${onlyManifest.join(", ")}, §12 does not`);
}

// ── node kinds: the core text, the schema, the corpus ────────────────────
//
// A profile-only kind (§8.3) is declared, and given its schema, by the
// profile that declares it, where that profile is published (§8.5).

// A kind heading names the kind and then says what it is (`— …`); §5.9's
// heading names `clientShell` only to say the core has no such kind.
const coreKinds = setOf(
  [...core.matchAll(/^### §5\.\d+ `([a-zA-Z]+)` — /gm)].map((m) => m[1]),
);
const schemaKinds = setOf(nodeSchema.properties.kind.enum);

if (!coreKinds.size) fail("no core node kinds could be read out of §5 — the heading shape changed and this check went blind");

{
  const declared = coreKinds;
  const onlyDoc = missing(declared, schemaKinds);
  const onlySchema = missing(schemaKinds, declared);
  if (onlyDoc.length) fail(`node kinds: §5 declares ${onlyDoc.join(", ")}, the node schema's enum does not`);
  if (onlySchema.length) fail(`node kinds: the node schema's enum carries ${onlySchema.join(", ")}, which §5 does not declare`);

  // Every kind must be exercised by at least one round-trip vector. A kind
  // that is specified and never emitted is a kind nothing has ever proved it
  // can write.
  const bytes = manifest.vectors
    .filter((v) => v.kind === "round-trip")
    .map((v) => readFileSync(join(here, v.file), "utf8"))
    .join("");
  for (const kind of declared) {
    if (!bytes.includes(`"kind":"${kind}"`)) fail(`node kind "${kind}" is specified but no round-trip vector carries it`);
  }
}

// ── refusal classes: the core text, the corpus ───────────────────────────

{
  const core9 = sectionOf(core, "### §9.1 Core classes") ?? "";
  const core92 = sectionOf(core, "### §9.2 Profile classes") ?? "";
  const core94 = sectionOf(core, "### §9.4 Facet-family classes") ?? "";
  const declaredCore = setOf(firstColumnTokens(core9));
  const declaredProfile = setOf([...firstColumnTokens(core92), ...firstColumnTokens(core94)]);
  if (!declaredCore.size) fail("no refusal classes could be read out of §9.1 — the table shape changed and this check went blind");
  if (!firstColumnTokens(core94).length) fail("no facet-family refusal classes could be read out of §9.4 — the table shape changed");

  const withVectors = setOf(manifest.vectors.filter((v) => v.kind === "reject").map((v) => v.reject));
  const noted = setOf((manifest.refusalClassesWithoutVectors ?? []).map((e) => e.class));
  // MODULE_AUTHORING_WIRE.md §M8.1 declares the module document's codec classes; the module block
  // below holds them to their own vectors.
  const moduleCodecClasses = firstColumnTokens(sectionOf(moduleDoc, "### §M8.1 Codec classes") ?? "");
  const declaredAll = setOf([...declaredCore, ...declaredProfile, ...moduleCodecClasses]);

  // Every class the corpus refuses under must be a class some document states.
  for (const c of withVectors) {
    if (!declaredAll.has(c)) fail(`the corpus carries a reject vector for "${c}", which no specification section declares`);
  }
  // Every class a document states must either have a vector or be noted, with
  // a reason, as deliberately uncarried. Silence is the failure this catches.
  for (const c of [...declaredCore, ...declaredProfile]) {
    if (!withVectors.has(c) && !noted.has(c)) {
      fail(`refusal class "${c}" is specified but the corpus neither carries a vector for it nor notes why not`);
    }
  }
}

// ── the extension registry: §7.4 and the manifest ────────────────────────

{
  const section = sectionOf(core, "### §7.4 The registry, and reserved names") ?? "";
  for (const d of manifest.extensionDeclarations ?? []) {
    const pair = `${d.namespace}/${d.extensionKind}`;
    if (!section.includes("`" + pair + "`")) fail(`the manifest declares extension "${pair}", which §7.4's table does not`);
    for (const f of d.fields) {
      if (!section.includes("`" + f + "`")) fail(`extension "${pair}": the manifest declares field "${f}", which §7.4 does not name`);
    }
    if (!section.includes(String(d.maxFieldLength))) {
      fail(`extension "${pair}": the manifest declares max field length ${d.maxFieldLength}, which §7.4 does not state`);
    }
  }
  // The reserved family name is a statement in §7.4 as well as in the manifest.
  for (const r of manifest.reservedFamilies ?? []) {
    if (!core.includes("`" + r + "`") && !section.includes(r)) {
      fail(`reserved family "${r}" appears in the manifest and nowhere in the normative text`);
    }
  }
}

// ── the conformance ladder: §L2/§L3/§L6 and the manifest ─────────────────
//
// A third document joins the two above, and it carries the same fact in two
// renderings for the same reason they do: §L2's table is what a person reads
// and `stackRungs` is what a program reads. §L8.4 says they move together and
// this is what makes that something other than care.
//
// Two of the checks here are not agreement checks at all — they are the
// ladder's own rules, made falsifiable. A registered rung obliging NOTHING and
// a reserved rung obliging SOMETHING are both claims resting on nothing, and
// neither is visible by reading either rendering on its own.

{
  // The manifest is read by the implementations that certify against this
  // corpus, and this format's own §4.5 says a wire model here has no null —
  // so a conformant reader hits a manifest carrying one and cannot parse the
  // FILE, not merely the member. Found by a consuming domain's harness
  // refusing this document, which is why it is a check rather than a habit.
  if (/:\s*null/.test(read("wire-fixtures/manifest.json"))) {
    fail("the manifest carries a JSON null; omit the member instead (§4.5's rule, one layer up) — a conformant reader's wire model has no null and cannot parse this file at all");
  }

  const rungs = manifest.stackRungs ?? {};
  const ids = Object.keys(rungs);
  const section = sectionOf(ladderDoc, "## §L2. The rungs");

  if (!section) {
    fail("the ladder document has no §L2 section, which the manifest's stackRungs is the rendering of");
  } else {
    const inDoc = setOf(firstColumnTokens(section));
    if (!inDoc.size) fail("no rungs could be read out of §L2 — the table shape changed and this check went blind");
    if (!ids.length) fail("the manifest registers no stack rung, and the ladder document registers some");
    const onlyDoc = missing(inDoc, setOf(ids));
    const onlyManifest = missing(setOf(ids), inDoc);
    if (onlyDoc.length) fail(`stack rungs: §L2 registers ${onlyDoc.join(", ")}, which the manifest does not`);
    if (onlyManifest.length) fail(`stack rungs: the manifest registers ${onlyManifest.join(", ")}, which §L2 does not`);
  }

  // The prerequisite relation: every named prerequisite exists, exactly one
  // rung is the floor, and no rung is beneath itself. A cycle would make the
  // §L4 closure non-terminating on a document that reads perfectly.
  //
  // The floor OMITS `extends` rather than spelling it `null`, and that is not
  // a style choice: this manifest is read by conformant implementations whose
  // wire model has no null (§4.5 is the same rule one layer down), so a null
  // here is a document they cannot parse at all.
  const floors = ids.filter((id) => rungs[id].extends == null);
  if (floors.length !== 1) {
    fail(`the ladder has ${floors.length} rung(s) with no prerequisite; §L2 is a tree rooted at exactly one floor`);
  }
  for (const id of ids) {
    const seen = new Set([id]);
    let at = rungs[id].extends;
    while (at != null) {
      if (!(at in rungs)) { fail(`rung "${id}" names the prerequisite "${at}", which is not a registered rung`); break; }
      if (seen.has(at)) { fail(`rung "${id}" is beneath itself through "${at}" — the prerequisite relation must be acyclic`); break; }
      seen.add(at);
      at = rungs[at].extends;
    }
  }

  // §L6, both directions. The converse is the load-bearing half: an
  // unreserved rung with an empty obligation set is a claim anybody could
  // make for free, which is what §11.3 refuses one layer down.
  const reserved = setOf(manifest.reservedRungs ?? []);
  const reasons = manifest.reservedRungReasons ?? {};
  for (const id of ids) {
    const r = rungs[id];
    const isReserved = r.status === "reserved";
    if (r.status !== "reserved" && r.status !== "registered") {
      fail(`rung "${id}" carries the status ${JSON.stringify(r.status)}; §L2 knows Registered and Reserved`);
    }
    if (isReserved !== reserved.has(id)) {
      fail(
        isReserved
          ? `rung "${id}" is reserved and reservedRungs does not list it`
          : `reservedRungs lists "${id}", whose status is ${JSON.stringify(r.status)}`,
      );
    }
    const obligations = r.obligations ?? [];
    if (isReserved && obligations.length) fail(`reserved rung "${id}" carries an obligation; §L6 rule 1 says a reservation's set is empty`);
    if (!isReserved && !obligations.length) {
      fail(`rung "${id}" is registered and obliges nothing — §L6 rule 1's converse: an empty obligation set MUST be reserved`);
    }
    if (isReserved && !(reasons[id] ?? "").trim()) fail(`reserved rung "${id}" carries no reason; a reservation with no reason is indistinguishable from an omission`);
    if (isReserved && !ladderDoc.includes("`" + id + "`")) fail(`reserved rung "${id}" is in the manifest and nowhere in the ladder document`);
  }

  // §L3: every obligation cites a specification AND a revision, and the
  // citation appears in the ladder document spelled the one way. §L3.4 is
  // structural rather than exhortation: only the FLOOR may take its families
  // from this corpus, so a family list for a cited specification has nowhere
  // to live but that specification's own manifest.
  for (const id of ids) {
    for (const o of rungs[id].obligations ?? []) {
      // `citedSpecification`, deliberately not `specification`: a corpus identifies ITSELF through a
      // top-level `"specification"` member, and a sibling harness locating a corpus by substring
      // would otherwise find this manifest when looking for the one this rung merely CITES. Found by
      // that harness rather than reasoned about in advance, which is the argument for having it.
      const spec = (o.citedSpecification ?? "").trim();
      const version = (o.version ?? "").trim();
      if (!spec || !version) { fail(`rung "${id}" carries an obligation naming no specification or no revision — §L3 requires both`); continue; }
      if (!ladderDoc.includes("`" + spec + "@" + version + "`")) {
        fail(`rung "${id}" cites ${spec}@${version}, which the ladder document does not spell`);
      }
      const families = o.corpusFamilies ?? "";
      const isThis = spec === manifest.specification;
      if (isThis && !families.startsWith("this-corpus")) fail(`rung "${id}" cites this specification and does not take its families from this corpus`);
      if (!isThis && !families.startsWith("external")) {
        fail(`rung "${id}" cites ${spec} and enumerates its families here — §L3.4: a rung cites, it never incorporates`);
      }
    }
  }

  // The three consistency classes (§L5.3) and the claim facet's own hole.
  const classes = manifest.rungClaimClasses ?? [];
  if (!classes.length) fail("the manifest registers no rung-claim consistency class; §L5.3 states three");
  for (const c of classes) {
    if (!ladderDoc.includes("`" + c.class + "`")) fail(`rung-claim class "${c.class}" is in the manifest and nowhere in the ladder document`);
    if (c.grade !== "refusal" && c.grade !== "advisory") {
      fail(`rung-claim class "${c.class}" carries the grade ${JSON.stringify(c.grade)}; §L5.3 grades a class refusal or advisory`);
    }
  }

  const claimPair = "fuaran.stack/rung-claim";
  const declared = (manifest.extensionDeclarations ?? []).some((d) => `${d.namespace}/${d.extensionKind}` === claimPair);
  if (!declared) fail(`the ladder's claim facet rides "${claimPair}", which the manifest declares nowhere — §L5.1`);
  if (!ladderDoc.includes("`" + claimPair + "`")) fail(`the ladder document does not name "${claimPair}", which §7.4 registers for it`);
}

// ── the module document: MODULE_AUTHORING_WIRE.md, its registry, its schema ──
//
// A sixth, seventh and eighth rendering — the module text, the module
// profile's registry and the module schema — of facts the manifest also
// carries, and so three more places for them to drift while each stays
// internally perfect. The rules are the ones applied above, pointed at the
// second document: every kind and case the text specifies is the schema's
// and the registry's and is carried by a round-trip vector; every refusal
// class is either a vector or a recorded rule; the draft says it is a draft
// everywhere it is said; and a composition's committed body address is the
// address of a module document this corpus actually carries.
{
  const moduleProfile = "module-authoring";
  const moduleRegistry = JSON.parse(read("profiles/module-authoring/registry.json"));
  const moduleSchema = JSON.parse(read("schemas/v1/module.schema.json"));
  const moduleFamilies = setOf((manifest.documentProfiles ?? {})[moduleProfile] ?? []);
  if (!moduleFamilies.size) fail(`the manifest scopes no family to the document profile "${moduleProfile}"`);

  // The status table, against the registry and the manifest.
  const row = (label) => {
    const m = moduleDoc.match(new RegExp("^\\|\\s*" + label + "\\s*\\|\\s*([^|]+?)\\s*\\|", "m"));
    return m ? m[1].replace(/`/g, "").trim() : null;
  };
  const docVersion = row("Profile version");
  const docStatus = row("Status");
  if (!docVersion) fail("the module document's status table states no profile version");
  if (docVersion && docVersion !== moduleRegistry.profileVersion) {
    fail(`module profile version: the document says ${docVersion}, the registry says ${moduleRegistry.profileVersion}`);
  }
  if (docVersion && (manifest.profileVersions ?? {})[moduleProfile] !== docVersion) {
    fail(`module profile version: the document says ${docVersion}, the corpus manifest says ${(manifest.profileVersions ?? {})[moduleProfile]}`);
  }
  if ((docStatus === "DRAFT") !== (moduleRegistry.status === "draft")) {
    fail(`module profile status: the document says ${docStatus}, the registry says ${moduleRegistry.status} — a draft is a draft in every rendering or in none`);
  }
  if (docStatus === "DRAFT" && !/^\*\*DRAFT/m.test(moduleDoc)) {
    fail("the module document is a DRAFT in its status table and does not say so at its head (section M2)");
  }
  if (row("Profile") !== moduleProfile) fail(`the module document's status table names profile ${row("Profile")}, not ${moduleProfile}`);
  if ((moduleRegistry.vocabularyBy ?? {}).reference !== "server-app-host") {
    fail("the module registry's view vocabulary must be adopted by reference from server-app-host (section M9)");
  }

  // Node kinds: the text, the schema, the registry, the corpus.
  const moduleRoundTripBytes = manifest.vectors
    .filter((v) => v.kind === "round-trip" && moduleFamilies.has(v.family))
    .map((v) => readFileSync(join(here, v.file), "utf8"))
    .join("");
  if (!moduleRoundTripBytes) fail("the module document profile carries no round-trip vector");
  const kindSet = (heading, schemaEnum, registryList, what, inBytes) => {
    const inText = setOf([...moduleDoc.matchAll(heading)].map((m) => m[1]));
    if (!inText.size) fail(`no ${what} could be read out of the module document — the heading shape changed and this check went blind`);
    for (const [name, other] of [["the module schema", setOf(schemaEnum)], ["the module registry", setOf(registryList)]]) {
      const onlyText = missing(inText, other);
      const onlyOther = missing(other, inText);
      if (onlyText.length) fail(`${what}: the module document specifies ${onlyText.join(", ")}, ${name} does not`);
      if (onlyOther.length) fail(`${what}: ${name} carries ${onlyOther.join(", ")}, which the module document does not specify`);
    }
    for (const k of inText) {
      if (!moduleRoundTripBytes.includes(inBytes(k))) fail(`${what} "${k}" is specified but no module round-trip vector carries it`);
    }
  };
  kindSet(/^### §M5\.\d+ `([a-zA-Z]+)`/gm, moduleSchema.properties.kind.enum, moduleRegistry.nodeKinds, "module node kind",
    (k) => `{"kind":"${k}"`);
  kindSet(/^### §M6\.\d+ `([a-zA-Z]+)`/gm, moduleSchema.$defs.handler.properties.kind.enum, moduleRegistry.handlerKinds,
    "handler case", (k) => `"handler":{"kind":"${k}"`);

  // The two effect vocabularies: the text, the schema, the registry.
  const m51 = sectionOf(moduleDoc, "### §M5.1 `moduleRoot`") ?? "";
  // The host table is the one headed `| `host` | Meaning |`; the member table above it is not tokens.
  const hostTable = (m51.match(/^\|\s*`host`\s*\|\s*Meaning\s*\|[\s\S]*?(?=\n\n)/m) ?? [""])[0];
  const hostText = setOf(firstColumnTokens(hostTable).filter((t) => t !== "host"));
  const rootSchema = moduleSchema.allOf.find((c) => c.if?.properties?.kind?.const === "moduleRoot").then.properties;
  for (const [slot, inText, schemaEnum] of [
    ["moduleRoot.host", hostText, rootSchema.host.enum],
    ["moduleRoot.determinism", setOf(moduleRegistry.tokens["moduleRoot.determinism"].tokens.filter((t) => m51.includes("`" + t + "`"))), rootSchema.determinism.enum],
  ]) {
    const reg = setOf(moduleRegistry.tokens[slot].tokens);
    if (!inText.size) fail(`${slot}: no tokens could be read out of section M5.1`);
    for (const [name, other] of [["the registry", reg], ["the schema", setOf(schemaEnum)]]) {
      const a = missing(inText, other);
      const b = missing(other, inText);
      if (a.length) fail(`${slot}: section M5.1 lists ${a.join(", ")}, ${name} does not`);
      if (b.length) fail(`${slot}: ${name} lists ${b.join(", ")}, which section M5.1 does not`);
    }
  }

  // Refusal classes: §M8.1 is vectors, §M8.2 is recorded rules, and the
  // registry renders both.
  const m81 = setOf(firstColumnTokens(sectionOf(moduleDoc, "### §M8.1 Codec classes") ?? ""));
  const m82 = setOf(firstColumnTokens(sectionOf(moduleDoc, "### §M8.2 Module rules") ?? ""));
  if (!m81.size || !m82.size) fail("no module refusal classes could be read out of section M8 — the table shape changed and this check went blind");
  for (const [what, inText, reg] of [["codec class", m81, setOf(moduleRegistry.refusalClasses)], ["module rule", m82, setOf(moduleRegistry.moduleRules ?? [])]]) {
    const a = missing(inText, reg);
    const b = missing(reg, inText);
    if (a.length) fail(`module ${what}: section M8 states ${a.join(", ")}, the module registry does not`);
    if (b.length) fail(`module ${what}: the module registry lists ${b.join(", ")}, which section M8 does not`);
  }
  const moduleRejects = manifest.vectors.filter((v) => v.kind === "reject" && moduleFamilies.has(v.family));
  const moduleWithVectors = setOf(moduleRejects.map((v) => v.reject));
  for (const c of m81) if (!moduleWithVectors.has(c)) fail(`module codec class "${c}" is specified and the corpus carries no module vector for it`);
  for (const c of moduleWithVectors) if (!m81.has(c)) fail(`the corpus carries a module reject vector for "${c}", which section M8.1 does not state`);
  const noted = setOf((manifest.refusalClassesWithoutVectors ?? []).map((e) => e.class));
  for (const c of m82) if (!noted.has(c)) fail(`module rule "${c}" carries no vector and the manifest records no reason why`);
  for (const v of moduleRejects) {
    if (v.profile !== moduleProfile) fail(`${v.id}: a module reject vector is scoped to profile ${v.profile}, not ${moduleProfile}`);
  }

  // §5.4 / §M7: the member is in the core table and the schema, and every
  // address a composition vector commits to is the address of a module
  // document this corpus carries — recomputed here, never read.
  const s54 = sectionOf(core, "### §5.4 `moduleRef`") ?? "";
  if (!/^\|\s*`bodyAddress`\s*\|.*\|\s*OPTIONAL\s*\|/m.test(s54)) fail("section 5.4's table does not carry bodyAddress as an OPTIONAL member");
  const moduleRefSchema = nodeSchema.allOf.find((c) => c.if?.properties?.kind?.const === "moduleRef").then.properties;
  if (!moduleRefSchema.bodyAddress) fail("the node schema's moduleRef carries no bodyAddress property");
  const moduleAddresses = new Map(
    manifest.vectors
      .filter((v) => v.kind === "round-trip" && moduleFamilies.has(v.family))
      .map((v) => [createHash("sha256").update(readFileSync(join(here, v.file))).digest("hex"), v.id]),
  );
  let committed = 0;
  for (const v of manifest.vectors.filter((x) => x.kind === "round-trip" && !moduleFamilies.has(x.family))) {
    for (const m of readFileSync(join(here, v.file), "utf8").matchAll(/"bodyAddress":"([^"]*)"/g)) {
      committed += 1;
      if (!moduleAddresses.has(m[1])) {
        fail(`${v.id} commits to body address ${m[1]}, which is the content address of no module document in this corpus`);
      }
    }
  }
  if (!committed) fail("no composition vector commits to a body address, so section M7's relationship is carried by nothing");
}

// ── the profile kinds: §8.5, the manifest, the registries, the documents ─
//
// Section 8.6 splits the evaluator profiles into vocabulary profiles and
// placement profiles. The kind is carried four times — §8.5's Kind column,
// the manifest's profileKinds, a placement's registry, a placement's §P1 —
// and a placement that quietly regains a vocabulary, or a scope naming one
// vocabulary profile's family, is the coupling the section exists to remove.

{
  const section = sectionOf(core, "### §8.5 Registered profiles") ?? "";
  const rows = [...section.matchAll(/^\|\s*`([a-z-]+)`\s*\|\s*(vocabulary|placement)\s*\|/gm)];
  const docKinds = new Map(rows.map((m) => [m[1], m[2]]));
  const kinds = manifest.profileKinds ?? {};
  // A profile another home publishes (profileHomes) is registered all the
  // same: it has a kind and a §8.5 row, and only its own artefacts are elsewhere.
  const homes = manifest.profileHomes ?? {};
  const evaluators = [...new Set([...Object.keys(manifest.profiles ?? {}), ...Object.keys(homes)])].filter((p) => p !== "core");
  if (!docKinds.size) fail("no profile kinds could be read out of §8.5's table — the table shape changed and this check went blind");
  for (const p of evaluators) {
    if (!(p in kinds)) fail(`profile "${p}" carries no kind in the manifest's profileKinds (§8.6)`);
    if (!docKinds.has(p)) fail(`profile "${p}" is in the manifest's profile partition and has no Kind in §8.5's table`);
    else if (kinds[p] !== docKinds.get(p)) fail(`profile "${p}": §8.5 says it is a ${docKinds.get(p)} profile, the manifest says ${kinds[p]}`);
  }
  for (const p of new Set([...Object.keys(kinds), ...docKinds.keys()])) {
    if (!evaluators.includes(p)) fail(`profile "${p}" has a kind but is not in the manifest's profile partition`);
  }

  // §8.5's Published column says where each profile is published: the URL
  // profileHomes records for one published elsewhere, and the document beside
  // this one for every other evaluator profile.
  const published = new Map(
    [...section.matchAll(/^\|\s*`([a-z-]+)`\s*\|[^|]*\|[^|]*\|\s*(.*?)\s*\|\s*$/gm)].map((m) => [m[1], m[2]]),
  );
  for (const p of evaluators) {
    const cell = published.get(p);
    if (cell === undefined) {
      fail(`profile "${p}": §8.5's table carries no Published cell for it`);
      continue;
    }
    if (p in homes) {
      if (cell !== `By its evaluator's owner: <${homes[p].url}>`) {
        fail(`profile "${p}": §8.5 says it is published at ${JSON.stringify(cell)}, profileHomes says <${homes[p].url}>`);
      }
      if (kinds[p] !== "vocabulary") fail(`profile "${p}" is published by its evaluator's owner and is not a vocabulary profile (§8.5)`);
    } else {
      const file = `PROFILE_${p.toUpperCase().replace(/-/g, "_")}.md`;
      if (cell !== "[`" + file + "`](" + file + ")") {
        fail(`profile "${p}": §8.5 says it is published at ${JSON.stringify(cell)}, not beside this document as ${file}`);
      }
    }
  }

  // Registry-borne checks run over the registries this home publishes; a
  // profile published elsewhere is checked against its registry there.
  const localRegistries = manifest.profileRegistries ?? {};
  const registryOf = (p) => JSON.parse(read((localRegistries[p] ?? "").replace(/^\.\.\//, "")));
  const vocabularies = evaluators.filter((p) => kinds[p] === "vocabulary");
  if (!vocabularies.length) fail("no vocabulary profile is registered, so no placement has anything to compose with (§8.6)");

  // A root belongs to at most one vocabulary profile (§8.6).
  const baseOwner = new Map();
  for (const v of vocabularies.filter((x) => x in localRegistries)) {
    for (const t of registryOf(v).tokens?.["appRoot.base"]?.tokens ?? []) {
      if (baseOwner.has(t)) fail(`appRoot.base token "${t}" is registered by both "${baseOwner.get(t)}" and "${v}", so a root naming it belongs to two vocabulary profiles (§8.6)`);
      else baseOwner.set(t, v);
    }
  }
  // With no vocabulary registry published here, base ownership — and so
  // whether a vocabulary-unresolved vector's base really resolves nowhere —
  // is checked where the vocabulary registries are published.
  if (!baseOwner.size && vocabularies.some((x) => x in localRegistries)) {
    fail("no vocabulary profile registers an appRoot.base token, so no root belongs to any of them");
  }

  for (const p of evaluators.filter((x) => kinds[x] === "placement")) {
    const reg = registryOf(p);
    if (reg.kind !== "placement") fail(`placement "${p}": its registry says kind ${JSON.stringify(reg.kind)}`);
    for (const k of ["tokens", "nodeKinds", "vocabularyBy"]) {
      if (k in reg) fail(`placement "${p}": its registry carries "${k}" — a placement registers no vocabulary and names none (§8.6)`);
    }
    if (!(reg.refusalClasses ?? []).includes("vocabulary-unresolved")) fail(`placement "${p}": its registry does not list vocabulary-unresolved (§9.2)`);
    const scope = setOf(manifest.profiles[p]);
    for (const v of vocabularies) {
      if (scope.has(`profile-${v}`)) fail(`placement "${p}" is scoped to "profile-${v}", one vocabulary profile's family — which vocabulary applies is the composition's to decide (§8.6)`);
    }
    if (!scope.has("profile-placement")) fail(`placement "${p}" is not scoped to the placement family profile-placement`);
    const doc = read(`PROFILE_${p.toUpperCase().replace(/-/g, "_")}.md`);
    if (!/^\|\s*Profile kind\s*\|\s*placement\b/m.test(doc)) fail(`placement "${p}": its document's §P1 states no "Profile kind | placement" row`);
    const stated = doc.match(/\|\s*Profile version\s*\|\s*([0-9][^|]*?)\s*\|/)?.[1]?.trim();
    if (stated !== reg.profileVersion || stated !== (manifest.profileVersions ?? {})[p]) {
      fail(`placement "${p}": profile version ${stated} (document), ${reg.profileVersion} (registry), ${(manifest.profileVersions ?? {})[p]} (manifest)`);
    }
  }

  // A vocabulary-unresolved vector exhibits its fault: a placement, and a root no vocabulary profile owns.
  const unresolved = manifest.vectors.filter((v) => v.reject === "vocabulary-unresolved");
  if (!unresolved.length) fail("no vocabulary-unresolved vector — §8.6's refusal is carried by nothing");
  for (const v of unresolved) {
    if (kinds[v.profile] !== "placement") fail(`${v.id}: refused as vocabulary-unresolved under "${v.profile}", which is not a placement profile`);
    const base = JSON.parse(readFileSync(join(here, v.file), "utf8")).base;
    if (baseOwner.has(base)) fail(`${v.id}: its root's base "${base}" belongs to "${baseOwner.get(base)}", so the vocabulary resolves and nothing in it is what it claims to falsify`);
  }
}

// ── the shared-conventions citation ──────────────────────────────────────
//
// A cited convention is binding unless an exception is stated in the form the
// conventions require. Both exceptions this document takes are about §4, and
// both must remain visible: an exception that quietly loses its marking reads
// as compliance.

{
  const exceptions = (core.match(/^> \*\*Exception to the shared conventions/gm) ?? []).length;
  if (exceptions !== 2) {
    fail(`the core states ${exceptions} marked convention exception(s); it takes exactly two, both in §4 (member order, and the JCS relationship)`);
  }
  if (!/## Shared conventions/.test(core)) fail("the core does not cite the shared conventions");
}

if (failures.length) {
  console.error(`cross-artefact agreement violated (${failures.length}):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(
  `cross-artefact agreement: the core text, the ${Object.keys(manifest.profileVersions ?? {}).length} profile document(s), ` +
    `their registries, the node schema and the manifest all say the same things.`,
);
