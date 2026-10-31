# Worked example — certifying a minimal evaluator

**Non-normative.** [`RUNBOOK.md`](RUNBOOK.md)'s seven steps, carried out end to end against a real
implementation, with the commands as run and the output as returned. It exists to answer one question
a runbook cannot answer about itself: **can somebody who has only this repository actually finish?**

Two things about it are deliberate and worth knowing before you read the verdict.

**Nothing outside this checkout is assumed.** Every command below runs from a clone of this
specification home and nothing else. The subject is described by what it does, never by where it
lives — which is also how it would arrive from a third party, and the only way to find out whether the
runbook stands up without the authors' context propping it up.

**It does not come out green, and that is the result rather than a flaw in it.** The subject fails one
in-scope vector, and its runtime posture turns out to be unclaimable under the profile it qualifies
for. Both are recorded rather than smoothed, because a worked example that certified cleanly would be
indistinguishable from one that could not fail — which is the argument the corpus's own gate makes
about its go-red self-tests, arriving one level up.

> **Since this run (2026-08-25):** the subject closed its one named limit — its decoder now refuses
> any `rateLimited` spelling other than the string `"true"`/`"false"`, including the member's
> absence, exactly as the closure procedure its own harness assertion named. A re-run against the
> same corpus would refuse all fifteen reject vectors in scope and carry an empty named-limits
> table; the facet finding is unaffected (an empty claim was already a complete answer). This
> record stands as run, unmodified below, because the refuted report is the part of the kit only a
> failure exercises.

## The subject

A **minimal evaluator**: it decodes a composition and reduces it to a plain minimal-API server
scaffold — a base host, module boundaries and their query contracts — and emits nothing else. It
renders no client tier, reaches no other deployment, and composes no substrate beyond that.

Note the subject is the **pair**: the decoder and the reduction. Reducing a composition means first
reading one, so a certification that covered only the reducer would be certifying half of what a user
of it depends on.

---

## Step 1 — Verify the corpus, then pin it

```
pwsh ./run.ps1
```

```
== resident emitter: byte comparison
== resident emitter: internal assertions
== manifest invariants
== cross-artefact agreement
== facet certification
== self-test: emitter goes red on an altered fixture        went red as required (exit 1)
== self-test: manifest check goes red on a vector missing from the tree   went red as required (exit 1)
== self-test: agreement check goes red on a registry the profile document does not match   went red as required (exit 1)
== self-test: facet certification goes red on a declared value nothing demonstrates   went red as required (exit 1)
== self-test: facet certification goes red on an edited effect ledger   went red as required (exit 1)
== self-test: facet certification goes red on a conflict vector whose lanes no longer conflict   went red as required (exit 1)
== self-test: facet certification goes red on a stale-quote vector that is no longer stale   went red as required (exit 1)
== self-test: ladder check goes red on a registered rung that obliges nothing   went red as required (exit 1)
== self-test: ladder check goes red on a rung the ladder document does not name   went red as required (exit 1)

All checks passed.
```

```powershell
git rev-parse --short HEAD
(Get-FileHash wire-fixtures/manifest.json -Algorithm SHA256).Hash.ToLowerInvariant()
```

```
b117f2e
47f6c3a30068717ca5835dfbe0a60a6cc5626b60ceb4ce5d95edb24232e18b6e
```

**First friction, and it is thirty seconds of confusion rather than a day of it.** `Get-FileHash`
returns upper-case hex; every digest recorded in this corpus is lower-case. A pin that compared them
as strings would disagree with itself on the first run, and the failure reads as corpus drift. The
runbook now lower-cases in the command it hands you.

---

## Step 2 — Choose the rungs

```powershell
node -e 'const m = JSON.parse(require("node:fs").readFileSync("wire-fixtures/manifest.json", "utf8")); Object.entries(m.stackRungs).forEach(([rung, r]) => console.log(rung.padEnd(24), r.status.padEnd(11), (r.extends ? "above " + r.extends : "the floor").padEnd(20), r.obligations.map(o => o.citedSpecification + "@" + o.version).join(", ") || "(nothing)"))'
```

```
composition              registered  the floor            app-composition-wire@1
composition+ui           registered  above composition    fuaran-ui-specification@0.2.0
composition+logic        reserved    above composition    (nothing)
composition+federation   registered  above composition    federation-seam-wire@1
```

The subject emits no client tier, so a view binding has nothing to bind and it reaches no other
deployment. **Claim: `composition`, and nothing above it.**

