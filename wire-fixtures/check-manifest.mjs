// SPDX-License-Identifier: Apache-2.0
//
// Structural invariants of the corpus manifest.
//
// The resident emitter (emit.mjs) answers "do the bytes still come out the way
// the specification says". This answers the different question the emitter
// structurally cannot: "does the manifest still describe the tree it sits in".
//
// The distinction matters because the manifest is the enumeration a conformance
// claim is made against. A vector present in the tree but missing from the
// manifest is not a harmless extra file — it is a document nobody is required
// to handle, and every implementation still reports full conformance. That
// failure is invisible from inside the emitter, which only ever looks at
// vectors the manifest already lists.
//
//   node check-manifest.mjs
//
// Exits non-zero, naming every violation found, rather than stopping at the
// first: a corpus with three problems should take one run to discover, not
// three.

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const KINDS = new Set(["round-trip", "hash", "reject", "accept"]);
// `runtime` is the third detection layer: an obligation neither a decoder
// nor a profile's composition rules can reach, because only running the
// scenario answers it. A facet vector's refusal is always one of these.
const DETECT = new Set(["codec", "profile", "runtime"]);

const failures = [];
const fail = (m) => failures.push(m);

const manifest = JSON.parse(readFileSync(join(here, "manifest.json"), "utf8"));
const families = manifest.families ?? [];
const declared = new Set(families);
const reserved = new Set(manifest.reservedFamilies ?? []);

// --- the reserved names ---------------------------------------------------
// A reserved family is a family that is NOT MISSING (section 7.4). It must not
// also be declared — a name cannot be both promised and present — and it must
// carry a reason, because a bare name in a list is indistinguishable from one
// somebody forgot to remove.
for (const r of reserved) {
  if (declared.has(r)) fail(`family "${r}" is both declared and reserved`);
  if (!(manifest.reservedFamilyReasons ?? {})[r]) fail(`reserved family "${r}" carries no reason`);
}

// --- the profile partition ------------------------------------------------
for (const [profile, fams] of Object.entries(manifest.profiles ?? {})) {
  for (const f of fams) {
    if (!declared.has(f)) fail(`profile "${profile}" names family "${f}", which is not declared in families`);
  }
}

// A DOCUMENT profile (MODULE_AUTHORING_WIRE.md section M9) scopes a claim
// about another document of this specification. It is kept apart from the
// evaluator profiles above because a placement names an evaluator and a
// document profile names none — a reader enumerating placements must never
// find one here. Its families are its own: a family reachable from both
// partitions would let one vector be certified under two different claims.
const documentProfiles = manifest.documentProfiles ?? {};
const evaluatorFamilies = new Set(Object.values(manifest.profiles ?? {}).flat());
for (const [profile, fams] of Object.entries(documentProfiles)) {
  if (profile in (manifest.profiles ?? {})) fail(`profile "${profile}" is both an evaluator profile and a document profile`);
  for (const f of fams) {
    if (!declared.has(f)) fail(`document profile "${profile}" names family "${f}", which is not declared in families`);
    if (evaluatorFamilies.has(f)) fail(`document profile "${profile}" names family "${f}", which an evaluator profile also scopes`);
  }
}
const profileNames = new Set([...Object.keys(manifest.profiles ?? {}), ...Object.keys(documentProfiles)]);

