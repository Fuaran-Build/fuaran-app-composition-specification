# Conformance ladder — the stacked profiles of this specification family

**Ladder version 1.** A ladder over **app-composition wire format version 1**
([`APP_COMPOSITION_WIRE.md`](APP_COMPOSITION_WIRE.md)). Sections §L1–§L8 are **normative**. Appendix
L-A is not.

This document answers one question that the core specification deliberately does not: **what does it
mean to say a host supports the whole stack?** The core specifies one format and partitions the
obligations inside it (§2). A composition, though, routinely reaches other specifications — a view
contract a module was authored against, a seam another deployment is reached across, a logic
vocabulary a module boundary carries — and "supports all of that" is exactly the sentence everybody
writes and nobody can check.

So the ladder is a **named, registered set of rungs**, each naming which further specifications an
implementation claims, and a rule for how a claim to one rung entails the rungs beneath it. It names
those specifications and it **restates none of them** (§L3.4).

## §L0. What this is not — four notions, and they are different

A reader arriving from §2 or §11 will find four things called a profile in this family. They
partition four different sets and none of them is a refinement of another:

| Notion | Where | What it partitions |
|---|---|---|
| **Conformance profile** | core §2, §8 | The obligations **inside this format**: which node kinds, token vocabularies and composition rules an implementation of *this document* owes. `core` and `server-app-host` are its two members. |
| **Facet profile** | core §11.2, §12; `facetProfiles` in the manifest | Which **runtime demonstrations** a conformance profile's declared guarantees are certified against. Deliberately a separate partition, because a facet declaration is not part of anybody's decode obligations. |
| **Document profile** | `MODULE_AUTHORING_WIRE.md` §M9; `documentProfiles` in the manifest | How an implementation reads and writes **another document of this specification**, the module document a composition cites by address. `module-authoring` is its one member. It registers no placement, so it is not a conformance profile, and it cites no other specification, so it is not a rung (§L3.1). |
| **Stack rung** | this document | Which **other specifications in this family** an implementation claims, alongside this one. |

The distinction that matters most: a conformance profile is a claim about **this** document, and a
stack rung is a claim about **several**. An implementation can be a complete `core` reader and claim
no rung above the base — that is the ordinary case, and it is what a store, a differ or a headless
evaluator is. Conflating the two would make every reader of a composition responsible for every
specification any composition might cite, which is precisely the coupling the profile boundary was
drawn to avoid.

---

## §L1. Scope

### §L1.1 What this specifies

1. The **rung vocabulary** (§L2) — the registered rung identifiers and their prerequisites.
2. Each rung's **obligations** (§L3) — the specification it cites, by name and version, and the
   corpus families a claim to it must run.
3. The **composition rule** (§L4) — claiming a rung claims everything beneath it.
4. The **claim facet** (§L5) — how a *composition* declares which rungs it targets, and the
   consistency classes a checker reports.
5. **Reserved rungs** (§L6) — a rung registered by name with an empty obligation set, so the missing
   middle enumerates rather than renumbers.
6. The **certification join point** (§L7) — where a per-rung verdict attaches in a composed
   verification report.

### §L1.2 What this does not specify

- **Anything a cited specification says.** A rung names a document and a revision. It does not
  summarise, paraphrase, restate or subset it. See §L3.4, which makes that a rule rather than a
  habit.
- **What a host does with a rung it has certified.** Certification is a claim about obligations met,
  not a licence to behave in any particular way.
- **Who certifies.** This document specifies the shape of a claim and the evidence it rests on. It
  names no implementation, registry, authority or process — the core's convention on naming applies
  here unchanged, and the deliberate absence of a certified-implementations registry applies too.

---

## §L2. The rungs

| Rung | Prerequisite | Status | What claiming it adds |
|---|---|---|---|
| `composition` | — | Registered | This format, at a named conformance profile (core §2). The **floor**, and the whole of what a headless implementation owes. |
| `composition+ui` | `composition` | Registered | The cited **view contract** a citation-bearing view binding names (core §5.4, §6). |
| `composition+logic` | `composition` | **Reserved** | Nothing, in this revision. See §L6. |
| `composition+federation` | `composition` | Registered | The cited **federation seam** across which a composition reaches an independently-operated deployment. |

The rung identifiers are wire values (§L5) and are registered as spelled. Renaming one is a breaking
change to every claim already written, for no gain — the same argument core §P0 makes about tokens.

**The shape is a tree rooted at the floor, not a single chain**, and the difference is load-bearing.
The three rungs above the floor are independent: a host that renders typed views and federates with
nobody is not a lesser version of one that federates and renders nothing. A total order would force
one of them to be "further along" than the other, which is a claim about the world that is not true,
and it would make the honest posture of most hosts unsayable.

