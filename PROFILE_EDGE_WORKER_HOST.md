# Evaluator profile — `edge-worker-host`

A profile of the app-composition wire specification
([`APP_COMPOSITION_WIRE.md`](APP_COMPOSITION_WIRE.md)). Sections §P0–§P8 are **normative** within
this profile.

Registered per §8 of the core specification. It changes nothing about the document, the canonical
encoding or the core refusals, and §2.3 of the core forbids it from trying.

## §P0. The profile's subject

`edge-worker-host` is the profile of an evaluator that reduces a composition to an application whose
sessions run **at a named point of presence, close to whoever is using them**, on a runtime that may
evict a session between requests and re-activate it later. Two facts follow from that shape and
neither is optional: a session's state is held by **one activation at a time**, and its operations are
journaled to a **durable store the platform provides** before they are acted on.

The subject is stated as a **role**, not as a product. No worker runtime, edge network, storage
service or vendor is named here, and naming one would be a category error twice over — what makes an
evaluator a member of this family is that its sessions can be evicted and must come back, and that
where they run is a fact somebody declared rather than a fact somebody hopes.

**This profile is a PLACEMENT, not a dialect** (core §8.6). It registers no token, no node kind and
no composition rule, and composes with the vocabulary profile a composition is written for (§P2–§P7).
A composition written for that vocabulary profile is a composition written for this profile, byte for
byte, and that is deliberate: **where** a session's data is processed is not something a composition should
have to say. It is something a *deployment* says, which is why the locality facet ranges over a
placement declaration and not over any member of §5.

## §P1. Version and scope

| | |
|---|---|
| Profile identifier | `edge-worker-host` |
| Profile version | 1.1 |
| Profile kind | placement (core §8.6) |
| Core version | 1 |
| Registry, as data | [`profiles/edge-worker-host/registry.json`](profiles/edge-worker-host/registry.json) |
| Conformance families | Every `core`-scope family, plus `profile-placement`, plus the conformance families of the vocabulary profile it composes with (core §8.6) |
| Facet families (§11.2) | `kill-and-replay`, `partition-and-fold`, `placement-locality` |

1.0 → 1.1 replaced this profile's adoption of `server-app-host`'s §P2–§P7 by normative reference with
the core's composition rule (§P2–§P7 below, core §8.6) and added `vocabulary-unresolved`. No facet
value, the locality axis included, and §P8 did not move.

## §P2–§P7. Vocabulary, node kinds, rules and refusals — by composition

This profile is a placement (core §8.6) and registers none of them. It composes with **exactly one
vocabulary profile, the one the composition's root belongs to**: an implementation reads a composition
with that profile's token vocabularies, profile-only node kinds, composition rules and refusal
classes, unchanged — a token admissible there is admissible here, a token inadmissible there is
`token-unregistered` here, and a composition refused there is refused here under the same class. A
composition whose root belongs to no registered vocabulary profile is refused as
`vocabulary-unresolved` (core §9.2). `server-app-host` is the first registered vocabulary profile; it
is named here as an example, not as a dependency.

## §P8. Runtime facets

Per §11.2 of the core, this declares what an implementation of this profile **may claim** — not what
every implementation of it does.

| Axis | Honoured | Not honoured |
|---|---|---|
| `delivery` | `atMostOnce`, `atLeastOnce` | `exactlyOnceEffective` |
| `idempotency` | `idempotent`, `nonIdempotent` | `idempotentWithStore` |
| `restart` | `lostOnRestart`, `retriedAfterRestart` | `survivesRestart` |
| `convergence` | `singleWriter` | `convergentFold`, `divergentMerge` |
| `attestation` | *(none — see below)* | all |
| `locality` | `regionSealed`, `regionRouted` | `unpinned` |

**`locality` is what earns this profile a registration of its own, and it is the only axis on which it
says something no other registered profile can.** Everything else here, one of the three profiles
before it already does: `durable-session-host` journals, `local-first-host` re-enters interrupted
work, both admit one writer. What none of them can say is **where**, and where is the question a
deployment at a named point of presence exists to answer. An evaluator of this family runs a session
at a site the placement assigns a region, so a flow that would leave that region is **refused rather
than performed** — which is what makes "these sessions never leave here" a certifiable claim instead
of an operational promise.

Both values are honoured because they are different postures rather than degrees.
`placement-locality/edge-sealed-in-region` demonstrates the first, and
`placement-locality/edge-routed-across-boundary` the second; a single reject vector,
`placement-locality/edge-reject-undeclared-egress`, is the paired control for **both**, being the
routed vector with its route removed and the sealed vector with one site moved across a border at
once. §12.6 states why each pair is required: an evaluator that never resolves a region answers
"sealed" and is right every time it is asked, and one that admits every crossing reproduces the routed
vector perfectly.

`unpinned` is declined, and §11.5 records why it could not be claimed even by a placement that meant
it — an absence is not something a vector of placement declarations can exhibit.

**The two values this profile stops short of, and whose guarantee they would be.** `server-app-host`
declines `exactlyOnceEffective` and `idempotentWithStore` on the ground that its family composes no
store to remember a replay with; `durable-session-host` claims both because the session's own
journaled state **is** that store. This family sits between the two, and the honest answer is that it
**borrows** one: the durable store here is the platform's, and this profile does not specify its
dedupe semantics, so a claim resting on it would be a claim about somebody else's product. What
remains is real and is declared: a step whose intent reaches the store before it is attempted is
re-entered by the next activation (`atLeastOnce`, `retriedAfterRestart`), and one whose intent never
got there is gone (`atMostOnce`, `lostOnRestart`). `idempotent` is claimed where repeating an
operation simply has no second effect, which is a property of the operation rather than of anyone's
store — `kill-and-replay/edge-repeatable-read` carries it, beside
`kill-and-replay/edge-journaled-retry-duplicate`, because both read as *safe to repeat* and only
`dedupe` says whose safety it is.

**`survivesRestart` is declined for two independent reasons, and the two agreeing is a good sign
rather than a redundancy.** An evicted activation's journaled work is **re-attempted** by the next
one, not continued across the eviction — so this family does not exhibit the value; and §11.5 forbids
declaring it in any case, because no registered family states a discriminator for it.

**`singleWriter`, and this profile reaches it a third way.** `server-app-host` folds nothing because
it is handed a composition *value*; `durable-session-host` because a session admits one writer by
construction. Here the ground is the failure a distributed runtime actually has: it can start a second
copy of a session it believed gone. The answer is an **activation the store hands out** — monotonic,
presented by every write — so a write from a superseded activation is **refused** rather than
interleaved. `partition-and-fold/edge-reject-concurrent-authorship` demonstrates it on deliberately
**non-interfering** lanes, because a holder refusing a *conflicting* pair might be refusing the
conflict rather than the concurrency.

**`attestation` is declared empty with a reason, per §11.4.** An evaluator of this family runs in an
ordinary worker process and produces no evidence of what it is executing. The empty set cannot be
filled by declaring `unattested`, which §11.5 records as having no discriminator. A measured edge host
is a different placement and would register a profile of its own — which is the sentence
`durable-session-host` writes here too, and it is not a copy: the two families are unmeasured for the
same reason, and paraphrasing it to look different would be pretending to a distinction.