// --- where each vector is published ----------------------------------------
// A registered profile may be published by another home (section 8.5): the
// evaluator owner's, beside its implementation. Every vector says which home
// publishes it, so the corpus each home carries is a selection over data and
// never a hand list. A vector homed with a profile is that profile's own
// evidence, so it claims that profile; and a family moves whole, because a
// home publishes directories, not halves of one.
const profileHomes = manifest.profileHomes ?? {};
for (const [p, h] of Object.entries(profileHomes)) {
  if (p === "core" || p in documentProfiles) fail(`profileHomes names "${p}", which is not an evaluator profile`);
  if (!/^https:\/\/\S+$/.test(h?.url ?? "")) fail(`profileHomes: "${p}" names no https URL for the home that publishes it`);
  if (!h?.note) fail(`profileHomes: "${p}" carries no note`);
}
const homes = new Set(["core", ...Object.keys(profileHomes)]);
const familyHome = new Map();
for (const v of manifest.vectors ?? []) {
  const id = v.id ?? "(anonymous vector)";
  if (!homes.has(v.home)) {
    fail(`${id}: home ${JSON.stringify(v.home)} is neither core nor a profile profileHomes registers`);
    continue;
  }
  if (v.home !== "core" && v.profile !== v.home) fail(`${id}: homed with "${v.home}" but claims profile "${v.profile}"`);
  if (!familyHome.has(v.family)) familyHome.set(v.family, v.home);
  else if (familyHome.get(v.family) !== v.home) {
    fail(`${id}: family "${v.family}" is split between homes "${familyHome.get(v.family)}" and "${v.home}"`);
  }
}
// A family published by a profile's own home is run by that profile's claim
// alone: a core or placement claim that ran it would lose vectors at the cut.
for (const [family, home] of familyHome) {
  if (home === "core") continue;
  for (const scope of [manifest.profiles ?? {}, manifest.facetProfiles ?? {}]) {
    for (const [p, fams] of Object.entries(scope)) {
      if (p !== home && fams.includes(family)) fail(`family "${family}" is published with "${home}" and also scoped to "${p}"`);
    }
  }
}

// A profile other than `core` states its version, because a claim naming a
// profile and not its version is only half a claim (section 10.3).
for (const p of profileNames) {
  if (p === "core") continue;
  if (!(manifest.profileVersions ?? {})[p]) fail(`profile "${p}" declares no version`);
  if (!(manifest.profileRegistries ?? {})[p]) fail(`profile "${p}" names no registry file`);
}

// --- every enumerated vector ----------------------------------------------
const enumerated = new Set();
const seenIds = new Set();
const classesWithVectors = new Set();

for (const v of manifest.vectors ?? []) {
  const id = v.id ?? "(anonymous vector)";
  if (seenIds.has(id)) fail(`${id}: enumerated twice`);
  seenIds.add(id);

  if (!KINDS.has(v.kind)) fail(`${id}: unknown kind ${JSON.stringify(v.kind)}`);
  if (!declared.has(v.family)) fail(`${id}: family ${JSON.stringify(v.family)} is not declared`);
  // A profile another home publishes is still a registered name: a core
  // vector may demonstrate its facet declaration, which that home certifies.
  if (!profileNames.has(v.profile) && !(v.profile in profileHomes)) fail(`${id}: profile ${JSON.stringify(v.profile)} is not declared`);
  if (v.file && !v.file.startsWith(v.family + "/")) fail(`${id}: file "${v.file}" is not under its family directory`);

  // A vector must be reachable from at least one profile, or no conformance
  // claim ever runs it — enumerated and unreachable is the same as absent.
  // Two partitions reach a vector, and they are deliberately separate:
  // `profiles` is the DECODE scope (§8.1), `facetProfiles` the facet scope
  // (§11.2). A facet family in the decode partition would widen what a
  // decoder must do, which §11.2 exists to prevent. A facet vector whose
  // profile another home publishes is reached by that profile's claim, whose
  // facet scope is published with it.
  const reachable =
    Object.values(manifest.profiles ?? {}).some((fams) => fams.includes(v.family)) ||
    Object.values(documentProfiles).some((fams) => fams.includes(v.family)) ||
    Object.values(manifest.facetProfiles ?? {}).some((fams) => fams.includes(v.family)) ||
    (v.profile in profileHomes && v.family in (manifest.facetFamilies ?? {}));
  if (!reachable) fail(`${id}: family "${v.family}" is in no profile, so no conformance claim runs this vector`);

  // A facet family's vectors are scenarios, never documents a reader
  // decodes: a `round-trip` or `accept` vector in one would be asking a
  // decoder to certify a runtime claim.
  if ((manifest.facetFamilies ?? {})[v.family] && v.kind !== "hash" && v.kind !== "reject") {
    fail(`${id}: a vector in facet family "${v.family}" is kind hash or reject, not ${JSON.stringify(v.kind)}`);
  }
  if (!(manifest.facetFamilies ?? {})[v.family] && v.kind === "hash") {
    fail(`${id}: kind hash is a facet-family vector kind, and "${v.family}" is not a facet family`);
  }

  // A reject vector states what a reader must refuse it FOR, and at which
  // layer. Without the class, a harness passes it by refusing for any reason
  // at all — including a reason the specification does not sanction. Without
  // the layer, an implementation cannot tell whether the obligation is its
  // decoder's or its profile's, and will claim whichever it happens to meet.
  if (v.kind === "reject") {
    if (!v.reject) fail(`${id}: a reject vector must name its refusal class`);
    if (!DETECT.has(v.detect)) fail(`${id}: a reject vector must name a detection layer (${[...DETECT].join(" | ")})`);
    if (v.reject) classesWithVectors.add(v.reject);
  } else {
    if (v.reject) fail(`${id}: names a refusal class but is kind ${JSON.stringify(v.kind)}`);
    if (v.detect) fail(`${id}: names a detection layer but is kind ${JSON.stringify(v.kind)}`);
  }

  // An accept vector says how the document must be INTERPRETED. "Do not
  // refuse this" is not falsifiable on its own: a reader that decodes it to
  // something else entirely has still not refused it.
  if (v.kind === "accept" && !v.interpretation) fail(`${id}: an accept vector must state its interpretation`);
  if (v.kind !== "accept" && v.interpretation) fail(`${id}: states an interpretation but is kind ${JSON.stringify(v.kind)}`);

  if (!v.description) fail(`${id}: no description`);

  if (!v.file) { fail(`${id}: no file`); continue; }
  enumerated.add(v.file);

  let bytes;
  try {
    bytes = readFileSync(join(here, v.file));
  } catch {
    fail(`${id}: file "${v.file}" is enumerated but not present`);
    continue;
  }

  const got = createHash("sha256").update(bytes).digest("hex");
  if (got !== v.sha256) fail(`${id}: sha256 is ${v.sha256} but the file hashes to ${got}`);

  // A fixture's bytes ARE the document — a trailing newline would be part of it.
  if (bytes.length && bytes[bytes.length - 1] === 0x0a) fail(`${id}: file ends with a newline, which would be part of the document`);
  if (bytes.includes(0x0d)) fail(`${id}: file contains a CR — the checkout is not honouring the LF pin`);
  if (!bytes.length) fail(`${id}: file is empty`);
}