**Every registered rung's obligations are stated in §L3 and enumerated as data in
`wire-fixtures/manifest.json` under `stackRungs`.** The two are one artefact in two renderings, and
the gate compares them (§L8).

---

## §L3. Obligations, per rung

### §L3.1 `composition` — the floor

The floor cites `app-composition-wire@1` — this specification, at its own format version. It is the
one rung whose citation names a document in this repository, and it is spelled in the same form the
other rungs' citations are so that a reader comparing them is comparing like with like.

An implementation at this rung:

- claims a **conformance profile** of this format (core §2) and names it — `core` or a registered
  evaluator profile;
- runs **every corpus family this specification's manifest scopes to that profile**, which the
  manifest's own `profiles` partition decides;
- meets the two obligations the shared conventions place on a harness rather than on an emitter: the
  count it executed equals the count the manifest enumerates for its scope, and a mutated document
  has been shown at least once to make it go red.

An implementation at this rung MAY also claim a **document profile** (§L0), by name and version:
`module-authoring` at the version `MODULE_AUTHORING_WIRE.md` states. It then runs every corpus family
the manifest's `documentProfiles` partition scopes to that profile, under the same two harness
obligations. The claim sits **at the floor and is not a rung**, because the document it names is part
of this specification: it is a second coordinate of the floor claim, as the conformance profile is the
first, and a report carrying per-rung verdicts (§L7) records it in the floor's entry beside the
conformance profile. A floor claim that names no document profile owes nothing for one. The profile
is stated as data in `profiles/module-authoring/registry.json`, not in `stackRungs`, so naming it here
moves no rung and no ladder version.

It owes nothing else. **A headless implementation — one that reads, stores, diffs, transports or
reduces a composition without rendering anything, federating with anybody, or carrying a logic
vocabulary — is fully and honestly conformant here**, and this sentence is the reason the ladder
exists. Before it, "conformant" and "supports everything" were the same word, so a host with no view
tier could only describe itself by what it lacked.

### §L3.2 `composition+ui`

Additionally: conformance to the view contract cited as `fuaran-ui-specification@0.2.0`, at a profile
that specification names, and every corpus family **its own** manifest scopes to that profile.

This rung is what a citation-bearing view binding implies. A composition whose `moduleRef` carries a
`view` token the evaluator profile marks citation-bearing (core §5.4, §P2.4) names a revision of that
contract in its `viewSpec`, and a host that reduces such a composition without meeting the cited
contract is reducing it into something the composition did not describe.

**The citation is the whole of the coupling.** This document does not say what that contract
requires, which of its families exist, or what its profiles are called — see §L3.4.

### §L3.3 `composition+federation`

Additionally: conformance to the federation seam cited as `federation-seam-wire@1`, at a profile that
specification names, and every corpus family **its own** manifest scopes to that profile.

This rung is what a composition reaching another deployment implies — an evaluator profile registers
the token by which a composition says so (`server-app-host` registers a capability layer for it,
§P2.2), and a host that reduces such a composition while meeting no seam contract produces an
application that cannot talk to anything.

**Note the two citations are spelled differently, and neither spelling is this document's choice.**
`fuaran-ui-specification` is the identifier compositions *already carry* in their citations, so it is
inherited rather than chosen; `federation-seam-wire` is the identifier that specification's own
corpus declares for itself. Core §6.1 states that this family maintains no registry of cited
specifications, and a ladder that normalised two identifiers into a house style would be doing
exactly that, badly.

### §L3.4 A rung cites; it never incorporates

**A rung's obligation names a specification and a revision, and states nothing that specification
states.** No rung entry may enumerate a cited specification's families, node kinds, refusal classes,
profiles or version history; a claim to a rung is discharged by consulting the cited document at the
cited revision, and by nothing written here.

This is not fastidiousness. A restatement is a second copy of somebody else's contract, on a
different release schedule, in a document that has no way to notice when it falls behind — so the
first time the two disagree, an implementation that read this one is non-conformant while passing
everything this document could check. The rule is enforced structurally as well as stated: the
manifest records a non-floor rung's corpus families as **external**, so the only place a family list
for a cited specification can live is that specification's own manifest.

The floor is the single exception, and only because the specification it cites is this one.

---

## §L4. The composition rule

**Claiming a rung claims every rung beneath it.** "Beneath" is the transitive closure of the
prerequisite relation in §L2's second column: `composition+ui` is above `composition`, so a claim to
the former is a claim to the latter, and an implementation making it owes both obligation sets in
full.

A **claim** is therefore a SET of rungs, and its **effective claim** is that set closed under the
prerequisite relation. Two consequences worth stating because they are what the rule buys:

