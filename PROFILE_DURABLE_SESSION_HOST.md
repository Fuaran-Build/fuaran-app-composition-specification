# Evaluator profile — `durable-session-host`

A profile of the app-composition wire specification
([`APP_COMPOSITION_WIRE.md`](APP_COMPOSITION_WIRE.md)). Sections §P0–§P8 are **normative** within
this profile.

Registered per §8 of the core specification. It changes nothing about the document, the canonical
encoding or the core refusals, and §2.3 of the core forbids it from trying.

## §P0. The profile's subject

`durable-session-host` is the profile of an evaluator that reduces a composition to a **server-hosted
application whose sessions are durable**: each session's tree and the ordered stream of operations
against it are held as journaled state, so a session survives the loss of the process that was
hosting it and resumes by replaying its own journal rather than by starting again.

The subject is stated as a **role**, not as a product, and not as a runtime. No cluster technology,
persistence backend or hosting framework is named here, and naming one would be a category error:
what makes an evaluator a member of this family is that a session's intent is written down before it
is acted on, which is a property of the evaluator's design and not of the library it happens to use.

**This profile is a PLACEMENT, not a dialect** (core §8.6). It registers no token, no node kind and
no composition rule, and composes with the vocabulary profile a composition is written for (§P2–§P7).
A composition written for that vocabulary profile is a composition written for this profile, byte for
byte, and that is deliberate: where a session runs is not something a composition should have to say.

## §P1. Version and scope

| | |
|---|---|
| Profile identifier | `durable-session-host` |
| Profile version | 1.1 |
| Profile kind | placement (core §8.6) |
| Core version | 1 |
| Registry, as data | [`profiles/durable-session-host/registry.json`](profiles/durable-session-host/registry.json) |
| Conformance families | Every `core`-scope family, plus `profile-placement`, plus the conformance families of the vocabulary profile it composes with (core §8.6) |
| Facet families (§11.2) | `kill-and-replay`, `partition-and-fold` |

1.0 → 1.1 replaced this profile's adoption of `server-app-host`'s §P2–§P7 by normative reference with
the core's composition rule (§P2–§P7 below, core §8.6) and added `vocabulary-unresolved`. No facet value
and §P8 did not move.

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
every implementation of it does. An evaluator of this family that composes no durable store for a
particular operation claims the weaker value for that operation, and the corpus carries the vectors
for both.

| Axis | Honoured | Not honoured |
|---|---|---|
| `delivery` | `atMostOnce`, `atLeastOnce`, `exactlyOnceEffective` | — |
| `idempotency` | `idempotent`, `idempotentWithStore`, `nonIdempotent` | — |
| `restart` | `lostOnRestart`, `retriedAfterRestart` | `survivesRestart` |
| `convergence` | `singleWriter` | `convergentFold`, `divergentMerge` |
| `attestation` | *(none — see below)* | all |

**What separates this profile from `server-app-host`, and it is exactly two values.** That profile
declines `exactlyOnceEffective` and `idempotentWithStore` on a stated ground: the store an
effective-exactly-once claim rests on is not composed by evaluators of its family, so nothing in the
composition can remember a replay. An evaluator of **this** family composes one by construction —
the session's own journaled state is that store — so the ground does not hold here and the two
values are available. They are demonstrated rather than asserted: `kill-and-replay/durable-store-deduped-once`
carries the mechanism (`dedupe: store`) in the vector, and `kill-and-replay/durable-repeatable-read`
sits beside it as the control, because both read as *entered twice, took effect once* and only the
mechanism tells them apart.

**`survivesRestart` is declined, and the reason is a property of the corpus rather than of the
family.** Work *continuing* across a restart — rather than being re-attempted after one — is the
value a durable placement would most like to claim. §11.5 forbids declaring it: no registered family
states a discriminator for it, because §12.1's replay rule restarts a step or drops it and a third
journaling state would be needed to express continuation. So the declaration above is a statement
about what is currently **demonstrable**, and a family that gained that discriminator is where this
profile would revisit it. Declining a value nothing can exhibit is the rule working, not a gap.

**`singleWriter`, for a different reason than `server-app-host` gives.** That profile folds nothing
because it is handed a composition *value*. This profile folds nothing because a session admits
exactly one writer by construction: the live session is the writer, and there is never a second one
to fold against. Divergent authorship streams are refused under
`concurrent-authorship-unsupported` rather than linearised silently, and
`partition-and-fold/durable-reject-concurrent-authorship` demonstrates it on deliberately
**non-interfering** lanes — a holder refusing a *conflicting* pair might be refusing the conflict
rather than the concurrency, and those are different claims.

**`attestation` is declared empty with a reason, per §11.4.** An evaluator of this family runs in an
ordinary process and produces no evidence of what it is executing. Note the empty set cannot be
filled by declaring `unattested`, which §11.5 records as having no discriminator: an absence is not
something a vector can exhibit. A measured host is a different placement, and would register a
profile of its own.