// --- refusal classes with no vector ---------------------------------------
// A class listed here is one the specification states and the corpus does not
// carry, WITH ITS REASON. Both halves matter: a class silently absent is a
// rule nobody certifies, and a class listed here that DOES have a vector is a
// stale note claiming a gap that has since been closed.
for (const entry of manifest.refusalClassesWithoutVectors ?? []) {
  if (!entry.class) fail("refusalClassesWithoutVectors: an entry names no class");
  if (!entry.reason) fail(`refusalClassesWithoutVectors: "${entry.class}" carries no reason`);
  if (classesWithVectors.has(entry.class)) {
    fail(`refusalClassesWithoutVectors names "${entry.class}", but a vector for it exists — the note is stale`);
  }
}

// --- every file in the tree -----------------------------------------------
for (const family of families) {
  let entries;
  try {
    entries = readdirSync(join(here, family));
  } catch {
    fail(`family "${family}" is declared but has no directory`);
    continue;
  }
  for (const name of entries) {
    const rel = posix.join(family, name);
    if (!statSync(join(here, rel)).isFile()) continue;
    if (!enumerated.has(rel)) fail(`${rel} is present in the tree but enumerated by no vector`);
  }
}

// A reserved family must NOT have a directory — a promise with contents is a
// family somebody started and did not declare.
for (const r of reserved) {
  try {
    if (statSync(join(here, r)).isDirectory()) fail(`reserved family "${r}" has a directory; declare it or empty it`);
  } catch {
    /* absent is what a reservation looks like */
  }
}

if (failures.length) {
  console.error(`manifest invariants violated (${failures.length}):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

const byKind = {};
for (const v of manifest.vectors) byKind[v.kind] = (byKind[v.kind] ?? 0) + 1;
const shape = Object.entries(byKind).map(([k, n]) => `${n} ${k}`).join(", ");
console.log(
  `manifest describes its tree: ${manifest.vectors.length} vectors (${shape}) across ${families.length} families, ` +
    `${profileNames.size} profiles, ${reserved.size} reserved family name(s).`,
);