- A claim naming only `composition+ui` and a claim naming `composition, composition+ui` are the same
  claim. The closure is computed, not written, so a claim cannot be wrong about its own floor.
- A claim naming **every registered rung** is the strongest available claim in this family, and it is
  a claim about obligations met rather than a superlative. There is no rung above it, and this
  document registers no notion of "certified for everything" that would outrun what the ladder
  enumerates — which is what stops the sentence from meaning more next year than it does today.

**Claiming a rung is never implied by anything except the prerequisite relation.** In particular,
carrying a construct that *requires* a rung does not claim it: a composition binding a citation-
bearing view has an obligation, not a claim, and §L5 is where the two are compared.

---

## §L5. The claim facet — how a composition declares its target rungs

A rung is claimed by an implementation. A **composition** declares which rungs it *targets*: the
rungs a host must have certified in order to reduce it as written. The two are different subjects
sharing one vocabulary, and keeping them in one vocabulary is what lets them be compared at all.

### §L5.1 The wire form

A composition declares its target rungs through the extension mechanism (core §7), under the
declaration core §7.4 registers for the pair `fuaran.stack/rung-claim`. It is a node like any other
`extensionRef`: a leaf, carrying only the fields the declaration states, refused for anything else,
and carried opaquely by a reader that holds no declaration for it.

The declaration states one required field:

| Field | Value |
|---|---|
| `rungs` | The claimed rung identifiers, **comma-separated, in the order §L2's table registers them, with no whitespace and no repeats**. |

The spelling is fixed rather than tolerant because the bytes are the contract (core §4): two
orderings of one claim would be two documents with two content addresses making one statement, and a
reader that re-sorted them on the way in would be the second authority on what the composition says.
An empty value is a refusal, not "claims nothing" — a composition that targets no rung carries no
claim node at all, and silence is a posture the mechanism already has.

### §L5.2 Absence is a posture

**A composition carrying no claim node makes no claim, and that is legitimate.** It is the state of
every composition written before this ladder existed, and of every composition whose author has not
decided which hosts it is for. Nothing in this document makes the claim mandatory, and a checker that
treated absence as a claim to the floor would be manufacturing a statement nobody wrote — the same
error core §5.4 forbids about an absent `surfaceKind`.

### §L5.3 Consistency, and the three classes

Where a claim IS present, it can disagree with the composition around it. These are the classes a
checker reports; they are **findings about a composition**, not refusals a reader owes, so they are
not core §9 classes and no reader is obliged to refuse a document exhibiting one.

| Class | Condition | Grade |
|---|---|---|
| `rung-unclaimed` | The composition carries a construct whose rung the claim omits — a citation-bearing view binding without `composition+ui`, a federation capability without `composition+federation`. | **Refusal** |
| `rung-unexercised` | The claim names a rung nothing in the composition exercises. | **Advisory** |
| `rung-reserved-claimed` | The claim names a rung §L6 reserves. | **Refusal** |

**The asymmetry between the first two is the point.** A composition that needs a rung and does not
claim it will be reduced onto a host that was never asked for the capability, and the failure arrives
at build or run time as something else entirely — so it is refused. A composition that claims a rung
it does not currently exercise is *over-specified*, which costs a narrower set of eligible hosts and
nothing else; refusing it would break a composition whose author deliberately targeted a stronger
host than today's contents require, which is an ordinary and reasonable thing to do.

The third is core §11.5's rule one level up: a reserved rung obliges nothing, so a claim to it is
unfalsifiable, and an unfalsifiable claim is refused rather than believed.

---

## §L6. Reserved rungs

Registered here in the sense core §7.4 and §12.3 give the word: a rung whose **name** is fixed now
and whose **obligation set is empty**, carried so that filling it enumerates rather than renumbers.

| Rung | What it will carry |
|---|---|
| `composition+logic` | The cited logic vocabulary a module boundary carries — the subject of the extension pair core §7.4 reserves. Reserved rather than specified, because the vocabulary it would cite has not stabilised, and a rung citing a revision that does not exist yet is a claim nothing can discharge. |

Three rules govern a reserved rung, and each is checkable:

1. **A reserved rung's obligation set is empty**, and conversely **a rung with an empty obligation
   set MUST be reserved.** An unreserved rung obliging nothing would be a claim anybody could make
   for free, which is exactly the shape core §11.3 refuses one layer down.
2. **A reserved rung MUST NOT be claimed** — by an implementation, or by a composition's claim facet
   (§L5.3, `rung-reserved-claimed`).
3. **Filling a reservation is additive.** The rung's identifier does not change, no other rung is
   renumbered, and every composition already carrying the name carries it forward unchanged.