That is a complete answer rather than a partial one (§L3.1), and the listing is what makes it easy to
believe: the three rungs above the floor are independent, so declining all three is not "two thirds of
the way up" anything. `composition+logic` is reserved and could not be claimed even if the subject
wanted to (§L6) — it obliges nothing, so the claim would be unfalsifiable.

**Effective claim** (closed under the prerequisite relation, §L4): `composition`. Nothing to close.

---

## Step 3 — Choose the conformance profile

```powershell
node -e 'const m = JSON.parse(require("node:fs").readFileSync("wire-fixtures/manifest.json", "utf8")); Object.entries(m.profiles).forEach(([p, fams]) => console.log(p.padEnd(20), (m.profileVersions[p] ? "v" + m.profileVersions[p] : "(this document)").padEnd(18), fams.join(", ")))'
```

```
core                 (this document)    document, node, citation, extension, accept, reject
server-app-host      v1.1               document, node, citation, extension, accept, reject, profile-server-app-host
```

The subject *builds* compositions, which points at an evaluator profile — but it is not an evaluator of
the `server-app-host` family. It supplies none of that profile's capability layers and has no seam for
its companion slots; presented with either it refuses outright rather than reducing into an application
that would quietly provide something weaker than the composition describes. It implements none of that
profile's composition rules and must not enforce them.

**Claim: `core`.** An implementation that reads compositions written for an evaluator profile without
implementing its rules claims `core`, and that claim is honest and useful (core Appendix B.4).

**Second friction — an unevenness that needed a rule.** The subject's value spaces are closed variants
in its language, so an unregistered base host, layer, companion slot or view token has **no case to
decode into** and is refused before any profile rule is consulted. That is strictly *more* than `core`
obliges — core §2.1 says a `core` reader must not reject an unrecognised token — and it is not a choice
anyone made; it falls out of the type. Is that a failed `core` claim, an unannounced profile claim, or
neither?

Neither: it is an unevenness, and the honest thing is to **report it as one**. The runbook now names it
in step 3 as a general fact about that family of languages, and the report has a place to say it, so
the next certifier meets it as a documented case rather than as a crisis.

---

## Step 4 — Enumerate the scope

```powershell
node -e 'const m = JSON.parse(require("node:fs").readFileSync("wire-fixtures/manifest.json", "utf8")), p = "core", f = new Set(m.profiles[p]), s = m.vectors.filter(v => f.has(v.family)); s.forEach(v => console.log(v.kind.padEnd(11), (v.detect || "-").padEnd(9), v.id)); console.log("scope", p, "=", s.length, "vectors")'
```

Tallied by family and kind:

```
   2 document/round-trip
   9 node/round-trip
   3 citation/round-trip
   6 extension/round-trip
   4 accept/accept
  15 reject/reject
  39 TOTAL
```

All fifteen reject vectors in this scope carry `detect: codec` — the decoder owes every one of them.

**Third friction, and the expensive one.** The first attempt at this step took the scope from the
directory listing, which sweeps in `kill-and-replay/`, `partition-and-fold/` and `attestation-quote/`.
Those are facet families in a **separate partition** (`facetProfiles`), and their vectors are scenarios
rather than documents a reader decodes — so feeding them to a decoder produces a wall of refusals that
are all correct and all meaningless. The manifest is the enumeration and the `profiles` partition is
the scope; a directory listing is neither. The runbook now says so in step 4, before the command
rather than after it.

---

## Step 5 — Run the decode-scope families

The subject's harness reads the manifest, filters to the families the `profiles` partition maps to
`core`, and does what each vector's `kind` says.

| Family | Kind | Enumerated | Executed | Passed |
|---|---|---|---|---|
| `document` | round-trip | 2 | 2 | 2 |
| `node` | round-trip | 9 | 9 | 9 |
| `citation` | round-trip | 3 | 3 | 3 |
| `extension` | round-trip | 6 | 6 | 6 |
| `accept` | accept | 4 | 4 | 4 |
| `reject` | reject | 15 | 15 | **14** |
| **Total** | | **39** | **39** | **38** |

Every round-trip vector re-encodes **byte-identically** — not equivalently; equivalence is
unfalsifiable in a corpus. Every accept vector decodes and is interpreted as the manifest's
`interpretation` states: an unknown member is ignored and not re-emitted, an absent `children` member
reads as a leaf, a citation-bearing binding with no citation reads as the reader's own revision, and
the input escapes this format accepts but never emits survive the read.

