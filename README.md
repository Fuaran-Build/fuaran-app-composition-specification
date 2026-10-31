# App-composition wire specification

A language-neutral, versioned wire specification for an **application composition**: which host an
application is built on, which substrate seams it binds, which modules and data types it registers,
which settings and ports it reserves — carried as a tree of nodes any party can read, write, diff and
store, independently of the toolchain that will eventually build the application.

```
APP_COMPOSITION_WIRE.md        the specification. §1–§12 and Appendix A are normative.
PROFILE_*.md                   the placement profiles, each at its own version. §8.5 says where every registered
                               profile is published, and a vocabulary profile is published by its evaluator's owner.
CONFORMANCE_LADDER.md          the stack rungs: which OTHER specifications a claim names, at its own version.
MODULE_AUTHORING_WIRE.md       the module document a composition's module reference names — a DRAFT profile.
profiles/                      each registry published here, as data — the machine-readable rendering.
schemas/v1/                    JSON Schema — structural, subordinate to §5, and it cannot express order.
wire-fixtures/                 the conformance corpus. manifest.json is the authoritative enumeration.
certification/                 the certification kit: the runbook, the report template, a worked example.
run.ps1                        the gate: emitter, manifest, agreement, facets, and go-red proofs.
LICENSE / NOTICE               Apache-2.0.
```

## The shape of it

The format has a **neutral core** and **evaluator profiles**, and the split is the point.

The core specifies the document, the node shapes, the canonical encoding, the citation mechanism,
the extension mechanism and the refusals. A profile registers the *token vocabularies* those shapes
range over, declares any node kinds that exist only under its family of evaluators, and states its
composition rules. So a store, a differ, a transport or an archive implements `core` and reads a
composition written for an evaluator it has never heard of; something that is going to *build* the
composition implements a profile and knows what the tokens mean. A vocabulary profile is published by
the owner of the evaluator whose surface it registers, beside that implementation (§8.5); this home
publishes the core, the placement profiles and the module document.

A profile also declares its **runtime facets** (§11) — whether its evaluators can lose a message,
deliver one twice, carry work across a restart, or fold two authors' concurrent edits. Those are the
claims worth the most and the hardest to check, so the specification refuses to take one on
assertion: **a declared value with no passing conformance vector fails certification** (§11.3). The
demonstrations are registered families of scenario vectors (§12), and a family that does not exist
yet is reserved by name rather than renumbered later.

That division is not a design preference. Audited element by element, an application composition's
node **shapes** turn out to be largely statable without naming any evaluator, and the **value spaces**
those shapes range over largely are not — so the core specifies the first and profiles register the
second.

A third partition sits **above** the format rather than inside it. A composition routinely reaches
other specifications — a view contract a module was authored against, a seam another deployment is
reached across — and "supports all of that" is the sentence everybody writes and nobody can check.
[`CONFORMANCE_LADDER.md`](CONFORMANCE_LADDER.md) makes it checkable: a small set of named **rungs**,
each citing a further specification by name and revision, with the rule that claiming a rung claims
everything beneath it. A headless implementation that renders nothing and federates with nobody is
**fully conformant at the floor** and says so positively, rather than by listing what it lacks. The
ladder cites and never restates: no rung entry enumerates a cited specification's families, so the
only place that list can live is that specification's own manifest.

## Start here

- **Implementing?** Read §2 (pick a profile), §4 (canonical encoding — this is where the cost is),
  §5 (the node kinds), then §7 if you carry extensions. Appendix A is the checklist, ordered by how
  often each item is the thing that is wrong.
- **Certifying?** Start at [`certification/RUNBOOK.md`](certification/RUNBOOK.md) — seven steps from a
  cold checkout to a published report, with the commands, and with
  [`certification/WORKED_EXAMPLE.md`](certification/WORKED_EXAMPLE.md) carrying all seven out against a
  real implementation. [`wire-fixtures/README.md`](wire-fixtures/README.md) is where the obligations
  themselves are stated. A conformance claim names a profile; a claim without one is unfalsifiable.
- **Reading or writing a module body?** [`MODULE_AUTHORING_WIRE.md`](MODULE_AUTHORING_WIRE.md) specifies
  the module document — parameters, the closed handler vocabulary, the content address a composition
  cites a body by — as the `module-authoring` profile, stable at 1.0: §M2 says what that promises and
  the evidence it was promoted on.
- **Wondering why a shape is the way it is?** Appendix B. It is non-normative.

## Verify