An empty reservation cannot be wrong about a vocabulary that does not exist yet, which is the whole
argument for making one.

---

## §L7. The certification join point

A rung is certified by **running the obligations §L3 states and recording the result**. This section
registers where that result attaches; it specifies no verifier, and nothing here is a requirement on
one that does not report per-rung verdicts at all.

**The join point.** A composed verification report that rolls per-family results into an outcome for
a whole composition attaches, beside those families, a **rung section**: one entry per rung in the
composition's effective claim (§L4), each carrying

- the **rung identifier**;
- the **cited specification and revision** from §L3, verbatim — a verdict that does not say which
  revision was met is a verdict about nothing;
- the **corpus families run** for that rung, and the count, so the harness obligation §L3.1 states is
  visible in the record rather than asserted about it;
- a **verdict**.

**The roll-up rule, which is the part worth registering.** A rung whose obligations were **not run**
is reported as the middle value of a three-valued outcome — neither met nor refuted — and **never as
met**. A verifier that reported an unrun obligation as satisfied would turn the ladder into
decoration: every claim would verify, and the sentence worth the most would be the cheapest one to
produce. This is core §11.3's argument applied to a report rather than to a declaration.

**A composition's claim and a host's certification are joined here and nowhere else.** The claim says
which rungs a composition targets; the certification says which rungs a host has met; the join is
whether the second covers the first. Neither half implies the other, and a report that carried only
one of them would look complete while answering half the question.

---

## §L8. Versioning and forward coupling

### §L8.1 Additive

Additive, and does **not** move the ladder version:

- registering a rung, or reserving one by name;
- filling a reserved rung's obligation set;
- **advancing a cited revision**, where the rung's subject is unchanged.

An implementation at this ladder version encountering an additive change keeps its existing claims,
having gained a claim it could not previously make.

### §L8.2 Breaking

Breaking, and takes a new ladder version:

- renaming or removing a rung, or re-spelling a rung identifier;
- changing the prerequisite relation, which changes what an existing claim entails;
- changing the claim facet's wire form (§L5.1), which changes bytes a composition already carries.

### §L8.3 Three versions here too, and a fourth

The **ladder version** (this document), the **format version**, a **profile version** and each
**cited specification's revision** move independently, for exactly the reason core §10.3 gives about
the first three. A rung advancing its cited revision is not a ladder change and must not be reported
as one; a ladder that moved every time a cited document did would carry no information at all.

### §L8.4 Forward coupling

A change to a rung, its prerequisite, its obligations, its status or the claim facet's wire form
updates **every one** of the following, in the same change-set:

1. this document;
2. `stackRungs`, `reservedRungs` and `rungClaimClasses` in `wire-fixtures/manifest.json`;
3. the `fuaran.stack/rung-claim` declaration in core §7.4 and its rendering in the manifest, where
   the claim facet's wire form moved;
4. the vectors carrying a claim, and their digests;
5. **the codec and the checker of every implementation that certifies against this ladder.**

The gate is `pwsh ./run.ps1`, which compares this document's tables against the manifest's rung data
and fails when they disagree — two renderings of one artefact, held together by something other than
care.

---

## Appendix L-A — Why a ladder rather than more profiles *(non-normative)*

The obvious alternative was to register `composition+ui` as a conformance profile under core §8, next
to `server-app-host`. It was rejected for a reason that is easy to miss and expensive to discover
later.

A conformance profile of this format registers **token vocabularies, node kinds and composition
rules** — things stated *in this document* and checkable against *this corpus*. A rung registers
none of those. Its whole content is a pointer to another document, and the obligations it adds are
enumerated and certified somewhere this repository does not control. Filing it as a profile would
have put a claim about another specification inside a partition whose members are all claims about
this one, and the first consequence would have been a `profiles` block in the manifest whose entries
mean two different things depending on which row you read.

The second consequence would have been worse. Core §2.2 says an evaluator profile carries every
`core` obligation, so the profile partition is already cumulative in one direction. Adding rungs to
it would have made every implementation of an evaluator profile owe the cited specifications too —
turning a registration into a breaking change for everyone already conformant, which core §10.1 is
explicit about not doing. `facetProfiles` is a separate partition in the manifest for exactly this
reason, and this is the same lesson arriving a second time from a different direction.

What remains true is that the two partitions *interact*: a rung's floor obligation names a
conformance profile (§L3.1), so a claim is a pair — which rungs, and at which profile. Stating that
as two coordinates is honest about a subject that has two, where one enum with the cross-product in
it would have been a list that grows by multiplication and reads as arbitrary.

---

## Licence

Apache-2.0 — see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE). Copyright 2026 Diametrical Ltd.