Both harness obligations discharged:

- **Executed equals enumerated**, asserted in the harness rather than observed by eye, so that a
  filter which silently stops matching fails the run instead of shrinking it.
- **A mutation makes it go red**: `document/minimal` is perturbed in memory — one node id rewritten —
  and the re-encode is asserted not to reproduce the original. In memory, never on disk: a self-test
  that edited the checkout is one interrupted run away from leaving the corpus broken.

**The one failure — `reject/boolean-spelling-invalid`.** The format's one boolean-valued member is
spelled as a JSON literal `true` instead of the string `"true"` (core §4.5, §5.7). The subject does not
refuse it. Worse than not refusing: its decoder matches the string and falls through to a default, so
the document decodes to **false** — the opposite of what it says, with nothing reporting it.

The vector stands. The corpus is the oracle and no implementation's behaviour is, so this goes into the
report as a **named limit** with its class and its consequence, and it is asserted in the harness
against the *current* behaviour — so that closing the gap arrives as a failing test somebody has to
decide about, rather than as a silent improvement nobody records.

**Outside the claimed scope, recorded because it is real:** the six `profile-server-app-host`
round-trip vectors also re-encode byte-identically — that profile's two node kinds are inside the
subject's kind space. It is a narrower extra claim, not a profile claim, and it is reported separately
rather than folded in. Its five `detect: profile` reject vectors are correctly **not** refused: a
`core` implementation has no basis for a profile rule, and refusing anyway would be claiming a profile
it has not implemented.

---

## Step 6 — Declare the facets

```powershell
node -e 'const m = JSON.parse(require("node:fs").readFileSync("wire-fixtures/manifest.json", "utf8")), p = "core"; Object.entries(m.facetDeclarations[p]).forEach(([axis, d]) => console.log(axis.padEnd(12), d.honoured.length ? d.honoured.join(", ") : "(none) — " + d.note))'
```

```
delivery     (none) — A core implementation ... performs nothing, so it delivers nothing. ...
idempotency  (none) — As delivery: there is no operation to repeat.
restart      (none) — As delivery: there is no in-flight work for a restart to be visible to.
convergence  convergentFold
attestation  (none) — A core implementation runs nothing ...
```

What the subject actually does, captured honestly: a request is dispatched once and lost on failure
(`atMostOnce`); a read repeats freely and a write takes twice (`idempotent`, `nonIdempotent`); nothing
carries in-flight work across a restart (`lostOnRestart`). It is handed a composition **value** rather
than an authorship stream, so it folds nothing — it does **not** honour `convergentFold`. It runs in an
ordinary process, so it attests nothing.

**Fourth friction, and the one that reorders the runbook.** Four of those values are real, and **none
of them is claimable**. An implementation's facet claim names values from within **its profile's**
declaration (core §11.2), and `core` declares the delivery, idempotency and restart axes empty — for a
good reason, since a `core` implementation performs nothing. The one value `core` does declare,
`convergentFold`, is the one the subject does not honour.

The wrong response is to claim them anyway, and the mechanism refuses it: a value outside the profile's
declaration is not available to claim. The right response is what the format's own machinery already
provides — **an evaluator whose runtime posture is real registers its own profile** (core §8), carrying
its own facet declaration and demonstrating each declared value against a family vector. That is
precisely what `server-app-host` did, and it is what "join by conformance" means in practice: the
funnel is a registration, not a negotiation.

Until such a profile exists, the honest facet claim is **nothing, on every axis** — which is a complete
answer. A value not claimed is a statement rather than a gap (core §11.3): declining costs nothing, and
claiming costs a vector.

**Fifth friction, found while sketching what that profile would have to say.** The subject's own
runtime vocabulary covers three axes; the format registers five. A profile declaration must carry
**every** registered axis, empty-with-a-reason where it provides nothing (core §11.4), because an
absent axis is indistinguishable from one that was forgotten. A first attempt at a declaration would
have shipped with two axes silently missing. The runbook now says it in step 6, at the moment somebody
is drafting one.

**Sixth friction — a query that credited the wrong demonstration.** The first version of the
value-to-vector query filtered only on `facetProfiles`, which scopes `partition-and-fold` to **both**
profiles. That returned `partition-and-fold/reject-single-writer` as an available demonstration, when
the manifest entry's own `profile` member says it demonstrates for `server-app-host`. Two filters are
needed, and the runbook's query now carries both:

```powershell
node -e 'const fs = require("node:fs"), m = JSON.parse(fs.readFileSync("wire-fixtures/manifest.json", "utf8")), p = "core", fams = new Set(m.facetProfiles[p]); m.vectors.filter(v => fams.has(v.family) && v.profile === p).forEach(v => { const d = JSON.parse(fs.readFileSync("wire-fixtures/" + v.file, "utf8")).demonstrates || []; console.log(v.kind.padEnd(10), v.id.padEnd(46), d.map(x => x.axis + "=" + x.value).join(", ")); })'
```

```
hash       partition-and-fold/independent-lanes           convergence=convergentFold
hash       partition-and-fold/arrival-order-immaterial    convergence=convergentFold
hash       partition-and-fold/stamp-tie-lane-order        convergence=convergentFold
reject     partition-and-fold/reject-conflicting-write    convergence=convergentFold
```

Note also that the values live in the **vector document's** `demonstrates` member, not in the manifest
entry — the manifest enumerates the vectors, the vector states what it exhibits.

**No facet family is run**, because nothing is claimed and there is nothing to demonstrate.

---

## Step 7 — The report

Filled in from [`TEMPLATE.md`](TEMPLATE.md).

---

# Certification report — `minimal-evaluator`

**A claim, published with its evidence.** Nobody audited this run; the specification family maintains
no certified-implementations registry. What makes it worth reading is that every line is falsifiable
against a corpus anyone can check out.

| | |
|---|---|
| **Subject** | `minimal-evaluator` — decodes a composition and reduces it to a plain minimal-API server scaffold; emits no client tier and reaches no other deployment. |
| **Subject revision** | the build present at the time of the run |
| **Certified on** | 2026-08-25 |
| **Report template** | version 1 |
| **Runbook** | version 1 |

## Pins

| Artefact | Value |
|---|---|
| Specification | `app-composition-wire`, format version 1 |
| Conformance profile | `core` (no profile version — `core` is defined by the format document itself) |
| Ladder | version 1 |
| Corpus commit | `b117f2e` |
| Corpus manifest digest | `47f6c3a30068717ca5835dfbe0a60a6cc5626b60ceb4ce5d95edb24232e18b6e` |

## The claim

- **Rungs, as claimed:** `composition`
- **Effective claim (§L4):** `composition`
- **Conformance profile:** `core`
- **Facet claim:** none, on every axis

The subject reads compositions and reduces them; it renders no view tier, federates with nobody and
carries no logic vocabulary, so the floor is the whole of what it owes. Its claim is `core` rather than
an evaluator profile because it implements no registered profile's composition rules — it is an
evaluator of a family that has not registered a profile.

**One unevenness, stated rather than glossed.** Its value spaces are closed variants in its
implementation language, so an unregistered token is refused before any profile rule is consulted. That
is more than `core` obliges (core §2.1) and falls out of the type rather than from a decision. It is
not a profile claim: the profile's composition rules are neither implemented nor enforced.

## Per-rung verdicts

| Rung | Cited specification @ revision | Corpus families run | Executed | Verdict |
|---|---|---|---|---|
| `composition` | `app-composition-wire@1` | `document`, `node`, `citation`, `extension`, `accept`, `reject` | 39 | **refuted** |

Refuted on one vector, itemised below. The other 38 pass, and both harness obligations are discharged
— which is what makes "refuted" a precise statement rather than a shrug.

## Per-family verdicts

| Family | Kind(s) | Enumerated | Executed | Passed | Verdict |
|---|---|---|---|---|---|
| `document` | round-trip | 2 | 2 | 2 | met |
| `node` | round-trip | 9 | 9 | 9 | met |
| `citation` | round-trip | 3 | 3 | 3 | met |
| `extension` | round-trip | 6 | 6 | 6 | met |
| `accept` | accept | 4 | 4 | 4 | met |
| `reject` | reject | 15 | 15 | 14 | **refuted** |
| **Total** | | **39** | **39** | **38** | |

Outside the claimed scope, reported separately: `profile-server-app-host` round-trip 6 / 6 byte-identical
(a narrower extra claim — the profile's two node kinds are in this codec's kind space). Its five
`detect: profile` reject vectors are **not** refused, correctly: a `core` implementation has no basis
for a profile rule.

## Harness obligations