```powershell
pwsh ./run.ps1
```

Requires Node.js and PowerShell 7; nothing else, and no build step. Five things happen: an
independent emitter reproduces every round-trip document byte for byte from unsorted input models;
the manifest is checked against the tree it sits in; the normative text, the profile documents and
their registries, the conformance ladder, the node schema, the module document with its registry and
schema, and the manifest are checked against each other — including that every module body a
composition vector commits to is one this corpus carries, by recomputed address — and the ladder's own two rules about an empty obligation set are enforced; every runtime
guarantee a profile declares is certified against a passing conformance vector, with each derived
outcome recomputed rather than read; and then all four checkers are run against deliberately
perturbed copies and required to go red.

## Status

**Format version 1.** **Ladder version 1.** `module-authoring` **profile version 1.0.** Each placement
profile states its own version, and a vocabulary profile is versioned where it is published. The
numbers move independently, for the reason §10.3 gives. The specification is self-contained: §1–§12
and Appendix A reference nothing outside this directory except §8.5's pointer to where a registered
profile is published, and name no implementation, no product, no vendor and no language.

Some things are deliberately incomplete and are marked as such in the text rather than left to be
discovered. No count appears below, for the same reason no vector count does: a number written beside
a list drifts from it and `manifest.json` cannot.

- **The module document's structured handler cases are specified and not yet exercised by a real
  module** ([`MODULE_AUTHORING_WIRE.md`](MODULE_AUTHORING_WIRE.md) §M2). The profile was promoted from
  draft to 1.0 on two real modules from applications in production use, measured against the four
  criteria stated there. Every handler either module carries is the escape, and §M2 records why for
  each, so a reader knows which parts of the vocabulary were tested and which were only specified.
  The promotion touches nothing the composition format promises: the one composition member the
  module document added, `moduleRef`'s `bodyAddress`, is OPTIONAL and additive (§5.4, §10.1).

- **The `fuaran.program/logic-tree` extension is RESERVED, not filled** (§7.4). Its declaration
  states one required field and one optional one, and it carries no semantics in this revision. The
  reservation exists so the vocabulary arrives as a filled declaration rather than as a revision of
  the format — and `manifest.json` reserves the matching `logic-tree` family name so that adding it
  enumerates rather than renumbers.
- **Some refusal classes have no corpus vector** (§9), and `manifest.json` is where they are
  enumerated — no number appears here, for the same reason no vector count does. Each is a
  composition-level rule a decoder
  alone cannot reach — it needs the whole tree, or the extension registry — and each is recorded in
  `manifest.json` with its reason, against the reserved `composition-rules` family. Recorded rather
  than silently absent: a rule nobody certifies and nobody has noticed is worse than one openly
  outstanding.
- **Some conformance families are RESERVED, not filled** (§12.3), and `manifest.json` names them with
  a reason each. Reserved on exactly the terms above: a name reserved there is a family that is *not
  missing*, and an implementation is *not failing* to run it.
- **Some facet values carry no discriminator** (§11.5) — nothing can yet decide, from a vector's own
  content, whether the value is exhibited. `manifest.json` enumerates them with the reason each is
  not yet decidable, and no profile may declare one. That is the difference between an honest gap and
  a claim resting on nothing.
- **A registered family may specify record cases its own vectors do not exercise**, and §12.7 names
  the three it carries. A consumer's evaluator will reach them and needs somewhere to report them, so
  they are specified; the corpus does not pretend to certify them. Recorded in the section rather than
  discovered by an implementer whose run produced a case the vectors never showed.
- **A stack rung is RESERVED, not filled** (`CONFORMANCE_LADDER.md` §L6) — registered by name with an
  **empty obligation set**, so filling it enumerates rather than renumbers. A reserved rung obliges
  nothing, so claiming one is refused rather than believed, and the gate enforces the converse too: a
  rung that is registered and obliges nothing is a claim anybody could make for free.

Nothing else is deferred: every other shape, encoding rule, registered token, refusal class and
declared facet value is specified and certifiable today.

## Contributing changes

A change to any specified member, ordering, encoding, refusal class or derived value updates the
specification, the affected profile, the schemas, the emitter, the corpus **and the codec of every
implementation certifying against it** — in the same change-set (§10.4). Run `pwsh ./run.ps1` before
committing; a corpus that lags its emitter certifies nothing, and a specification that lags either is
worse than absent, because it is believed.

See [`CONTRIBUTING.md`](CONTRIBUTING.md).
