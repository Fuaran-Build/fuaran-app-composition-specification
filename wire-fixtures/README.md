# App-composition conformance corpus

The executable half of [`../APP_COMPOSITION_WIRE.md`](../APP_COMPOSITION_WIRE.md), of the placement
profiles beside it and — for the module document —
[`../MODULE_AUTHORING_WIRE.md`](../MODULE_AUTHORING_WIRE.md). An implementation in any language
certifies against a named conformance profile by running the vectors this corpus lists for it.

## Layout

```
manifest.json              the authoritative enumeration: families, the reserved family names,
                           the profile partition, the facet axes / families / declarations,
                           the extension declarations, the refusal classes deliberately
                           without vectors, and every vector with its kind, its digest, its
                           home and — for a reject — its class and detection layer
emit.mjs                   an independent, dependency-free emitter (see below)
check-manifest.mjs         does the manifest still describe the tree it sits in?
check-cross-artefact.mjs   do the text, the profiles, their registries, the schema and the manifest agree?
check-facets.mjs           is every declared runtime guarantee demonstrated by a passing vector?

document/                  whole compositions
node/                      one minimal composition per core node kind
citation/                  the versioned cross-specification reference
extension/                 the namespaced, opaque hole and its reserved declaration
accept/                    forward compatibility: what a reader must NOT refuse
reject/                    what a reader must refuse, and for what
profile-placement/         what a placement owes whichever vocabulary it composes with (§8.6)
kill-and-replay/           §12.1 — durability: kill a session mid-step, replay, and see what
                           the projection and the effect ledger say happened
partition-and-fold/        §12.2 — mergeability: divergent authorship lanes, one deterministic
                           fold, and a halt where they interfere
attestation-quote/         §12.5 — attestation: is the composition a claim is made about the
                           composition that is actually running
placement-locality/        §12.6 — locality: does anything a composition's data flows carry
                           leave the region it started in, and did somebody say it may
incremental-recompute/     §12.7 — incrementality: when the data behind a registered data type
                           changes, how much of the answer is computed again, and is it still
                           the same answer

module-document/           MODULE_AUTHORING_WIRE.md — whole module documents: the root,
                           every parameter kind, a cited view and a composed effect, and
                           the two real modules the profile was promoted on
module-handler/            one module document per handler case and posture
module-reject/             what a module reader must refuse, and for what
module-accept/             what a module reader must NOT refuse
```

The four `module-*` families are scoped by a **document profile**, `module-authoring`, in the
manifest's `documentProfiles` partition — kept apart from the evaluator profiles because a placement
names an evaluator and a document profile names none. The profile is stable at 1.0
(`MODULE_AUTHORING_WIRE.md` §M2), and a claim against it names the corpus revision it was made at, as
a claim against any profile does.

Everything below the profile partition is a **facet family** (§11, §12) and their vectors are
**scenarios, not documents**.
They are in their own scope partition — `facetProfiles` — for the reason §11.2 gives: a facet claim
is separate from a decode claim, so putting a facet family in the decode partition would widen what
every conformant reader must do.

**Every vector names its home.** A registered profile may be published by another home — its
evaluator owner's, beside that implementation (§8.5) — and `profileHomes` names each such profile and
where it is published. A vector whose `home` is that profile is the profile's own evidence (its
tokens, its profile-only kinds, its rules) and is published with its document; a vector whose `home`
is `core` is this specification's, even when it is written in a profile's vocabulary or demonstrates
a profile's facet declaration, because what it tests is a shape, an encoding, a core refusal or a §12
family rule. A family is homed whole. A facet vector whose profile is published elsewhere is checked
here for everything its own content decides; whether that profile's declaration honours what it
demonstrates is certified where the declaration is published.

**Counts are not written here.** `manifest.json` is the enumeration; a number in prose drifts from
the directory beside it, and the manifest cannot.

## Reading a fixture

**A fixture file's bytes are the document.** No trailing newline, no framing, no wrapper — so the
`sha256` the manifest records is a digest of the file itself, with no convention to interpret first.
The documents are canonical per §4: minified, no BOM, members in **declaration order** (never
sorted), absent optionals **omitted** (never `null`), booleans as the strings `"true"` / `"false"`,
numbers as signed 32-bit integers.

**Every fixture is a whole document** — a whole composition, or in the `module-*` families a whole
module document — because the root of a composition is always an `appRoot` (§3.3), the root of a
module document always a `moduleRoot` (§M3.3), and there is no bare-node form on the wire. A `node/` vector is therefore a *minimal
composition isolating one node kind*, not a naked node — a corpus of naked nodes would certify
something no implementation can actually exchange.

`manifest.json` and this README are the exceptions: they are hand-formatted for humans,
LF-terminated, and are not themselves specified wire shapes.