| Obligation | Evidence |
|---|---|
| Executed count equals the manifest's enumeration for this scope | Asserted in the harness ("the executed count equals what the manifest enumerates for this scope"), not observed by eye. |
| A mutated document makes the harness go red | `document/minimal` perturbed **in memory**, one node id rewritten; the re-encode is asserted not to reproduce the original. |

## Declared vs certified facets

| Axis | Profile declares | Subject claims | Demonstrating vector(s) | Verdict |
|---|---|---|---|---|
| `delivery` | (none) | none | — | n/a — not claimed |
| `idempotency` | (none) | none | — | n/a — not claimed |
| `restart` | (none) | none | — | n/a — not claimed |
| `convergence` | `convergentFold` | none | — | n/a — not claimed |
| `attestation` | (none) | none | — | n/a — not claimed |

**The subject honours values its profile does not declare, and does not claim them.** Its runtime
posture is `atMostOnce` on delivery, `idempotent` and `nonIdempotent` on idempotency, `lostOnRestart`
on restart. `core` declares all three axes empty — correctly, since a `core` implementation performs
nothing — so none of those values is available to claim here (core §11.2), and claiming one anyway is
the shape core §11.3 refuses. The resolution is to **register an evaluator profile** (core §8) with a
declaration carrying all five axes, and to demonstrate each declared value against a family vector.
Until then the honest claim is empty, and empty is a complete answer.

The one value `core` does declare, `convergentFold`, is not honoured: the subject is handed a
composition value rather than an authorship stream, so it folds nothing. Claiming fewer values than a
profile declares needs no explanation — a declaration says what an implementation **may** claim, not
what every one of them does.

## Named limits

| Vector | Class | What happens instead | Consequence |
|---|---|---|---|
| `reject/boolean-spelling-invalid` | `boolean-spelling-invalid` (`detect: codec`) | Not refused. The decoder matches the string form and falls through to a default, so a JSON literal `true` decodes to **false**. | A composition whose one boolean-valued member is spelled as a JSON literal is read as the opposite of what it says, silently. Refusing is the only reading that cannot invert an author's meaning. |

Asserted in the harness against the current behaviour, so that closing it arrives as a failing test to
be decided rather than as a silent improvement.

_Closed since this run (2026-08-25) — see the note at the head of this document. The mechanism worked
as designed: the assertion failed, the closure was decided rather than slipped in, and the decoder now
refuses the vector's class._

## Verdict

**Refuted at `composition`, profile `core`, against corpus
`47f6c3a30068717ca5835dfbe0a60a6cc5626b60ceb4ce5d95edb24232e18b6e`.**

It says the subject reproduces the canonical bytes of every round-trip vector in scope, interprets
every forward-compatibility vector as specified, and refuses fourteen of the fifteen documents it owes
a refusal on — with the fifteenth named, its failure mode stated precisely, and a test standing on it.
It says nothing about any rung above the floor, none of which is claimed, and nothing about runtime
behaviour, none of which is claimed either.

---

## What this exercise produced

Six pieces of friction, every one folded back into the kit rather than worked around:

| # | Friction | Fix |
|---|---|---|
| 1 | `Get-FileHash` returns upper-case; the corpus records lower-case. | Runbook step 1 lower-cases in the command it hands you; pitfall 5. |
| 2 | A closed-sum-type implementation refuses tokens a `core` reader must not refuse — failure, or profile claim? | Named in step 3 as a general fact about that language family; the report has a place to state it as an unevenness. |
| 3 | Scope taken from the directory listing sweeps in the facet families, whose vectors are scenarios. | Step 4 states the partition before the command; pitfall 2. |
| 4 | The facet claim is bounded by the profile's declaration, so computing it first wastes the work. | Step 6 sits after step 3, and opens with the rule; pitfall 1 names it as the ordering mistake that costs most. |
| 5 | A profile declaration must carry every registered axis, not only the ones the implementation has a vocabulary for. | Stated in step 6 at the moment somebody is drafting one. |
| 6 | A value-to-vector query filtered only on family scope credits demonstrations belonging to another profile. | Step 6's query carries both filters, and says which does what and why. |

And one thing the runbook needed that no normative section states, because it is about shells rather
than about compositions: the Node queries are **single-quoted with double quotes inside and no `$`**,
which is what makes one command work unchanged in both a PowerShell and a POSIX shell. A reader who
retypes them with the quoting inverted will get a parser error from their shell, not from Node.

## Licence

Apache-2.0 — see [`../LICENSE`](../LICENSE) and [`../NOTICE`](../NOTICE). Copyright 2026 Diametrical Ltd.
