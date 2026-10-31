# Evaluator profile — `local-first-host`

A profile of the app-composition wire specification
([`APP_COMPOSITION_WIRE.md`](APP_COMPOSITION_WIRE.md)). Sections §P0–§P9 are **normative** within this
profile.

Registered per §8 of the core specification. It changes nothing about the document, the canonical
encoding or the core refusals, and §2.3 of the core forbids it from trying.

## §P0. The profile's subject

`local-first-host` is the profile of an evaluator that reduces a composition to an application whose
evaluator runs **on the writer's own device**: the application remains usable while that device can
reach nothing else, authorship accumulates in **that writer's own lane** meanwhile, and reconnecting
is a **fold** of the lanes rather than a synchronisation of state.

The subject is stated as a **role**, not as a product and not as a runtime. No device class, sync
service, replication library or storage engine is named here, and naming one would be a category
error: what makes an evaluator a member of this family is that a writer's operations are ordered
without consulting anybody else and reconciled afterwards by a rule every holder computes identically
— which is a property of the evaluator's design, not of the transport it happens to reconnect over.

**This profile is a PLACEMENT, not a dialect** (core §8.6). It registers no token, no node kind and
no composition rule, and composes with the vocabulary profile a composition is written for (§P2–§P7).
A composition written for that vocabulary profile is a composition written for this profile, byte for
byte, and that is deliberate: where an application runs is not something a composition should have to
say.

**What separates it from the two evaluator profiles registered before it is one axis.** Both of them declare
`singleWriter` on the convergence axis — `server-app-host` because it is handed a composition value
and folds nothing, `durable-session-host` because a session admits one writer by construction. Neither
ground survives here: a device that must be usable while partitioned cannot also be the only writer,
because the other devices are not stopped, they are merely unreachable. So this family folds, and
§P9 is what it owes for saying so.

## §P1. Version and scope

| | |
|---|---|
| Profile identifier | `local-first-host` |
| Profile version | 1.1 |
| Profile kind | placement (core §8.6) |
| Core version | 1 |
| Registry, as data | [`profiles/local-first-host/registry.json`](profiles/local-first-host/registry.json) |
| Conformance families | Every `core`-scope family, plus `profile-placement`, plus the conformance families of the vocabulary profile it composes with (core §8.6) |
| Facet families (§11.2) | `kill-and-replay`, `partition-and-fold` |

1.0 → 1.1 replaced this profile's adoption of `server-app-host`'s §P2–§P7 by normative reference with
the core's composition rule (§P2–§P7 below, core §8.6) and added `vocabulary-unresolved`. No facet
value, nothing in §P9, and §P8 did not move.

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
| `delivery` | `atLeastOnce` | `atMostOnce`, `exactlyOnceEffective` |
| `idempotency` | `idempotent` | `idempotentWithStore`, `nonIdempotent` |
| `restart` | `retriedAfterRestart` | `lostOnRestart`, `survivesRestart` |
| `convergence` | `convergentFold` | `singleWriter`, `divergentMerge` |
| `attestation` | *(none — see below)* | all |

**`convergentFold`, and it is the whole reason this profile exists.** Divergent lanes fold to one
composition every holder computes identically, and interference halts rather than being resolved
silently — §11.1 states the value as both of those and this profile claims both. The demonstration is
`partition-and-fold`: `local-first-offline-lanes` folds, `local-first-reconnect-order-immaterial`
carries the same lanes in the other arrival order and folds to the same digest, and
`local-first-reject-conflicting-write` halts with `fold-conflict`. The third is not a formality — a
holder that folds correctly and quietly resolves interference by taking the later stamp reproduces the
first two byte for byte, and §12.2 requires both halves for exactly that reason.

**`atLeastOnce`, and the two values it is not.** An operation lives in its writer's lane before it is
presented to anybody, so it is never dropped: a device that reconnects, is interrupted, and reconnects
again presents it a second time, which is what at-least-once delivery means when it is stated as an
outcome. `atMostOnce` is therefore not honoured — an implementation of this family that could lose an
operation would be one whose lane is not the record. `exactlyOnceEffective` is not honoured either,
and the ground is the mechanism rather than the outcome: that value requires the repeat to be
suppressed *because something remembered the first attempt*, and nothing here remembers anything.
Claiming it would credit this family with a store it does not compose, and would fail exactly where
the difference matters — on an operation that is genuinely not repeatable.