## Certifying

**This section states the obligations. The order to discharge them in, the commands, and a report to
put the result in are [`../certification/RUNBOOK.md`](../certification/RUNBOOK.md),
[`../certification/TEMPLATE.md`](../certification/TEMPLATE.md) and
[`../certification/WORKED_EXAMPLE.md`](../certification/WORKED_EXAMPLE.md)** — a procedure rather than
a specification, which is why it lives beside this corpus rather than inside it. Where the two
disagree, this one is right.

1. **Pick a profile** — `core` or an evaluator profile — and read the families `manifest.json` maps
   it to; a vocabulary profile published elsewhere (§8.5) scopes its own families where it is
   published. A conformance claim without a profile is unfalsifiable, and an evaluator profile's
   claim additionally names the profile version.

2. **For every vector in those families, do what its `kind` says:**

   | Kind | What certifying means |
   |---|---|
   | `round-trip` | Decode, re-encode, produce **byte-identical** output. Not equivalent — identical. |
   | `hash` | Run the scenario, and reproduce the derived outcome the document records — the post-replay projection's digest, or the fold's — by recomputing it from the scenario's own content. |
   | `reject` | Your reader must refuse it, **for the class the manifest names**. A refusal for another reason is not a pass: it lets a reader certify by being broken in a convenient way. |
   | `accept` | Your reader must **not** refuse it, and must interpret it as the manifest's `interpretation` states. These are the forward-compatibility vectors; an implementation that refuses one will break on the next additive change, in the field rather than here. |

3. **Honour a reject vector's `detect`.** `codec` means a reader owes the refusal on decode.
   `profile` means it is a profile rule (§9.2, §P4) — a `core` implementation must **not** refuse
   those documents, because it has no basis for the check, and refusing them would be claiming a
   profile it has not implemented. `runtime` means only running the scenario answers it (§9.4), and
   it is owed by whoever claims the facet value the class belongs to and by nobody else.

   **A facet claim is a separate claim** (§11.2). Claiming a profile says nothing about runtime
   behaviour; an implementation that also claims facet values names them from that profile's
   declaration, runs the vectors demonstrating exactly those, and reports the values by name. A
   value the profile does not declare is not available to claim, and a value it declares that no
   vector demonstrates is refused as `facet-undemonstrated` before anyone gets to believe it.

4. **Assert that the number of vectors you executed equals the number the manifest enumerates for
   your scope**, and **prove at least once that a mutated document makes you go red.** A conformance
   suite is exactly the kind of code that passes by doing nothing: a green run that exercised nothing
   is indistinguishable from a green run that exercised everything.

5. **Report the profile and the corpus revision.** The manifest is the corpus's own enumeration, so a
   digest over it moves whenever anything in the corpus moves — which makes it the cheapest thing to
   pin against.

## The two emitters

Round-trip vectors are minted by a conformant implementation and **independently reproduced** by
`emit.mjs`, which is written against the normative text alone, in a different language and runtime,
from **unsorted and undecorated** input models — members in whatever order was convenient to type,
optionals spelled `null`. An input model that already looked like the output would triangulate
nothing.

One emitter cannot distinguish the format from its own accidents: whatever it happens to do becomes
"the format" by default, and the corpus then records the accident as though it were the rule. So a
disagreement between the two is **a defect in the specification by definition** — either a rule is
missing, or a rule that is stated is not the rule being followed. Do not "fix" it in either emitter
before asking what the text left open.

Reject and accept vectors in the **document** families are deliberately **not** reproduced.
Reproducing the bytes of a document a reader must refuse demonstrates nothing about the refusal; and
an accept vector is precisely *not* what a writer produces, which is the whole of what it tests.

**Facet vectors are reproduced, including the reject ones**, and the difference is worth stating. A
facet reject vector is not a malformed document — it is a well-formed scenario whose required outcome
is a refusal, so its bytes are exactly what a writer produces. Their **derived** members are
triangulated the same way: `emit.mjs` computes the projection digest, the effect ledger and the fold
digest from the scenario, and `check-facets.mjs` recomputes all three from its own reading of §12,
with its own §4 encoder written beside the emitter's rather than shared with it. Two encoders and two
readings of one rule — a checker that imported the emitter's encoder could only confirm the emitter
agrees with itself.

## Regenerating

```powershell
pwsh ../run.ps1 -Write   # rewrite round-trip vectors and refresh derived digests
pwsh ../run.ps1          # verify — recomputes everything independently
```

Never hand-edit a fixture. A fixture's bytes *are* the document and the manifest records a digest of
the file; editing one by hand and updating its digest to match produces a corpus that is internally
consistent and no longer describes what any emitter emits.