**`idempotent`, for a reason that belongs to the fold rather than to the operation.** An operation is
identified by its lane and its stamp, and the fold is a function of the ops a holder has, so
presenting one twice is presenting the same op: the second presentation has no second effect, and
nothing had to remember the first. That is `idempotent` and not `idempotentWithStore` — the
distinction §11.1 draws, held to. `nonIdempotent` is not honoured for the same reason, stated in the
other direction: an implementation of this family in which re-presenting an operation took effect
twice would not be folding, it would be appending.

**`retriedAfterRestart`, and the ceiling is the corpus's rather than the family's.** An operation is
written to the writer's lane before it is acted on — that is what makes the placement local-first
rather than merely offline-tolerant — so a restart finds the work still owed and re-attempts it.
`lostOnRestart` is not honoured: there is no in-flight work outside a lane for a restart to drop.
`survivesRestart` — work *continuing* across the restart rather than being re-attempted — is declined
under §11.5, because no registered family states a discriminator for it: §12.1's replay rule restarts
a step or drops it, and a third journaling state would be needed to express continuation. Declining a
value nothing can exhibit is the rule working, not a gap.

**`divergentMerge` is not honoured, and this profile's ground is not the corpus's.** §11.5 forbids
declaring it — the corpus states no discriminator for it — so no profile could declare it today. But
this one would decline it with the discriminator in hand: a merge whose result depends on the order
the lanes arrived in is precisely what the second half of `convergentFold` refuses, so the two values
are not neighbours on a scale, they are opposites. The two rules pointing the same way is a good sign
rather than a redundancy; the ground that would survive the other one being lifted is this paragraph.

**`attestation` is declared empty with a reason, per §11.4.** An evaluator of this family runs on a
device its operator controls and produces no evidence of what it is executing — and the honest reading
is stronger than that: a measured environment is precisely what a device that must work while
unreachable cannot depend on. Note the empty set cannot be filled by declaring `unattested`, which
§11.5 records as having no discriminator: an absence is not something a vector can exhibit. A measured
host is a different placement, and would register a profile of its own.

## §P9. The fold obligation

This section states what an implementation of this profile owes at runtime when it reconnects. It is
normative here and adds nothing to §2.1 or §2.2 — a facet declaration is not a decode obligation
(§11.2), and this is that declaration's content written out.

**§P9.1 — One lane per writer.** Every operation an implementation admits is recorded in exactly one
lane, and that lane belongs to the writer that authored it. A lane is the unit of divergence: two
writers never append to one lane, and one writer's operations never span two.

**§P9.2 — Reconnecting is the fold of §12.2, and nothing else.** The composition a holder computes on
reconnect is the base composition with every operation from every lane it holds applied in the total
order §12.2 states — ascending stamp, ties broken by lane id compared by ordinal code point. An
implementation MUST NOT order by arrival, by receipt time, by lane precedence, or by any order it
computes for itself. The stamp is a logical clock reading and never a wall-clock time; two holders
that agreed on the ops and disagreed on the order would each hold a composition nobody wrote, with no
symptom.

**§P9.3 — Interference halts, and the halt is typed.** Where two operations from different lanes
interfere in the sense §12.2 gives — writing the same member of the same node to different values, or
appending the same node identity — the fold **halts with `fold-conflict` and produces no composition
at all**. An implementation MUST NOT resolve interference by the total order, by recency, by lane
precedence, by node content, or by any other rule; MUST NOT present a partially folded composition;
and MUST NOT proceed with the interfering operations omitted. Per §9, the refusal **names its class**
and the operations that interfered: a holder that stops without saying which class has refused for a
reason nobody can act on, and a holder that resolves silently has produced a composition neither
writer authored, with a digest that reproduces perfectly on every machine.

**§P9.4 — What a completed fold does NOT claim.** It says the lanes the holder **has** fold to this
composition. It does not say every lane has arrived: a partition is not observable from inside, so an
implementation of this family cannot report that authorship is complete and MUST NOT present a folded
composition as though it were. Folding again when a further lane arrives is the ordinary case, and it
is why the order is computed from the stamps rather than accumulated as lanes turn up.

**§P9.5 — What this profile does not specify.** How lanes reach each other, how a stamp is advanced,
how a writer is identified, how a conflict is presented to a person, and what a person may do about
one. Those are an implementation's, and a profile that specified them would be describing a product.
What is specified here is the part two implementations must agree on to hold the same composition.
