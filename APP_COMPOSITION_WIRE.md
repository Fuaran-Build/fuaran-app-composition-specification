# App-composition wire specification

**Version 1.** Sections §1–§12 and Appendix A are **normative**. Appendix B is not.

A language-neutral wire format for an **application composition**: which host an application is
built on, which substrate seams it binds, which modules and data types it registers, which settings
and ports it reserves — carried as a tree of nodes that any party can read, write, diff and store,
independently of the toolchain that will eventually build the application.

The format has a **neutral core** and **evaluator profiles**. The core specifies the document, the
node shapes, the canonical encoding, the citation mechanism, the extension mechanism and the
refusals. A profile registers the *token vocabularies* those shapes range over, and states the
composition rules that hold for one family of evaluators. The split is the point: the shapes are
statable without naming any evaluator, and the values they range over usually are not.

## Shared conventions

This specification cites the conventions shared by the specifications in this family — how a
specification and its conformance corpus are written, as distinct from what any one of them
specifies. Those conventions are **binding here** except where a section below states an exception
in the form the conventions require. Two exceptions are stated, both in §4.1 and §4.2, and both are
about the relationship between this format's canonical encoding and RFC 8785.

The conventions this document leans on most often, named so a reader knows what is inherited rather
than invented here: the bytes are the contract and byte-stable round-trip is the conformance
property; the canonical encoding is stated exhaustively and never delegated to a library; the corpus
is the oracle and no implementation's behaviour is; `manifest.json` is the authoritative enumeration
and counts appear nowhere else; conformance here is **profile-scoped** (§2), so a claim naming no
profile is unfalsifiable; extension enumerates rather than renumbers (§7.4); and normative text names
no implementation, product, vendor or language.

---

## §1. Scope

### §1.1 What this specifies

1. A **composition document**: a rooted tree of nodes, each with an identity, a kind, kind-specific
   members and an ordered list of children.
2. The **core node kinds** — the shapes an application composition is made of, and the members each
   carries.
3. The **canonical encoding**: the byte-level rules that make two independent writers produce the
   same bytes from the same composition.
4. A **versioned citation** (§6): how a composition records which revision of another specification
   a part of it was authored against.
5. An **extension mechanism** (§7): how a namespaced, opaque hole is declared, carried and refused,
   so that a vocabulary this document does not yet have arrives as a registration rather than as a
   new version.
6. The **profile mechanism** (§8): how an evaluator's token vocabularies and composition rules are
   registered, and what a profile document must state.
7. The **refusal classes** (§9): what a conformant reader must turn away, and for what.
8. The **runtime facets** (§11): the vocabulary a profile uses to state what its evaluators guarantee
   at runtime, and the rule that a declared guarantee must be demonstrable.
9. The **conformance fixture families** (§12): how such a demonstration is registered, shaped and
   passed, and how a family that does not exist yet is reserved rather than renumbered.

### §1.2 What this does not specify

- **What an evaluator does with a composition.** Reducing a composition to a buildable artefact is
  outside this document entirely. A composition is a description; what is done with it is the
  evaluator's business and is specified, if at all, by that evaluator's profile.
- **Module bodies.** A module is referenced by identity and is opaque here (§5.4). Its contents are
  specified by a different document, [`MODULE_AUTHORING_WIRE.md`](MODULE_AUTHORING_WIRE.md) (the
  `module-authoring` profile, versioned on its own), and a composition commits to a body's bytes through the OPTIONAL
  `bodyAddress` member (§5.4) rather than by carrying it.
- **Authorship history.** How a composition came to be — the operations, their ordering, who
  performed them, and any signatures over them — is a separate concern with its own wire form. This
  document specifies the composition *value*.
- **Validation beyond well-formedness.** A composition can be well-formed and unbuildable. The
  refusals in §9 are the ones a *reader* owes; a profile may state further obligations (§8.4), and
  an evaluator will certainly have more.

### §1.3 Terminology

**Composition** — the value this format carries. **Document** — its canonical byte encoding.
**Node** — one element of the composition tree. **Kind** — the discriminator naming a node's shape.
**Token** — a short string drawn from a registered vocabulary. **Profile** — a registered evaluator
vocabulary and its rules (§8). **Reader** — an implementation that decodes a document. **Writer** —
one that encodes it. **Reject** — refuse the whole document; never read it partially.

The key words MUST, MUST NOT, REQUIRED, SHALL, SHOULD, SHOULD NOT and MAY are to be interpreted as
described in RFC 2119.

---

## §2. Conformance profiles

Conformance here is **profile-scoped**, and this is a property of the subject rather than a
preference. A reader that stores, transports, diffs or displays compositions has no business
knowing which tokens one evaluator admits; a reader that is going to *build* the composition has no
business not knowing. Those are genuinely different obligations, so partitioning them is what makes
each claim falsifiable.

Two profiles are defined by this document. Further evaluator profiles are registered per §8.

### §2.1 `core`

A `core` implementation reads and writes the document structure and the core vocabulary. Its
obligations:

- the document envelope and node shape (§3);
- the canonical encoding in full (§4);
- every core node kind and the members this document states for it (§5);
- versioned citations (§6);
- the extension mechanism, including refusing an undeclared field (§7);
- every refusal class in §9 marked `core`.

A `core` implementation treats every **profile-registered token** as an opaque string. It does not
know which tokens are admissible, does not reject an unrecognised one, and preserves it exactly. A
`core` reader can therefore read a composition written for an evaluator it has never heard of, which
is the whole reason the profile boundary sits where it does.

### §2.2 An evaluator profile

An evaluator profile's implementation carries every `core` obligation, **and**:

- the token vocabularies the profile registers, refusing an unregistered token in a slot the profile
  governs (§9, `token-unregistered`);
- the profile-only node kinds the profile declares (§8.3);
- the composition rules the profile states (§8.4).

A conformance claim **names a profile**. "Conformant to this specification" is not a claim, because
it does not say which of the two obligations above was met.

**An evaluator profile is of one of two kinds (§8.6), and the three obligations above are registered
by only one of them.** A *vocabulary* profile registers them. A *placement* profile registers none of
them — it registers a facet declaration (§11.2) and the axis that distinguishes it — and its
implementation meets them by **composition**: it carries them exactly as the vocabulary profile the
composition's root belongs to states them. So what a claim to a placement obliges is the placement's
own declaration plus the vocabulary of whichever profile the composition was written for, and never a
vocabulary the placement names.

### §2.3 What a profile may not do

A profile MUST NOT:

- change the canonical encoding (§4), which is the core's alone;
- remove or re-shape a core node kind's members;
- weaken a refusal class §9 marks `core`;
- register a token vocabulary for a slot the core states is opaque (§5.4 `impl`), or constrain the
  `value` of a `configKnob` whose `key` it does not recognise (§5.8).

A profile that needed any of these would be describing a different format, and saying so is cheaper
than discovering it.

### §2.4 A profile is not a stack rung

Two other things in this family are partitioned and are **not** this partition, and a reader meeting
all three at once will otherwise assume one refines another. None of them does.

| Notion | Where | What it partitions |
|---|---|---|
| **Conformance profile** | this section, §8 | The obligations inside **this** format. |
| **Facet profile** | §11.2, §12 | Which runtime demonstrations a declared guarantee is certified against — deliberately not folded into the above (§11.2). |
| **Stack rung** | [`CONFORMANCE_LADDER.md`](CONFORMANCE_LADDER.md) | Which **other specifications in this family** an implementation claims alongside this one. |

A conformance profile is a claim about this document; a stack rung is a claim about several. The
ladder is a separate document because its content is a set of pointers to specifications this one
does not control, and folding it in here would make an implementation of an evaluator profile owe
those specifications too — turning a registration into a breaking change for everyone already
conformant. Registering a rung adds nothing to §2.1 or §2.2, which is the same separation §11.2 draws
for a facet declaration and is why §10.1 calls both additive.

---

## §3. The document

### §3.1 The composition tree

A composition is a **rooted tree**. Each node is a JSON object carrying:

| Member | Type | Presence | Meaning |
|---|---|---|---|
| `kind` | string | REQUIRED, **first** | The node's kind tag (§5, §8.3). |
| *kind members* | — | per §5 | The members the node's kind states, **in the order §5 states them**. |
| `id` | string | REQUIRED | The node's identity within the composition (§3.2). |
| `children` | array of node | REQUIRED | The node's children, **in order**. |

The member order above is normative and is the whole of the ordering rule: `kind` leads, the kind's
own members follow in declaration order, then `id`, then `children`. There is no sorting anywhere in
a node (§4.2).

A node with no children carries `"children":[]`. A reader MUST accept a node with `children` absent
and read it as a leaf (§9, `accept`); a writer MUST emit the member.

### §3.2 Identity

`id` is an opaque string. It MUST be non-empty. It MUST be unique within one composition document:
two nodes with the same `id` are a refusal (`node-id-duplicate`).

Identity is **not** derived from position, so moving a node in the tree does not change what it is;
and it is not derived from content, so editing a node does not make it a different node. Both
properties are what let a composition be diffed against an earlier revision of itself, and both are
lost the moment an implementation starts synthesising ids from paths.

This document places no further structure on an `id`. A profile MAY require one (§8.4) — for
instance, that a module reference's id is the identity that a build will use for the module — and
that is a profile obligation, not a core one.

### §3.3 The root

The root node MUST be an `appRoot` (§5.1). A document whose root is any other kind is refused
(`root-kind-invalid`).

### §3.4 Containment

The core states no containment rules beyond §3.3. A profile states its own (§8.4): which kinds may
hold which, and which must be leaves. The core deliberately does not, because containment is where
an evaluator's shape shows through most strongly — a host that has no client tier has nowhere to put
a client shell, and that is a fact about the host, not about compositions.

One exception, because it is the extension mechanism's own property rather than a containment
opinion: an `extensionRef` (§5.10) MUST be a leaf, in every profile.

---

## §4. Canonical encoding

The bytes are the contract. Two independent writers given the same composition MUST produce
identical bytes; a reader that decodes a document and re-encodes it MUST reproduce those bytes
exactly.

### §4.1 The document

1. The document is **UTF-8**, with **no byte-order mark**.
2. There is **no insignificant whitespace**: no space, tab, carriage return or line feed appears
   between tokens. The document is one line.
3. There is **no trailing newline**. A fixture file's bytes are the document; a digest over the
   document is a digest over exactly those bytes.
4. The document is a single JSON object — the root node. There is no wrapper, no envelope member and
   no framing.

> **Exception to the shared conventions, stated as one.** The conventions require a specification
> close to RFC 8785 to carry a field-by-field divergence table with a reason per row. This encoding
> is **not** a variant of RFC 8785 and does not attempt to be: the divergences below are not
> refinements of JCS but a different rule for the one thing JCS is mostly about. The table is
> supplied anyway, in the form the convention asks for, because an implementer *will* reach for a
> JCS library and needs to know exactly which parts of it are safe.

### §4.2 Member order — declaration order, never sorted

Object members appear in **declaration order**: the order §5 states for the node's kind, wrapped by
`kind` first and `id` + `children` last (§3.1). Members are **never** sorted, at any depth, including
inside a citation object (§6) and inside an extension field entry (§7.2).

> **Exception to the shared conventions, stated as one.** The conventions name ordinal code-point
> ordering as the way a sort is specified precisely enough to be reproduced. This format does not
> sort, so that rule has nothing to bind to here. The rule it is replaced by is stated above and is
> at least as reproducible: declaration order is fixed by this document, section by section, and a
> writer that emits members in any other order emits a non-canonical document.

The reason is recorded in Appendix B.2 and is worth knowing before proposing the "obvious" fix:
declaration order is what makes a composition's canonical bytes stable under a member being *added*
to a kind in a later revision, and sorting is what makes them unstable.

### §4.3 Strings

A string is delimited by `"` and escaped as follows, and in no other way:

| Character | Escape |
|---|---|
| `"` (U+0022) | `\"` |
| `\` (U+005C) | `\\` |
| U+000A | `\n` |
| U+000D | `\r` |
| U+0009 | `\t` |
| Any other character below U+0020 | `\u00xx`, lower-case hexadecimal, four digits |
| Everything else | The character itself, as UTF-8 |

`/` is **not** escaped. U+007F is **not** escaped. Characters above U+FFFF are emitted as their UTF-8
bytes, never as a surrogate escape pair. A reader MUST accept `\/`, `\b`, `\f`, an upper-case
`\u00XX` and a surrogate escape pair on input, and MUST re-emit the decoded character per the table
above — that is a normalisation, not a byte-stability break, because the round-trip law is stated
over documents this format's writers produce.

### §4.4 Numbers

Every number in this format is a **signed 32-bit integer**, emitted as its shortest decimal
representation, with a leading `-` when negative and no leading `+`, no leading zeros, no decimal
point, no exponent. There is no real number anywhere in this format, and a document carrying one is
refused (`number-not-integer`).

A reader MUST refuse an integer outside the signed 32-bit range (`number-out-of-range`) rather than
truncating it or widening it to a floating type.

### §4.5 Booleans and absent members

There is no JSON `true`, `false` or `null` anywhere in this format.

- A **boolean-valued member is a string**, `"true"` or `"false"`, and no other spelling. This is a
  shipped encoding, recorded as such rather than tidied; §5.7 is its only carrier.
- An **optional member that has no value is OMITTED**, never emitted as `null` and never as `""`.

The omit-when-absent rule is not a style choice and it is not negotiable. A composition's bytes are
what a content address over it folds, so a member emitted unconditionally re-writes the encoding of
every composition ever written without it, and every stored address over those compositions stops
reproducing. That failure presents to a verifier as tampering rather than as a codec change, which
is the worst available way for a compatible change to arrive.

### §4.6 Arrays

Array members appear in the order the composition carries them. Nothing in this format sorts an
array. `children` order is the composition's own (§3.1); an extension's `fields` order is the
author's (§7.2); a profile-registered token list's order is the composition's (§5.1 `layers`).

### §4.7 Divergences from RFC 8785

The claim of this table is that these are **all** of them.

| RFC 8785 rule | This format | Why |
|---|---|---|
| Object members sorted by UTF-16 code unit of the key | **Declaration order** (§4.2) | Appendix B.2. Sorting makes canonical bytes unstable under an additive member; declaration order does not, and a composition's bytes are folded by stored content addresses. |
| Numbers per ECMAScript `Number::toString` (doubles) | **Signed 32-bit integers only** (§4.4) | The format carries no real number, so the double serialisation rule has nothing to apply to. Adopting it would admit `1e2` for `100`. |
| `\b` and `\f` short escapes | **Not emitted** (§4.3); accepted on input | The escape table above is the shipped one. Both characters are emitted as `` / ``. |
| Literals `true` / `false` / `null` | **Not used** (§4.5) | Booleans ride as strings and absence is omission. |
| Unicode escapes lower-case | **Same** | No divergence; stated because it is the rule most often got wrong in the other direction. |
| UTF-8, no BOM | **Same** | No divergence. |

An implementer using a JCS library must therefore replace its object serialiser and its number
serialiser, and may keep its string escaper if it can be told not to emit `\b` and `\f`. In practice
that is enough of the library that writing the eleven lines this format needs is the smaller job,
which is the reason this document states them (§4.1–§4.6) rather than pointing at one.

---

## §5. The core node kinds

Each subsection gives the kind tag, its members **in declaration order**, and what the kind means.
A member marked *(profile token)* is a short string drawn from a vocabulary a profile registers
(§8.2); the core carries it opaquely.

Every node also carries `id` and `children` per §3.1; they are not repeated below.

### §5.1 `appRoot` — the composition root

| Member | Type | Presence |
|---|---|---|
| `base` | string *(profile token)* | REQUIRED |
| `layers` | array of string *(profile token)* | REQUIRED |
| `displayName` | string | OPTIONAL |
| `shortName` | string | OPTIONAL |
| `projects` | array of string | OPTIONAL |

The root of the composition. `base` names the host the application is built on; `layers` names the
capability layers applied over it, in application order; `displayName` is the human title the
composed application is known by — what a client puts in a page title, what an evaluator names the
application.

**The shape is the core's and the token space is a profile's, and separating them is what this
section is for.** Every composition has a root, and every root is "a base plus what has been layered
over it" — that much is statable of any evaluator. *Which* bases exist, *which* layers exist, and
whether a given layer may be applied over a given base are read off one evaluator's surface, and a
core reader must not pretend to know them.

`layers` order is significant and is preserved exactly (§4.6). A profile MAY state that a particular
ordering is required, or that a layer subsumes another (§8.4); the core states only that the order is
carried.

An empty `layers` array is legitimate — a bare base — and is emitted as `[]`, not omitted.

`displayName` is a **core** member, not a profile one, by the argument this section opens with:
every composition has exactly one root, and every evaluator's application has a name, so that the
root states one is statable of any evaluator. Its value is an opaque string the core does not
interpret, and no profile registers a vocabulary for it. The member is **omitted when the
composition states no title** (§4.5), and absence means exactly that — no display name stated; an
evaluator that needs a title MAY title the application by the root's `id`. `displayName` present and
not a string is a refusal (`member-type-invalid`). Present and empty, or consisting only of
whitespace, is a refusal (`display-name-blank`): absence is the one spelling of "no title", and a
blank one would be a second. *Whitespace* here is exactly the characters carrying the Unicode
`White_Space` property — U+0009–U+000D, U+0020, U+0085, U+00A0, U+1680, U+2000–U+200A, U+2028,
U+2029, U+202F, U+205F and U+3000 — so that every reader draws the line at the same character. A
title with leading or trailing whitespace around other characters is not blank and is carried
exactly; nothing here trims it.

The member is additive and the format version stays 1 (§10.1): it is OPTIONAL and emitted only when
present, so no document written without it changes by a byte. A reader written before it existed
meets it as an unknown member on a known node kind, ignores it and does not re-emit it (§9.3) — it
drops the title and keeps working, which is the behaviour an additive change is defined by.

`shortName` is the application's **machine name**: the one name an evaluator gives the artefacts it
names after the application rather than after a node — what a build names its solution, what a
deployment names its unit. It is a core member for the argument `displayName` is: every evaluator's
application has a machine name as surely as it has a title. It is **declared, never derived**, and
the alternatives are not interchangeable with it: `displayName` is opaque copy the core does not
interpret, and the root's `id` is tree identity, which a reader must be free to choose for the tree's
sake. Its value matches exactly `^[A-Za-z][A-Za-z0-9-]{0,63}$` — an ASCII letter, then at most 63
ASCII letters, digits or hyphens — the grammar that is a file name, a build-tool identifier and a
package stem on every platform at once, so that an evaluator uses it verbatim and never re-spells
it. The member is **omitted when the composition states no machine name** (§4.5). `shortName`
present and not a string is a refusal (`member-type-invalid`); present and not matching the grammar
is a refusal (`short-name-invalid`). Nothing normalises it: a reader neither trims nor case-folds the
value, and a value outside the grammar is refused rather than repaired. What an evaluator names with
it, and whether a profile requires it, is the profile's business, not the core's.

The member is additive and the format version stays 1 (§10.1), by `displayName`'s argument: it is
OPTIONAL and emitted only when present, and a reader written before it existed ignores it (§9.3).

`projects` names the application's **declared build units**: the projects an evaluator builds with
the application although no node of the tree produces them — a library a unit's author code
references, a standalone tool, a second test project. It is a core member for `shortName`'s argument:
an evaluator that builds an application builds things the tree does not describe, and the only way it
learns of them without walking the author's own files is that the composition says so. They are
**declared, never discovered**: a reader infers no entry from any file, and an evaluator adds none the
member does not name. Each entry is a **relative path** naming one file under the application's root:
one or more segments separated by `/`, no segment empty, `.` or `..`, and no `\`, `:` or control
character anywhere — so an entry names the same file on every platform and cannot name one outside the
root. Order is significant and preserved exactly (§4.6), and each path is named once. The member is
**omitted when the composition declares none** (§4.5); present and empty is a refusal
(`projects-empty`), because "no declared project" has one spelling. `projects` present and not an
array, or an entry that is not a string, is a refusal (`member-type-invalid`); an entry outside the
path grammar is a refusal (`project-path-invalid`), and so is an entry repeating an earlier one
(`project-duplicate`), compared exactly. Nothing normalises an entry: a reader neither re-separates,
trims nor case-folds it. Whether a named file exists is not a reader's question — a document is read
without the application's files — and what an evaluator builds from the list is the profile's
business, not the core's.

The member is additive and the format version stays 1 (§10.1), by `displayName`'s argument.

### §5.2 `serverConfig` — the host-configuration section

No kind members.

A container for the composition's host-configuration children: seam bindings (§5.3), connector
references (§5.7), settings (§5.8). It carries nothing itself; it exists so that a composition's
configuration has a place rather than being scattered across the root's children.

The name is inherited from a shipped tag and is recorded here as such: read it as "the
host-configuration section", which is what it means. Renaming it would be a breaking change (§10.2)
for no gain.

### §5.3 `companionSelection` — binding a substrate seam

| Member | Type | Presence |
|---|---|---|
| `slot` | string *(profile token)* | REQUIRED |
| `impl` | string | REQUIRED |

Binds a named substrate seam to a named implementation of it: "the notification seam is filled by
*this*".

`slot` is a profile-registered token; *which* seams a host offers is that host's surface. `impl` is
**opaque to the core and to every profile** (§2.3): it names an implementation, and an
implementation registry is a distribution question rather than a wire one. A profile MAY state that
an unresolvable `impl` is a build-time failure; it MUST NOT make it a read-time refusal, because a
reader has no way to resolve one.

### §5.4 `moduleRef` — a reference to a composed unit

| Member | Type | Presence |
|---|---|---|
| `view` | string *(profile token)* | REQUIRED |
| `viewSpec` | citation object (§6) | OPTIONAL |
| `surfaceKind` | string, core vocabulary | OPTIONAL |
| `factTables` | array of fact-table objects | OPTIONAL |
| `metricDefinitions` | array of metric-definition objects | OPTIONAL |
| `subjectDefinitions` | array of subject-definition objects | OPTIONAL |
| `entities` | array of owned-entity objects | OPTIONAL |
| `aiExposure` | string *(profile token)* | OPTIONAL |
| `disclosurePolicies` | array of disclosure-policy objects | OPTIONAL |
| `bodyAddress` | string, content address | OPTIONAL |

An **opaque reference** to a unit composed elsewhere. The composition records that the unit is part
of it and how it is reached; it records nothing about what the unit contains. A module's body is a
separate tree with its own process, and this reference is the seam between them.

`view` is a profile-registered token naming the view technology the unit's user-facing surface is
written in. It is the profile's because *which* view technologies exist is the evaluator's question,
not the algebra's.

`viewSpec` is present when — and only when — the profile's registry marks this `view` token as
**citation-bearing** (§8.2). It carries the revision of the view contract the unit was authored
against (§6). Omitting it on a citation-bearing token means "whatever revision the reader considers
current", which is exactly the implicit claim §6 exists to end; a reader MUST accept the omission
(`accept`, a migration read) and a writer MUST NOT produce it.

`surfaceKind` is **core vocabulary**, not a profile's, and it is the one value space in this section
that is: how a composed unit is reached is a fact about the unit, and every evaluator has units
reached some way. Admissible values, and no others:

| Token | Meaning |
|---|---|
| `view` | A rendered surface a person navigates to. |
| `webhook` | An inbound call from a third-party system, carrying no session identity. |
| `api` | A programmatic contract another system calls. |

Absence is a **posture, not a default**: it means the composition declines to say. A reader MUST NOT
substitute a value for an absent `surfaceKind`. A profile MAY state what it derives for a unit that
declares none (§8.4) — a derivation is the profile's, and it is not the same thing as the document
having said so.

`surfaceKind` present and not one of the three tokens is a refusal (`surface-kind-unknown`).
`surfaceKind` present and not a string is a refusal (`member-type-invalid`) — absence is a posture,
a member of the wrong type is a broken record, and collapsing the two would let a `surfaceKind`
written as a number decode to a unit that declares nothing.

`factTables` declares the **fact tables the composed unit writes**: tables of facts about named
subjects, for named metrics, at named period grains. Like `surfaceKind` it is a fact about the unit
rather than about its contents — the composition records *that* the unit produces these tables, and
nothing about how it computes them. Each element is an object whose members, in declaration order,
are:

| Member | Type | Presence |
|---|---|---|
| `id` | string | REQUIRED |
| `subjects` | array of strings | REQUIRED |
| `metrics` | array of strings | REQUIRED |
| `grains` | array of strings *(profile token, element)* | REQUIRED |
| `definition` | fact-table definition object | OPTIONAL |
| `description` | description object | OPTIONAL |

`id` is the table's logical identity; `subjects` names the subject hierarchies its rows are drawn
from, and `metrics` the metrics its columns carry, each by the identity under which the unit defines
it. The core places no structure on those strings. `grains` names the period grains the rows describe,
and each element is a **profile token** (§8.2): which grains exist is the evaluator's question. Every
array carries the composition's own order (§4.6), and so does `factTables` itself.

The member is **omitted when the unit declares no fact table** (§4.5), and an empty array is a
refusal (`fact-tables-empty`): "this unit writes no fact table" has one spelling, so two documents
saying it cannot differ in bytes. `factTables` present and not an array, an element that is not an
object, or a fact-table member of the wrong type is a refusal (`member-type-invalid`); a fact-table
member missing is a refusal (`member-absent`). Whether the composition can actually store what a
unit declares it writes is a composition rule, and a profile states it (§8.4).

`definition` states **how the table is defined**, where `subjects`, `metrics` and `grains` only name
what it covers: the one subject hierarchy and level its rows sit at, a value shape per metric column,
the one period grain, the operation that produces it, how often it is refreshed and how its history is
kept, who it is disclosed to and whether the unit's output is complete without it. It is a fact about
the unit's output, exactly as the three reference members are — an evaluator that declares the table
to its host needs every one of these, and a composition that does not state them leaves the evaluator
to invent them. Its members, in declaration order:

| Member | Type | Presence |
|---|---|---|
| `schemaVersion` | integer | REQUIRED |
| `hierarchy` | string | REQUIRED |
| `level` | string | REQUIRED |
| `columns` | array of column objects | REQUIRED |
| `periodGrain` | string *(profile token)* | REQUIRED |
| `producingOperation` | string | REQUIRED |
| `refreshCadenceSeconds` | integer | REQUIRED |
| `historyMode` | string *(profile token)* | REQUIRED |
| `disclosure` | disclosure object | REQUIRED |
| `requirement` | string *(profile token)* | REQUIRED |

A **column** is `{ "metric", "shape", "disclosure" }`: the metric the column carries (by the identity
under which a `metricDefinitions` entry defines it), the value shape every cell takes *(profile
token)*, and — OPTIONAL — a disclosure overriding the table's own for this column. A **disclosure** is
`{ "class", "policy" }`: the disclosure class *(profile token)*, and — OPTIONAL — the reference to the
policy that governs it, which a profile says which classes take (§8.4). `refreshCadenceSeconds` is a
duration in whole seconds. The core places no structure on `hierarchy`, `level`,
`producingOperation`, `metric` or `policy`; how a definition relates to the three reference members
beside it, and to the definitions the unit registers, is a composition rule a profile states (§8.4).

`metricDefinitions` and `subjectDefinitions` **register** the metrics and subject hierarchies the unit
defines — the identities its tables' columns and hierarchies name. A **metric definition**'s members,
in declaration order:

| Member | Type | Presence |
|---|---|---|
| `id` | string | REQUIRED |
| `name` | string | REQUIRED |
| `unit` | string | REQUIRED |
| `dimensionality` | string | REQUIRED |
| `direction` | string *(profile token)* | REQUIRED |
| `displayFormat` | string | REQUIRED |
| `staleness` | staleness object | REQUIRED |
| `producingOperation` | string | OPTIONAL |
| `canonicalMethod` | string | OPTIONAL |
| `recomputePolicy` | string *(profile token)* | OPTIONAL |
| `rollUp` | roll-up object | OPTIONAL |
| `context` | string | OPTIONAL |

A **staleness** object is `{ "policy", "windowSeconds" }` — the policy *(profile token)* and,
OPTIONAL, a window in whole seconds — and a **roll-up** object is `{ "kind", "tolerance" }` — the
kind *(profile token)* and, OPTIONAL, a tolerance written as a decimal literal in a string, so the
value is carried exactly. A **subject definition** is `{ "id", "name", "levels", "calendar",
"description" }`: the hierarchy's identity, its display name, its level labels from root to leaf (an
array of strings, in the composition's order), and — OPTIONAL — the calendar its periods are counted in
and a description object. Every OPTIONAL member here is **omitted when the composition states none**
(§4.5): its absence is a statement that there is nothing to state, never a value to substitute.

A **description** says what a fact table is for, or what a subject hierarchy means, as prose: `{ "text",
"columns" }` on a fact-table entry, `{ "text", "levels" }` on a subject definition. `text` is REQUIRED.
The entry array is OPTIONAL; each element is `{ "metric", "text" }` (a column, by the metric it carries)
or `{ "level", "text" }` (a level, by its label), in the composition's order (§4.6). It is omitted when
no member is described and refused when present and empty, on `factTables`' terms. The core places no
structure on the text; whether a description may name a column or level its entry does not carry, or
describe one twice, is a composition rule a profile states (§8.4). A description is interpretation, not
data: a value belongs in a fact. The member is additive and the format version stays 1 (§10.1): a reader
written before it existed ignores it (§9.3).

Both members are **omitted when the unit registers none** (§4.5), and each is refused when present
and empty (`metric-definitions-empty`, `subject-definitions-empty`), on `factTables`' terms. A member
of any of these objects of the wrong type is a refusal (`member-type-invalid`); a REQUIRED one missing
is a refusal (`member-absent`).

`entities` declares the **records the composed unit owns**, each with its privacy class: what may
become of the entity's data, stated by the unit that owns it rather than by the composition at large.
Like `factTables` it is a fact about the unit, and the composition records nothing about how the unit
stores what it owns. An **owned entity**'s members, in declaration order:

| Member | Type | Presence |
|---|---|---|
| `name` | string | REQUIRED |
| `disclosure` | disclosure object | REQUIRED |
| `fields` | array of classified-field objects | OPTIONAL |

`name` is the entity's identity; `disclosure` is the disclosure object a fact-table definition uses
(`{ "class", "policy" }`, the class a *(profile token)*); `fields` names the entity's classified
fields. A **classified field** is `{ "fieldPath", "level", "auditOnRead", "encryptionKeyId" }`: a dotted
path into the entity's record, its sensitivity *(profile token)*, whether every read of it is audited
(a boolean-valued member, §4.5, REQUIRED), and — OPTIONAL — the identity of the key that encrypts it.
`fields` is **omitted when the entity classifies no field**, and refused when present and empty
(`entity-fields-empty`); `entities` is **omitted when the unit declares no owned entity**, and refused
when present and empty (`entities-empty`), each on `factTables`' terms. The core places no structure
on `name`, `fieldPath` or `encryptionKeyId`.

`aiExposure` states **whether the unit's data is reachable by a model through the host's
cross-unit AI surface** *(profile token)*. It is a fact about the unit, as `surfaceKind` is: how the
host's model reaches the unit, not what the unit does with a model of its own. Absence is a posture:
the composition states no exposure, and what a host does with an undeclared unit is the profile's to
say (§8.4). `aiExposure` present and not a string is a refusal (`member-type-invalid`). How a unit's
owned entities and its exposure must agree is a composition rule, and a profile states it (§8.4).

`disclosurePolicies` declares the **disclosure policies the composed unit owns**: what a disclosure's
`policy` reference — the one a `restricted` class carries — permits. A **disclosure policy**'s members,
in declaration order:

| Member | Type | Presence |
|---|---|---|
| `policyRef` | string | REQUIRED |
| `mode` | string *(profile token)* | REQUIRED |
| `permitSurfaces` | array of strings *(profile token, each)* | REQUIRED |
| `contributorScope` | string | OPTIONAL |

`policyRef` is the reference a disclosure names; `mode` is how the policy governs what is derived from
the facts it classifies; `permitSurfaces` lists the egress surfaces at which such a fact may be
disclosed, and is **written even when empty** — an empty list is a policy that permits nothing, which is
a stance and not an absence; `contributorScope` names the contributing party the policy belongs to. Each
element of `permitSurfaces` not a string, or `permitSurfaces` not an array, is a refusal
(`member-type-invalid`). `disclosurePolicies` is **omitted when the unit declares no policy**, and
refused when present and empty (`disclosure-policies-empty`), on `factTables`' terms. The core places no
structure on `policyRef` or `contributorScope`, and does not require a disclosure's `policy` to name a
declared policy: what an undeclared reference means, and how a policy constrains what the composition
publishes, a profile states (§8.4).

`bodyAddress` **commits the composition to the unit's body**: it is the content address — SHA-256
over the canonical bytes, as exactly 64 lower-case hexadecimal digits — of the **module document**
that is the unit's body, a document specified in
[`MODULE_AUTHORING_WIRE.md`](MODULE_AUTHORING_WIRE.md) (§M7 is the relationship in
full). The reference stays opaque — nothing here reads the body — but a composition carrying the
member names the body's bytes, so anything that attests the composition reaches what the unit does
and not only that it exists. The member is **omitted when the composition commits to no body**
(§4.5), and absence is the ordinary case: it is OPTIONAL at every revision of format version 1,
because requiring it would make every composition written without it non-conforming (§10.2).
`bodyAddress` present and not a string is a refusal (`member-type-invalid`); present and not exactly
64 lower-case hexadecimal digits is a refusal (`body-address-malformed`) — upper case is refused
rather than folded, since two spellings of one address would be two documents saying one thing in
different bytes. Whether the address matches a body is not a decode question, because it needs the
other document; [`MODULE_AUTHORING_WIRE.md`](MODULE_AUTHORING_WIRE.md) §M8.2 states it as a rule
(`body-address-mismatched`).

### §5.5 `dataType` — a registered data type

| Member | Type | Presence |
|---|---|---|
| `name` | string | REQUIRED |

Records that a data type of this name is part of the composition. The composition says the type
exists; it says nothing about its fields, its storage or how an evaluator materialises it. `name`
MUST be non-empty.

### §5.6 `portAllocation` — a reserved port band

| Member | Type | Presence |
|---|---|---|
| `server` | integer | REQUIRED |
| `client` | integer | OPTIONAL |

The network ports the composition reserves. `server` is the port the built application serves on — a
deployment fact, true or false of any evaluator.

`client` is the port a **development-time client toolchain** serves on. It is optional because an
evaluator whose client tier needs no such server allocates none, and its presence is therefore a
statement about the evaluator rather than about the composition. It is nonetheless a core member and
an integer, not a profile token, because a port is a port.

Both MUST be in the range 1–65535 (`port-out-of-range`).

### §5.7 `connectorRef` — an outbound integration

| Member | Type | Presence |
|---|---|---|
| `impl` | string | REQUIRED |
| `oauth` | string, core vocabulary | REQUIRED |
| `rateLimited` | string, `"true"` or `"false"` | REQUIRED |

An outbound integration with an external system: what it is, how it authenticates, and whether the
composition asks for its calls to be rate-limited.

`oauth` is **core vocabulary**, because each value names an external standard rather than anything
an evaluator supplies. Admissible values, and no others:

| Token | Meaning |
|---|---|
| `noOAuth` | The integration presents no delegated authorisation. |
| `oauth1a` | The OAuth 1.0a signature lifecycle. |
| `oauth2` | The OAuth 2.0 refresh-token lifecycle. |

`rateLimited` is a boolean-valued member — the format has two, this and a classified field's
`auditOnRead` (§5.4) — and rides as the string `"true"` or `"false"` (§4.5). Any other spelling —
`true`, `"True"`, `"1"` — is a refusal (`boolean-spelling-invalid`).

`impl` is opaque, exactly as in §5.3.

### §5.8 `configKnob` — a setting

| Member | Type | Presence |
|---|---|---|
| `key` | string | REQUIRED |
| `value` | string | REQUIRED |

One named setting carrying one value, both as strings. The shape is the core's; the **key space is a
profile's** (§8.2), because which settings a host has is the host's surface.

`value` is opaque to the core. `key` MUST be non-empty. A profile MAY state which keys it recognises
and what an unrecognised key means (§8.4), and for a key it recognises it MAY state a closed **value
grammar**: the values it admits, and the one a composition that omits the key is read as carrying. A
value outside that grammar is then a profile refusal. The grammar is part of recognising the key, not
a statement of configuration semantics: what a value makes the host do stays the host's business. The
value of a key the profile does not recognise stays opaque to it and is preserved exactly (§2.3).

A key whose value is a flag, where no profile recognises it, conventionally carries the value
`"enabled"`. This is a convention, not a rule; nothing reads it. A profile that recognises the key
states its own spelling instead.

### §5.9 `clientShell` and other profile-only kinds

There is no core `clientShell`. A kind that exists only under one family of evaluators is declared by
that profile (§8.3), carries the profile's own name in the refusal that turns it away for a `core`
reader, and is listed in the profile's registry.

This section exists to say that explicitly, because "the core does not have it" and "nobody has it"
are different claims and only one of them is true.

### §5.10 `extensionRef` — a namespaced hole

| Member | Type | Presence |
|---|---|---|
| `namespace` | string | REQUIRED |
| `extensionKind` | string | REQUIRED |
| `fields` | array of field entry | REQUIRED |

See §7. Summarised here for completeness: an `extensionRef` carries **no semantics of its own**. Its
meaning is read from a declaration registered under `namespace`/`extensionKind` (§7.1), and a reader
holding no such declaration carries it opaquely and refuses any field the declaration does not
declare.

`extensionRef` MUST be a leaf (§3.4).

---

## §6. Versioned citations

A composition routinely refers to a contract specified elsewhere: the view contract a composed unit
was authored against is the instance §5.4 carries. Left implicit, such a reference means "whatever
is current", so the claim a stored composition makes about itself silently changes every time the
other specification moves. A citation is how it stops meaning that.

### §6.1 The citation object

| Member | Type | Presence |
|---|---|---|
| `spec` | string | REQUIRED |
| `version` | string | REQUIRED |
| `corpusHead` | string | OPTIONAL |

`spec` names the cited specification. It is an opaque identifier and this document does not maintain
a registry of them — a citation is a claim by the author about a document they read, and mediating it
would make this specification an authority on other people's revisions.

`version` is the revision cited. Where it is a **dotted numeric triple**, it is compared
component-wise as integers, so `0.10.0` is newer than `0.9.0`; where it is not, it is an opaque label
and MUST NOT be ordered. A reader that cannot compare two revisions MUST say so rather than report
"not older" — the two are different answers and collapsing them is how a staleness check ends up
vacuously green.

`corpusHead` is OPTIONAL evidence: a content address over the cited specification's own conformance
corpus, by which a holder can tell whether the corpus on their machine is the one the author had.
Where it is a digest of a text artefact it MUST be computed over **LF-normalised** bytes, so two
checkouts of the same content under different line-ending settings agree.

### §6.2 Encoding

Members appear in the order above (§4.2). `corpusHead` is omitted when absent (§4.5).

Both `spec` and `version` are REQUIRED. A citation missing either is a **refusal**
(`citation-incomplete`), never a citation read leniently: reading an absent `version` as a default
would manufacture a claim the author never made, and a claim nobody made is worse than none.

A `viewSpec` member present and not an object is a refusal (`member-type-invalid`). A `corpusHead`
present and not a string is a refusal (`member-type-invalid`) — the strict-optional read of §5.4,
applied one level in.

### §6.3 Comparing citations

Two citations are comparable only when their `spec` members are equal. A comparison across different
`spec` values has **no answer**; an implementation that reports one is reporting about two documents
it has no reason to think are related.

A composition MAY declare a **minimum** revision it is prepared to compose, and report a citation
below it. This document specifies neither where that declaration lives nor what an implementation
does about the finding, and deliberately: lag is legitimate — a unit written against an older
revision is behind, not broken — so the remedy is a judgement, and a specification that made it a
refusal would be asserting otherwise.

---

## §7. Extension

A composition vocabulary that grows by revision grows slowly and breaks readers when it does. This
section is the alternative: a hole that is **declared**, **namespaced**, **opaque** and **refused by
default**, so a vocabulary this document does not have arrives as a registration.

### §7.1 The declaration

An extension is identified by the pair (`namespace`, `extensionKind`), rendered as
`namespace/extensionKind` wherever one string is needed.

A **declaration** states, for one such pair:

- `fields` — the field names a reference MAY carry, as an ordered list;
- `requiredFields` — those it MUST carry;
- `maxFieldLength` — the maximum length in characters of a field's value;
- whether the reference is a leaf (it is; §3.4).

A declaration states the fields there are. **Everything else is refused as undeclared** — an inline
body, an evaluation hint, a semantics tag, and every claim nobody has thought of yet. Nothing
anywhere enumerates forbidden field names, and that is what makes the refusal complete rather than a
blocklist that is always one entry behind.

### §7.2 The reference

`fields` is an array of field entries, each an object:

| Member | Type | Presence |
|---|---|---|
| `name` | string | REQUIRED |
| `value` | string | REQUIRED |

Entries appear in **authoring order** and that order is preserved exactly (§4.6). Round-tripping is
an identity law, not an agreement about ordering, so a writer MUST NOT sort them.

A **missing `fields` member** is a refusal (`extension-fields-absent`), *not* an empty payload:
"carries no fields" and "the field list was omitted" are different claims and only one of them is
something an author wrote. An empty array is legitimate where the declaration requires no field.

### §7.3 Refusing

Given a declaration for the pair, a reader MUST refuse:

| Condition | Class |
|---|---|
| A field whose name the declaration does not list | `extension-field-undeclared` |
| A required field absent | `extension-field-missing` |
| A field value longer than `maxFieldLength` | `extension-field-too-long` |
| A duplicate field name | `extension-field-duplicate` |
| A non-leaf `extensionRef` | `extension-not-leaf` |

Holding **no** declaration for the pair, a reader MUST carry the reference **opaquely**: preserve
`namespace`, `extensionKind` and every field entry with its order, and re-emit them byte-identically.
It MUST NOT refuse the reference for being unknown, and MUST NOT interpret it. Refusing an
unrecognised extension would defeat the mechanism; interpreting one would be worse.

### §7.4 The registry, and reserved names

This document registers the extension declarations below. Registration is additive (§10.1).

| Pair | Fields | Required | Max length | Status |
|---|---|---|---|---|
| `fuaran.program/logic-tree` | `ref`, `demandDigest` | `ref` | 256 | **Reserved** — carries no semantics in this revision |
| `fuaran.stack/rung-claim` | `rungs` | `rungs` | 256 | **Registered** — the claim facet of [`CONFORMANCE_LADDER.md`](CONFORMANCE_LADDER.md) §L5 |
| `fuaran.placement/profile-claim` | `profiles` | `profiles` | 256 | **Registered** — an author's statement of which evaluator profiles (§8.5) may reduce this composition |

**A registered declaration and a reserved one differ in one thing only: whether the fields mean
anything yet.** Both are refused-by-default in exactly the same way (§7.3), both are carried opaquely
by a reader holding neither, and both are additive (§10.1). What `fuaran.stack/rung-claim` has that
the row above it does not is a document stating what its one field's values are: the ladder registers
the rung vocabulary, and this row registers the hole those values ride in. **The value space is the
ladder's and not this document's**, which is why no rung identifier appears in this section — a
second copy of that vocabulary here would be one more place for it to drift, and §7.1's rule that a
declaration states the fields there are is satisfied by naming the field, not by enumerating what may
go in it.

**`fuaran.placement/profile-claim` is the third row and the second registered one, and it is a
different partition than the row above it.** Its `profiles` field names evaluator profiles from §8.5,
of either kind (§8.6), and never the composition's vocabulary, which its root already names; the rung
claim's names rungs from the ladder. §2.4 keeps those two notions apart on purpose, so
carrying both in one declaration would have put two documents' vocabularies in one field and made a
reader guess which one a token came from.

**The two claims also read their sets differently, which is the sharper reason they are not one
slot.** A rung claim is a **conjunction** closed downwards — naming two rungs means meeting both, and
the floor is computed rather than written. A profile claim is an **alternative**: an evaluator belongs
to one profile family, so a composition naming two placements says *either will do*, and naming one
says *only this one*. A reader that applied the ladder's closure to a placement claim would compute a
requirement nobody wrote.

**It claims a PROFILE and never a facet value**, and that follows from §11.1's rule that a facet is
not carried by a node: an author who could write `convergence=convergentFold` into a composition would
be putting a statement about an evaluator into the document the evaluator reduces, and the same
composition reduced by two evaluators has two different answers. A profile name is the coarser
statement and it is the one that stays true of the document.

**A composition needs no such reference, and §8.5's sentence about placements is unchanged by this
registration.** "A composition needs no member saying where it runs" is what makes a placement a
profile rather than a dialect, and it stays true: no token, node kind or composition rule ranges over
a placement, a composition carrying no claim is the ordinary case and states nothing, and every
evaluator reduces the same bytes to the same application. What this row adds is the author's ability
to **narrow the hosts**, in a hole that is refused by default and carried opaquely by everyone else —
the same thing the ladder's claim facet does one partition over, for the same reason a claim is worth
making at all: an application designed around a runtime guarantee is not improved by being reduced
onto a runtime that does not offer it.

**A reserved name is a statement, not a gap.** The `fuaran.program/logic-tree` pair reserves the
place where a composition will name the logic a module boundary carries, once the specification
governing that logic states what it is. The reservation exists now, before that vocabulary
stabilises, so the vocabulary arrives as a *filled* declaration rather than as a revision of this
document — and so that a composition written today can carry the reference forward unchanged.

`ref` is a bounded reference by identity, opaque here. `demandDigest` is an optional content address
over the projection published under that reference, by which a holder can tell a stale reference from
a current one — a reference could otherwise go stale against its own subject with no symptom at all.

An empty reservation cannot be wrong about a vocabulary that does not exist yet, which is the
argument for making one.

The corpus carries a matching **reserved family** name (`logic-tree`). A family reserved there is a
family that is *not missing*, and an implementation is *not failing* to run it. The list is retained
when it empties, because the mechanism is what makes the next extension cheap.

---

## §8. Evaluator profiles

### §8.1 What a profile is

A profile is a registered name plus a document. A **vocabulary** profile says which token
vocabularies fill the slots §5 marks *(profile token)*, which additional node kinds exist, and which
composition rules hold; a **placement** profile says none of those and composes with a vocabulary
profile instead (§8.6). Either is **versioned independently of this document**: a profile moves when
its subject moves, which is far more often than a wire format should.

A profile document MUST state:

1. its **profile identifier** and its **profile version**;
2. which **core version** it is a profile of;
3. its **kind** — vocabulary or placement (§8.6);
4. every **token vocabulary** it registers, by slot (§8.2);
5. every **profile-only node kind** it declares, with its members in declaration order (§8.3);
6. every **composition rule** it states, and the class each is refused under (§8.4);
7. its **conformance scope** in the corpus — which families a claim to this profile must run.

Items 4–6 are a vocabulary profile's. A placement profile states in their place that it registers
none of them and composes by §8.6's rule — its kind, not an observation repeated per document.

### §8.2 Token vocabularies

A profile registers a token vocabulary per slot, and declares that vocabulary **closed** or **open**.
The slots this document marks *(profile token)* are exactly: `appRoot.base`, `appRoot.layers`
(element), `companionSelection.slot`, `moduleRef.view`, a `moduleRef.factTables` entry's `grains`
(element), a fact-table `definition`'s `periodGrain`, `historyMode` and `requirement`, a column's
`shape`, a disclosure's `class` (a fact table's, a column's or an owned entity's), a metric
definition's `direction` and `recomputePolicy`, a staleness object's `policy`, a roll-up object's
`kind`, a classified field's `level`, `moduleRef.aiExposure`, a disclosure policy's `mode` and
`permitSurfaces` (element), and the **key space** of `configKnob.key`.

- A **closed** vocabulary is exhaustive: a token outside it is `token-unregistered`.
- An **open** vocabulary is partial: the registered tokens carry the meanings and rules the profile
  states, and an unregistered token is legitimate and carries none of them. A profile declaring a
  slot open MUST say what an unregistered token means there.

Openness is not a way to avoid deciding. A slot is open when the profile genuinely does not bound it
— a free-form setting key is the case this document has — and closed everywhere else. A profile that
declared every slot open would have registered nothing.

For `moduleRef.view` the registry additionally marks each token **citation-bearing** or not (§5.4). A
citation-bearing token requires a `viewSpec`; a non-citation-bearing token MUST NOT carry one
(`citation-unexpected`).

A profile MUST NOT register a vocabulary for `companionSelection.impl` or `connectorRef.impl` — the
core states those opaque and §2.3 makes that binding. A profile MAY register a value grammar for a
`configKnob` key it recognises (§5.8); the value of a key it does not recognise stays opaque.

A token an implementation of the profile does not recognise, in a slot the profile governs, is a
refusal (`token-unregistered`). A `core` implementation does not perform this check at all (§2.1),
and the difference between the two answers is the whole content of the profile boundary.

### §8.3 Profile-only node kinds

A profile MAY declare node kinds of its own. Such a kind:

- carries `kind`, its own members in declaration order, `id` and `children`, exactly as §3.1 states;
- MUST NOT re-use a core kind tag;
- SHOULD carry a tag that is unlikely to collide with another profile's, since a document does not
  record which profile it was written for.

A `core` reader encountering an unknown kind tag refuses it (`node-kind-unknown`). That is correct
and is not a failure of the mechanism: an unknown *node* is a part of the composition whose meaning
is unavailable, unlike an unknown *extension*, whose whole point is that its meaning lives elsewhere.
A profile that wants a shape to survive a `core` reader uses an extension (§7), not a node kind, and
that is the choice §7 exists to offer.

### §8.4 Composition rules

A profile states rules the core does not: containment (§3.4), layer ordering and subsumption (§5.1),
what it derives for an absent `surfaceKind` (§5.4), whether a unit's declared `factTables` have
somewhere to be written (§5.4), how a fact table's `definition` relates to its references and to the
definitions the composition registers (§5.4), how a unit's owned `entities` and its `aiExposure` must
agree and what an undeclared exposure means (§5.4), how a unit's `disclosurePolicies` are declared,
what an undeclared policy reference means and how a policy constrains what is published (§5.4), which
`configKnob` keys it recognises and the value grammar of each (§5.8), and any structure it requires of an `id` (§3.2).

Each rule names the class it is refused under, and a profile MAY define classes of its own beyond
§9's. A profile rule MUST NOT be numbered into §9's `core` set.

### §8.5 Registered profiles

| Profile | Kind | Subject | Published |
|---|---|---|---|
| `core` | — | This document. | Here. |
| `server-app-host` | vocabulary | An evaluator that reduces a composition to a server-hosted application, optionally bundling a client, with capability layers over a base host and named substrate seams. | By its evaluator's owner: <https://github.com/ToolUp-Forge/toolup-forge/tree/main/spec> |
| `durable-session-host` | placement | An evaluator whose sessions are **durable**: each session's tree and the operations against it are journaled, so a session survives the loss of its host process and resumes by replaying its own journal. | [`PROFILE_DURABLE_SESSION_HOST.md`](PROFILE_DURABLE_SESSION_HOST.md) |
| `local-first-host` | placement | An evaluator that runs **on the writer's own device**: authorship accumulates in that writer's own lane while the device is partitioned from every other, and reconnecting is a **fold** of the lanes rather than a synchronisation of state. | [`PROFILE_LOCAL_FIRST_HOST.md`](PROFILE_LOCAL_FIRST_HOST.md) |
| `edge-worker-host` | placement | An evaluator whose sessions run **at a named point of presence** on a runtime that may evict one between requests: state is held by one activation at a time, operations are journaled to a store the platform supplies, and where a session's data is processed is a **declared** fact rather than an asserted one. | [`PROFILE_EDGE_WORKER_HOST.md`](PROFILE_EDGE_WORKER_HOST.md) |

Each is specified in a document of its own, at its own version, and the `Published` column says
where. The `Kind` column is §8.6's, and a placement row's subject says how its evaluator runs and
never what a composition for it may say — that is the vocabulary profile's, whichever the
composition's root belongs to.

**A vocabulary profile is published by the owner of the evaluator whose surface it registers**,
beside that implementation and versioned with it, because the vocabulary is that evaluator's surface
read as found and moves when the evaluator does. `server-app-host` is the first registered vocabulary
profile and is published that way. Registering it here is what makes its name a claim this document
recognises; its tokens, profile-only kinds, composition rules, facet declaration and the vectors that
certify them are its document's, and no rule in this document depends on them. A §12 family vector
that demonstrates its facet declaration stays with this document, because what it tests is the
family's rule; whether the declaration honours what it demonstrates is certified where the
declaration is published. A placement names no vocabulary (§8.6), so where a vocabulary profile is
published moves no placement.

The corpus states its compositions in `server-app-host`'s vocabulary — a composition needs a `base`,
and the first registered vocabulary is the one there is — so a `core` vector's tokens are that
profile's. They are opaque to a `core` reader (§2.1) and a core vector tests nothing about them; the
corpus manifest records, per vector, which home publishes it.

`durable-session-host` is a placement, so it registers no vocabulary by construction (§8.6) and its
document is its §P8 facet declaration. It is registered as a separate profile rather than as a
widening of a vocabulary profile's own declaration because §11.2 makes a profile's declaration the
bound on what its implementations may claim, and `server-app-host` declines two delivery/idempotency
values on the stated ground that its family composes no store to remember a replay with. That ground
does not hold for a durable placement, and editing the older declaration to fit the newer family
would have widened a claim for every implementation that never made it. **A placement is a profile
here; it is deliberately not a dialect** — which is why a composition needs no member saying where it
runs, and why this registration adds nothing a `core` reader must now do (§11.2).

`local-first-host` is a placement for the same reason. What separates it from both profiles above is
the **convergence** axis, which is the one axis where the difference between placements is not a
matter of degree. Both of them declare `singleWriter` — one because it is handed a composition value,
the other because a session admits one writer by construction — and this one folds, because a device
that must be usable while it can reach nothing else cannot be a placement in which there is only ever
one writer. So the registration is what §11.2 says a profile is for: the same document, reduced by an
evaluator whose runtime answers are different, said out loud in advance rather than discovered.

`edge-worker-host` is a third placement, and the first whose distinguishing axis did not exist when
the profile before it was registered. What separates it is `locality` (§11.1, §12.6): every other
profile here is silent about **where** a composition's data is processed, and silence is the correct
declaration for each of them, because the question belongs to a deployment and none of them registers
a place for a deployment to answer it. This one does. Note what that did **not** require: no node
kind, no token, no composition rule, and no member of §5 — a composition still says nothing about
where it runs, and the placement is declared alongside it. That is the same evidence
`durable-session-host` produced for the placement-is-a-profile argument, on a property nobody had
asked the format for when that argument was made.

### §8.6 Vocabulary profiles and placement profiles

The registry holds two kinds of evaluator profile, and §8.5's `Kind` column says which each row is.

- A **vocabulary profile** registers what a composition for its family may say: the token
  vocabularies of §8.2, the profile-only node kinds of §8.3 and the composition rules of §8.4. Its
  document also declares the facets (§11.2) of the evaluator that reduces its compositions directly.
- A **placement profile** registers a facet declaration (§11.2) and the axis that distinguishes it
  from every other profile — convergence, locality, or whichever a later registration brings. It
  registers no token, no node kind and no composition rule, **by construction**: §2.3 is unchanged,
  and a placement that needed a vocabulary of its own would be a vocabulary profile, registered as
  one.

**A placement composes with exactly one vocabulary profile: the one the composition's root belongs
to.** The root belongs to the vocabulary profile whose `appRoot.base` vocabulary (§8.2) registers the
root's `base` token. Two vocabulary profiles MUST NOT register the same `appRoot.base` token, so that
a root belongs to at most one; a registration that would break this is refused at registration rather
than discovered at reduction. An implementation of a placement reads a composition with that
vocabulary profile's §8.2–§8.4 obligations, unchanged and under its classes, and adds its own facet
declaration and nothing a decoder owes. A composition whose root's `base` no registered vocabulary
profile registers leaves the placement nothing to compose with, and an implementation of a placement
refuses it as `vocabulary-unresolved` (§9.2). A `core` reader performs no such check, exactly as it
performs no `token-unregistered` check (§2.1).

**A composition never names its vocabulary profile, and a placement claim does not either.** The root
already names it, and a second statement could only disagree with the first. The
`fuaran.placement/profile-claim` declaration (§7.4) names evaluator profiles of **either** kind: a
placement profile names that placement, and a vocabulary profile names the evaluator that reduces its
compositions directly — the one its own facet declaration describes. The claim's one field and its
grammar are unchanged by this section; `server-app-host` is its first registered token because it is
the first registered profile.

**Conformance scope.** A claim to a placement runs every `core`-scope family, the placement family
`profile-placement`, and the conformance families of the vocabulary profile it composes with as that
profile's document states them, and reports both profiles by name. The corpus manifest scopes a
placement to the first two only (its `profileKinds` records each profile's kind), because the third is
decided by the composition and not by the placement — which is the whole of what
vocabulary-independence means.

---

## §9. Refusals

A reader that refuses a document refuses it **whole**. It MUST NOT read a document partially: a
member a reader has no field for could otherwise satisfy a requirement by omission, and a composition
half-read is a composition nobody wrote.

A refusal names its class. A reader that refuses for a class the document does not exhibit has not
certified the vector — it has certified being broken in a convenient way.

**Not every class below has a corpus vector, and the ones that do not say so.** A refusal a *decoder*
owes can be certified by handing a reader one document; a refusal that needs the whole tree, or the
extension registry, cannot be. The corpus therefore reserves a `composition-rules` family for the
second group and records each such class with its reason in the manifest, rather than leaving it
silently uncarried — a rule nobody certifies and nobody has noticed is worse than one openly
outstanding. Every reject vector additionally declares which layer must catch it, so an
implementation cannot claim an obligation by meeting a different one.

### §9.1 Core classes

| Class | Condition | §|
|---|---|---|
| `document-malformed` | Not well-formed JSON, or not an object. | §4.1 |
| `root-kind-invalid` | The root node is not an `appRoot`. | §3.3 |
| `node-kind-unknown` | A `kind` tag neither the core nor the reader's profile defines. | §8.3 |
| `node-kind-absent` | A node object with no `kind` member. | §3.1 |
| `node-id-absent` | A node with no `id`, or an empty one. | §3.2 |
| `node-id-duplicate` | Two nodes sharing an `id`. | §3.2 |
| `member-absent` | A REQUIRED kind member missing. | §5 |
| `member-type-invalid` | A member present and of the wrong type. | §5, §6.2 |
| `number-not-integer` | A number carrying a fraction or an exponent. | §4.4 |
| `number-out-of-range` | An integer outside the signed 32-bit range. | §4.4 |
| `port-out-of-range` | A port outside 1–65535. | §5.6 |
| `boolean-spelling-invalid` | A boolean-valued member spelled any way but `"true"` / `"false"`. | §4.5, §5.7 |
| `display-name-blank` | A `displayName` present and empty, or consisting only of whitespace. | §5.1 |
| `short-name-invalid` | A `shortName` present and not matching `^[A-Za-z][A-Za-z0-9-]{0,63}$`. | §5.1 |
| `projects-empty` | A `projects` member present and empty. | §5.1 |
| `project-path-invalid` | A `projects` entry that is not a relative path in §5.1's grammar. | §5.1 |
| `project-duplicate` | A `projects` entry repeating an earlier one. | §5.1 |
| `surface-kind-unknown` | A `surfaceKind` outside the three core tokens. | §5.4 |
| `fact-tables-empty` | A `factTables` member present and empty. | §5.4 |
| `metric-definitions-empty` | A `metricDefinitions` member present and empty. | §5.4 |
| `subject-definitions-empty` | A `subjectDefinitions` member present and empty. | §5.4 |
| `entities-empty` | An `entities` member present and empty. | §5.4 |
| `entity-fields-empty` | An owned entity's `fields` member present and empty. | §5.4 |
| `disclosure-policies-empty` | A `disclosurePolicies` member present and empty. | §5.4 |
| `body-address-malformed` | A `bodyAddress` that is not exactly 64 lower-case hexadecimal digits. | §5.4 |
| `oauth-kind-unknown` | An `oauth` outside the three core tokens. | §5.7 |
| `citation-incomplete` | A citation missing `spec` or `version`. | §6.2 |
| `extension-fields-absent` | An `extensionRef` with no `fields` member. | §7.2 |
| `extension-field-undeclared` | A field the declaration does not declare. | §7.3 |
| `extension-field-missing` | A required field absent. | §7.3 |
| `extension-field-too-long` | A field value over the declared length. | §7.3 |
| `extension-field-duplicate` | A repeated field name. | §7.3 |
| `extension-not-leaf` | An `extensionRef` with children. | §3.4 |

### §9.2 Profile classes

| Class | Condition |
|---|---|
| `token-unregistered` | A token outside the profile's registered vocabulary for its slot. |
| `citation-unexpected` | A `viewSpec` on a token the profile does not mark citation-bearing. |
| `vocabulary-unresolved` | A composition read under a placement profile whose root's `base` no registered vocabulary profile registers, so there is no vocabulary for the placement to compose with (§8.6). |

A profile may add more (§8.4).

### §9.3 What a reader must NOT refuse

- An **unknown extension** (§7.3) — carried opaquely.
- An **unknown member** on a known node kind — ignored on read, and not re-emitted. This is the
  forward-compatibility rule: an implementation that refuses one will break on the next additive
  change (§10.1). The `accept` vectors in the corpus are the falsifier.
- A **`children` member that is absent** — read as a leaf (§3.1).
- An **input escape this format does not emit** — `\/`, `\b`, `\f`, upper-case `\u00XX`, a surrogate
  pair (§4.3).
- A **`fuaranUI`-class citation-bearing token with no `viewSpec`** — read as the reader's current
  revision, a migration read (§5.4). A `viewSpec` that is *present and malformed* is refused, so the
  tolerance covers absence only.

### §9.4 Facet-family classes

These are refused by a **run**, not by a reader. No decode path reaches them and no composition rule
states them: they are what an implementation owes when it is actually executing (§11, §12), which is
why the corpus records their detection layer as `runtime` rather than `codec` or `profile`.

| Class | Condition | § |
|---|---|---|
| `replay-divergent` | A replay that cannot reproduce the projection the un-killed run would have produced. | §12.1 |
| `fold-conflict` | Two authorship lanes interfering: writing one member of one node to different values, or appending one identity twice. | §12.2 |
| `concurrent-authorship-unsupported` | Divergent authorship streams presented to a holder that admits one. | §12.2 |
| `quote-unverifiable` | A quote whose own integrity value does not re-derive from the content it covers. | §12.5 |
| `quote-stale` | A quote presented as current outside the validity window it carries. | §12.5 |
| `measurement-outside-policy` | A measurement the relying party's policy does not admit. | §12.5 |
| `binding-mismatched` | A quote bound to a composition other than the one it is presented with. | §12.5 |
| `region-undeclared` | A flow naming a processing site the placement declares no region for. | §12.6 |
| `egress-undeclared` | A flow crossing a region boundary that no declared route admits in that direction. | §12.6 |
| `pin-mismatched` | A flow declaring a region other than the one its site resolves to. | §12.6 |

A class here is refused by whichever implementations claim a facet value the class belongs to
(§11.3), and by no others. A `core` reader that never runs anything owes none of them, which is the
same boundary §2.1 draws one layer down.

---

## §10. Versioning and change

### §10.1 Additive

Additive, and does **not** move the format version:

- adding an OPTIONAL member to a node kind, emitted only when present (§4.5);
- adding an extension declaration to the registry (§7.4);
- registering a profile, or a token in a profile's vocabulary;
- adding a refusal class for a document that was already ill-formed;
- adding a corpus vector, or a reserved family name;
- registering a facet axis or value, a conformance family, or a profile's facet declaration (§11,
  §12);
- registering a **stack rung**, reserving one by name, or filling a reserved one
  ([`CONFORMANCE_LADDER.md`](CONFORMANCE_LADDER.md) §L8.1).

A reader at this version encountering an additive change ignores what it does not know (§9.3) and
keeps working. That is what "additive" means, and it is the whole of the test.

The last two entries are worth one sentence each because neither looks additive at first reading. A
facet declaration states nothing an implementation must decode and adds nothing to §2.1 or §2.2 —
§11.2 is what makes that true rather than merely intended — so an implementation conformant before a
family was registered is conformant after it, having gained the option of making a claim it could not
previously make. A stack rung is the same argument one level out and §2.4 is what makes it true: a
rung obliges only an implementation that claims it, so registering one leaves every existing
conformance claim exactly where it stood.

### §10.2 Breaking

Breaking, and takes a new format version:

- changing an existing member's meaning, type, presence or position in declaration order;
- changing the canonical encoding (§4);
- removing or re-tagging a node kind;
- narrowing a core vocabulary.

Every such change alters bytes that a content address was computed over, and an identity that changed
for a reason a reader cannot see splits an evidence base in two silently. A reader MUST refuse a
document whose format version exceeds what it accepts, naming both versions, and MUST NOT read it
partially.

### §10.3 Three versions, and they move independently

The **format version** (this document), a **profile version** (§8.1), and a **cited specification's
version** (§6) are three different numbers. They MUST NOT be conflated: a profile's vocabulary moves
when its evaluator moves, a citation moves when somebody else's document moves, and the format moves
almost never. An implementation that keyed one off another would report a format break every time an
evaluator shipped.

**What moves a profile version** is the same test §10.1 applies to the format, one level in. A
profile version moves when the profile changes what an implementation certifying to it MUST decode,
emit, refuse or compose — its token vocabularies, its profile-only node kinds, its composition rules,
its refusal classes, or the introduction of a normative section. It does NOT move when the profile's
**facet declaration** (§11.2) widens: registering an axis, or honouring a value on one, changes only
what an implementation MAY claim, and §10.1 has already established that such a change obliges
nobody. A profile version is how a certification claim names the declaration it was made against,
and a claim made before an axis was registered remains exactly as true after it — so the number that
claim cites should not have moved.

### §10.4 Forward coupling

A change to any specified member, ordering, encoding, refusal class or derived value updates **every
one** of the following, in the same change-set:

1. the normative text in this document;
2. the affected profile document, where a profile is affected;
3. the schemas under `schemas/v1/`;
4. the resident emitter in `wire-fixtures/emit.mjs`;
5. the vectors and digests in `wire-fixtures/manifest.json`;
6. **the codec of every implementation that certifies against the corpus.**

A change to a facet axis, a family's vector shape or a family's pass criteria (§11, §12) additionally
updates the affected **facet declarations** and every vector in the affected family, in the same
change-set — a discriminator that moved leaves every claim decided by it undecided.

A change to the `fuaran.stack/rung-claim` declaration above additionally updates
[`CONFORMANCE_LADDER.md`](CONFORMANCE_LADDER.md) §L5, which is where its one field's values are
specified; that document states its own coupling in §L8.4, and it runs through this same gate.

The sixth is the one most often left out and the one that makes the other five mean something: a
corpus the implementations have not caught up with is a specification of nothing. Where the coupled
artefacts live in more than one repository, "the same change-set" means landed and published
together.

The gate is `pwsh ./run.ps1`.

---

## §11. Runtime facets

§1.2 puts what an evaluator *does* with a composition outside this document, and leaves it to that
evaluator's profile. This section is the part of that which can be stated in common: the vocabulary a
profile uses to say what its evaluators guarantee at runtime, and the rule that makes such a statement
falsifiable.

### §11.1 The axes

The **facet axes**. Each is a **closed core vocabulary**, for the reason §5.7 gives about `oauth`:
each value names a semantics that is true or false of any evaluator, so no profile registers a further
value and no profile means something different by one. The set of axes is itself open in the §7.4
sense — a later profile that needs a property this table does not carry registers an axis, which is
additive under §10.1 — and this sentence used to state a count instead, which went stale on the first
registration that took it up.

| Axis | Values |
|---|---|
| `delivery` | `atMostOnce`, `atLeastOnce`, `exactlyOnceEffective` |
| `idempotency` | `idempotent`, `idempotentWithStore`, `nonIdempotent` |
| `restart` | `lostOnRestart`, `retriedAfterRestart`, `survivesRestart` |
| `convergence` | `singleWriter`, `convergentFold`, `divergentMerge` |
| `attestation` | `unattested`, `attestedAtLaunch`, `attestedWithinWindow` |
| `locality` | `unpinned`, `regionRouted`, `regionSealed` |
| `recompute` | `fullOnChange`, `rowLocal`, `groupLocal` |

What each value means, stated as an outcome rather than as a word, because the words are the part
everyone already agrees on:

- **`atMostOnce`** — an operation interrupted before it takes effect is not retried. It may be lost;
  it is never delivered twice.
- **`atLeastOnce`** — an operation interrupted before it takes effect is retried. It is never lost; it
  may be delivered twice.
- **`exactlyOnceEffective`** — retried, and the repeat is suppressed *because something remembered the
  first attempt*. The mechanism is part of the claim, and §12.1 requires it to be visible.
- **`idempotent`** — repeating the operation is the same operation. Nothing remembers anything; the
  operation simply has no second effect.
- **`idempotentWithStore`** — repeating is safe only because a store dedupes it. Distinct from
  `idempotent` in exactly the way that matters: it fails when the store is absent.
- **`nonIdempotent`** — repeating takes effect twice.
- **`lostOnRestart`** — work in flight at a restart is dropped, and nothing records that it was owed.
- **`retriedAfterRestart`** — work in flight is re-attempted after the restart.
- **`survivesRestart`** — work in flight continues across the restart rather than being re-attempted.
- **`singleWriter`** — one authorship stream is admitted; divergence is refused rather than resolved.
- **`convergentFold`** — divergent streams fold to one composition every holder computes identically,
  and interference halts with a named class instead of being resolved silently. **Both halves are the
  value**: a fold that quietly picked a winner would satisfy the first and defeat the point of it.
- **`divergentMerge`** — divergent streams are merged, and the result may depend on the order in which
  they arrived.
- **`unattested`** — the run produces no evidence of what it is executing. What is running is known
  only from what whoever operates it says is running.
- **`attestedAtLaunch`** — the run produces evidence, once, binding a composition's identity to a
  measurement of the environment the run started in. It says **what was launched**. It does not say
  what is running now, and nothing re-establishes it.
- **`attestedWithinWindow`** — the evidence carries a validity window, and the claim holds only inside
  it. Evidence presented from outside the window **downgrades** to what `attestedAtLaunch` says —
  what was launched — rather than continuing to read as current. **Both halves are the value**:
  evidence that stayed authoritative past its own window would satisfy the first half and defeat the
  point of it, exactly as a fold that quietly picked a winner would for `convergentFold`.
- **`unpinned`** — the evaluator does not constrain where a composition's data is processed. Where it
  runs is known only from where whoever operates it says they put it.
- **`regionRouted`** — every site the evaluator processes at is assigned a **declared region**, and
  data moves between two of them only where a **named route admits that ordered pair**. **Both halves
  are the value**: an evaluator that permitted a crossing because *some* route existed, or because the
  reverse route existed, would satisfy the first and defeat the point of it — permission to receive is
  not permission to send.
- **`regionSealed`** — the stronger posture on the same mechanism: nothing crosses a region boundary at
  all, because every site a composition's data reaches is in one region. It is not a degree of
  `regionRouted` but a different sentence — "these never leave here" rather than "these leave only
  where somebody said they may" — and a profile may honour both, because which one an implementation
  can say depends on its placement rather than on its code.
- **`fullOnChange`** — when the data behind a composition's registered data type changes, the
  evaluator answers the next question by evaluating the whole pipeline over the whole source. Nothing
  from the previous answer is reused. It is the baseline every other value on this axis is measured
  against, and it is a positive statement rather than an admission: it is always correct, it needs no
  cache to be right, and an evaluator that declines to be incremental for a stated reason is doing
  the only safe thing available to it.
- **`rowLocal`** — a change re-evaluates only the rows it names, and the rows it does not name keep
  the values the previous evaluation gave them. **Both halves are the value**: an evaluator that
  re-evaluated fewer rows and produced a different answer from the full evaluation would satisfy the
  first half and defeat the point of it, exactly as a fold that quietly picked a winner would for
  `convergentFold`. Doing less work is only a property worth having while the answer is unchanged.
- **`groupLocal`** — the same claim one level up, for a pipeline whose last step aggregates: a change
  recomputes only the groups whose membership it disturbed, and every other group's aggregate is
  carried. Both halves again, and a third condition the row case does not have — a group is carried
  only where its ordered membership is unchanged, because `first`, `last` and a floating-point sum
  all move when members are merely reordered.

**A facet is not carried by a node.** Nothing in §5 ranges over these values and no composition
document contains one; §1.2 is unchanged. A facet is stated *by a profile, about its evaluators*.
That is where the fact lives, because the same composition reduced by two evaluators has two different
answers and neither of them is a property of the document.

### §11.2 A profile's facet declaration, and what it is not

A profile declares, **per axis**, the values an implementation of that profile may claim. Per value
and never per axis: an evaluator that delivers at most once and retries after a restart honours
`atMostOnce` and `retriedAfterRestart` and honours neither of the other delivery values, and saying so
is what lets a composition be refused up front instead of reduced onto a runtime that cannot keep its
promises.

An implementation's **facet claim** names values from within its profile's declaration and is
certified against the vectors demonstrating exactly those (§11.3).

**A facet declaration is not part of the decode obligations of §2.1 and §2.2**, and the separation is
load-bearing rather than tidy. An implementation claiming a profile is not thereby claiming its facet
declaration: a differ and an evaluator can both be complete `core` readers while having entirely
different runtime postures, and a decoder has no way to exhibit a runtime property at all. So
registering an axis, a family or a declaration adds nothing an existing implementation must now do,
which is why §10.1 calls it additive; and two profiles declaring different values on one axis are not
in conflict, because neither is stating an obligation the other's implementations inherit.

**A placement's declaration is its own, and composing with a vocabulary profile does not import that
profile's.** A placement composes with a vocabulary profile's vocabulary (§8.6), never with its facet
declaration: the vocabulary profile's declaration describes the evaluator that reduces its
compositions directly, which is a different runtime posture, and reading it into a placement would
credit the placement with guarantees its own declaration declines. A facet claim made by an
implementation of a placement is bounded by the placement's declaration alone, whichever vocabulary
the composition it is reducing was written in.

### §11.3 Demonstrability

**A profile MUST NOT declare a facet value that no registered conformance family (§12) demonstrates
for that profile.** A certification run resolves each declared value to a vector in a family scoped to
the profile, runs it, and **refuses the certification** where any declared value has no passing run.
The refusal is `facet-undemonstrated`; it is an outcome of a certification, not a refusal of a
document, so it is not a §9 class.

This is the same rule §2.2 states about conformance claims, applied to the claims that are worth the
most. An unfalsifiable claim is not a claim — and "our evaluator delivers exactly once" is precisely
the sentence that is most valuable when true, most expensive to check, and therefore most often
written down without being checked at all.

**The converse is deliberately not a rule.** A value a profile does not declare is a **statement, not
a gap**: the evaluator does not provide it, an implementation is not failing to demonstrate it, and
the declaration is where a reader learns so. The asymmetry is the point — declining to claim costs
nothing, and claiming costs a vector.

### §11.4 An axis a profile provides nothing on

A facet declaration MUST carry **every** registered axis. An axis the profile provides nothing on is
declared with an empty set **and a stated reason**.

Empty-with-a-reason and absent are different, and only one of them is something somebody wrote — the
§7.4 reserved-name discipline, one level up. An absent axis is indistinguishable from an axis that was
forgotten when it was registered, and a reader has no way to tell a considered "we provide none of
this" from an oversight.

### §11.5 Values nothing can yet exhibit

A value for which no family states a **discriminator** — a rule deciding, from a vector's own content,
whether the value is actually exhibited — MUST NOT be declared by a profile and MUST NOT be claimed by
a vector. The corpus enumerates such values with the reason each is not yet discriminable, exactly as
it enumerates the refusal classes it carries no vector for (§9).

A claim nothing separates from its neighbours is not demonstrated by a fixture sitting next to it.

---

## §12. Conformance fixture families

A family is a registered group of vectors exercising one or more facet axes. **Registration is the
extension mechanism**, on the §7.4 pattern: a later profile that needs a property this document does
not cover registers a family rather than revising the format, and the corpus reserves the names of
families that are coming so that adding one **enumerates rather than renumbers**.

A registration states four things, and the corpus manifest carries all four as data:

1. the family **id**;
2. the **axes it exercises**;
3. the **vector shape** — what a vector of this family carries;
4. the **pass criteria** — what an implementation has done when it passes one, including the
   discriminator per value (§11.5).

A family's vectors are **scenarios, not documents a reader decodes**. They carry composition nodes and
are encoded by §4 like everything else here, so the corpus has one canonical encoding; but a vector's
`round-trip` or `accept` kind would be asking a decoder to certify a runtime claim, so a facet vector
is `hash` (its derived outcome is recomputed from its own content) or `reject` (its required outcome is
a refusal, detected at the `runtime` layer of §12.4).

### §12.1 `kill-and-replay`

**Exercises** `delivery`, `idempotency`, `restart`.

**Vector shape.** A **session**: a root composition and an ordered list of **steps**. A step either
**appends** a node to the root's children or **performs** a named operation, and every step declares
whether its intent is **journaled** — whether the evaluator wrote down that the step was owed before
beginning it. A performing step also declares its **dedupe** mechanism: `none`, `repeatable` (the
operation has no second effect), or `store` (something remembers the first attempt). A **kill point**
names the step the evaluator is terminated during. The expectation carries the post-replay
**projection**, as a digest over the resulting composition's canonical bytes, and the **effect
ledger** — per performer, how many times it was entered and how many times the operation took effect.

**The replay rule.** Steps before the kill point completed and are recovered from the journal. Steps
after it run normally. The step **in flight** at the kill is re-executed **if and only if it was
journaled**: an unjournaled step left no record that it was owed, so nothing knows to resume it. The
kill is placed *before* the operation takes effect, which is what makes a loss observable rather than
incidental.

**Pass criteria.** The post-replay projection reproduces the recorded digest **byte for byte** — that
is the family's invariant and it holds for every value on every axis. The effect ledger matches. And
every value the vector claims is exhibited by its own content under this table:

| Value | What the vector's content must show |
|---|---|
| `delivery` `atMostOnce` | the performer in flight at the kill: entered once, took effect never |
| `delivery` `atLeastOnce` | entered twice, took effect at least once |
| `delivery` `exactlyOnceEffective` | entered twice, took effect once, dedupe `store` |
| `idempotency` `idempotent` | entered more than once, took effect once, dedupe `repeatable` |
| `idempotency` `idempotentWithStore` | entered more than once, took effect once, dedupe `store` |
| `idempotency` `nonIdempotent` | some performer entered more than once and taking effect every time |
| `restart` `lostOnRestart` | the step in flight was unjournaled and was not re-entered |
| `restart` `retriedAfterRestart` | the step in flight was journaled and was re-entered |

The `dedupe` column is what separates `idempotent` from `idempotentWithStore` and both from
`exactlyOnceEffective`. Without it all three read as "entered twice, took effect once", and an
evaluator whose operations happen to be repeatable could certify a store it does not have.

**Its own falsifier.** A vector whose replay cannot reproduce the projection is a `reject` vector for
`replay-divergent`: the obligation is to say so, and emitting the shorter composition is the failure —
one that looks exactly like success. Such a vector's replay MUST actually diverge, or refusing it
demonstrates nothing.

### §12.2 `partition-and-fold`

**Exercises** `convergence`.

**Vector shape.** A **base** composition and two or more authorship **lanes**. Each lane has an id and
an ordered list of **ops**, each carrying a **stamp** — a non-negative integer, a logical clock
reading, not a wall-clock time — and being either an **append** of a node to the root's children or a
**write** of one member of one node named by `id`. The expectation is either the folded composition's
digest or a refusal.

**The total order.** All ops from all lanes are applied in ascending `stamp`; ties are broken by
**lane id, compared by ordinal code point**. Both halves are stated precisely for the reason a member
ordering is (the shared conventions): "sorted" is not an order, and a tiebreak that is not the
specified one produces two holders with two different compositions and no symptom.

**Interference.** Two ops **from different lanes** interfere when they write the same member of the
same node to different values, or append the same node identity (which §3.2 forbids the result to
carry). **Interference halts the fold with `fold-conflict` and produces no composition at all.** The
total order is deliberately not used to resolve it: ordering independent work is what the order is
for, and using it to pick a winner between two authors produces a composition neither of them wrote,
silently, with a digest that reproduces perfectly.

**Pass criteria.** A folding holder reproduces the recorded digest; an interfering pair halts with the
class; and **two vectors carrying the same lanes in different arrival orders fold to the same digest**.
The last is the control: a holder that simply concatenates in arrival order reproduces either such
vector alone, and only the pair separates it from one that computes the order.

**Both halves of `convergentFold` are demonstrated, or the value is not demonstrated.** §11.1 states
the value as two things — divergent streams fold to one composition every holder computes
identically, *and* interference halts with a named class instead of being resolved silently — so a
profile declaring it MUST carry, in its own scope, at least one passing vector that **folds** and at
least one that **halts with `fold-conflict`**. A certification carrying only the first is refused as
`facet-undemonstrated`, naming the missing half.

The rule is stated over a profile's scope rather than over a vector because neither half is a
property of one vector, and it is the shape §12.5's window pair already takes. What it excludes is
precise: a holder that folds correctly and resolves interference by taking the later stamp passes
every folding vector in this family, byte for byte, and is exactly the holder §11.1's second half
exists to refuse. Demonstrating that it is refused costs one vector; assuming it costs the value.

**The refusal that is a demonstration.** A holder that admits one authorship stream refuses divergent
streams under `concurrent-authorship-unsupported`, and that refusal *is* the `singleWriter`
demonstration. Such a vector's lanes MUST NOT interfere — a foldable scenario is the whole point,
because a holder refusing a *conflicting* one might be refusing the conflict rather than the
concurrency, and those are different claims.

### §12.3 Reserved family names

Registered here, in the sense §7.4 gives the word: names of families a later profile will register,
carried now so that adding one enumerates rather than renumbers, and so a certifying implementation
knows it is **not failing** to run them.

**This table is currently empty**, and it is kept rather than deleted. The mechanism is what makes the
next extension enumerate rather than renumber, and a section removed the moment its last row cleared
would have to be re-invented — under a new number, moving every reference to the two sections after it
— by whoever needs it next. An empty reservation table is a statement that nothing is promised, which
is a different fact from the section not existing.

**A reserved name that has since been registered leaves this table and gains a section of its own,
which is APPENDED rather than inserted.** Both names this table has carried took that route:
`attestation-quote` is registered at §12.5, and `placement-locality` at §12.6. The section numbering
enumerates for the same reason the family names do: a registration that renumbered §12.3 and §12.4
would move every reference to them held by anybody, in exchange for reading in a tidier order once.

**A family that was never reserved is registered the same way**, and `incremental-recompute` at §12.7
is the first. A reservation is a promise that something is coming; its absence is not a bar on
arriving. What the reservation buys is that a *published* promise is kept under the name it was made
in, and a family nobody promised has no such name to keep — so it appends, under the next free number,
exactly as a reserved one does.

**Registering a family may require registering an AXIS**, and all three registrations did. §12.5
minted `attestation`, §12.6 minted `locality` and §12.7 minted `recompute`, because in each case the
property the family exercises was not one any existing axis stated — and a family that reported its
result on the nearest existing axis would be saying something about delivery, or about restart, that
its vectors do not establish. An axis is additive under §10.1 for the reason §11.2 gives: registering
one adds nothing an existing implementation must now do.

### §12.4 Detection layers

Every reject vector in this corpus declares which layer must catch it, so an implementation cannot
claim one obligation by meeting a different one:

| Layer | Meaning |
|---|---|
| `codec` | A reader owes the refusal on decode (§9.1). |
| `profile` | A profile rule over a decoded composition (§9.2, and a profile's own §8.4 rules). |
| `runtime` | Only running the scenario answers it (§9.4). Neither a decoder nor a composition rule reaches it. |

### §12.5 `attestation-quote`

**Exercises** `attestation`.

Registered under the name §12.3 reserved for it. The family is about one question: **is the
composition a claim is made about the composition that is actually running?** Everything else in this
document is answerable from documents alone; this is not, which is why it is a family and not a
refusal class.

**Vector shape.** A **composition**, a **policy**, and a **quote**.

- The **policy** is the relying party's, never the attester's: the set of **measurements** it admits,
  and the instant at which it **observed** the quote. The observation instant is carried rather than
  read from a clock, for the reason every derived member in this corpus is carried — a vector whose
  outcome depended on when it was run would be an oracle that changed its answer overnight.
- The **quote** carries a **format**, a **measurement**, the composition digest it is **bound** to, an
  optional **notAfter** ending its validity window, an opaque **body**, and an **integrity** value
  over the whole of the preceding.

**The format is a token this document does not interpret.** The formats an attested environment
actually emits differ in every byte of the body — a fixed-offset report structure here, a set of
named claims there — and in nothing this family certifies: the binding, the measurement, the window
and the integrity are format-independent facts, and parsing a body is the verifier's business with
its own attester. So the corpus carries vectors in **more than one format** on purpose, and a corpus
carrying only one would be certifying format-independence with nothing to be independent of.

**The integrity value is the quote's own, and it is not a signature.** It is the same digest §12.1
and §12.2 take over canonical bytes, taken here over the §4 canonical encoding of the quote's members
up to but excluding `integrity` itself. A real format's integrity is a signature chained to a manufacturer's root, and
this corpus deliberately carries no such thing: a fixture holding a real signature either publishes a
private key or publishes a blob nobody offline can check, and neither is a conformance vector. What
the family certifies is that an implementation **re-derives** the integrity value it was handed
rather than reading it — which is the failure that survives every cryptosystem.

**Pass criteria.** An implementation has passed a vector of this family when, from the vector's own
content:

1. the quote's `integrity` re-derives from its other members;
2. the digest of the composition's canonical bytes equals the quote's `bound`;
3. the quote's `measurement` is one the policy admits;
4. the quote carries no `notAfter`, or the policy's observation instant is strictly before it;

and the outcome it reports is `attested` when all four hold and the named refusal otherwise. Each
condition is checked **independently and all four are reported** — a reader needs to know *which*
fact is wrong, and an implementation that stopped at the first would report a re-bound quote and a
foreign measurement identically. Two of them therefore co-fire by construction: `integrity` covers
the measurement and the binding, so editing either raises `quote-unverifiable` alongside the class
that names what was edited.

**And every value the vector claims is exhibited by its own content under this table:**

| Value | What the vector's content must show |
|---|---|
| `attestation` `attestedAtLaunch` | outcome `attested`, and the quote carries **no** `notAfter` — evidence with no window says what was launched and nothing about now |
| `attestation` `attestedWithinWindow` | outcome `attested`, the quote carries a `notAfter`, the observation is strictly before it, **and the corpus carries the same quote observed from outside the window, refused as `quote-stale`** |

The pair in the second row is the control, and it is the same argument §12.2's arrival-order pair
makes: a verifier that ignores the window reproduces the in-window vector perfectly, and only the
pair separates it from one that checks. The two vectors must differ in the observation instant and in
nothing else — a pair that also moved the measurement would be separating something else.

`unattested` is **not declarable and not claimable**: it is the absence of evidence, and a family
whose vectors are quotes cannot exhibit an absence. The corpus records it among the values it states
no discriminator for (§11.5), which is what makes "this evaluator attests nothing" a declaration of
an empty axis with a reason (§11.4) rather than a claim resting on a vector that could not exist.

**Its own falsifiers.** Each of the four refusal classes carries a reject vector whose content
genuinely exhibits the fault: a stale one whose observation really is outside the window, a
measurement really outside the policy, a binding whose digest really is another composition's, and a
quote whose integrity really does not re-derive. A reject vector that does not exhibit its fault is
passed by refusing a scenario that was fine, which demonstrates nothing — the same trap §12.1 and
§12.2 name about theirs.

### §12.6 `placement-locality`

**Exercises** `locality`.

Registered under the name §12.3 reserved for it. The family is about one question: **does anything a
composition's data flows carry leave the region it started in, and if it does, did somebody say it
may?**

The question is not answerable from a composition. §1.2 puts what an evaluator does outside this
document and §8.5 adds that a placement is a profile rather than a dialect — so a composition carries
no member saying where it runs, and it must not gain one. What a *deployment* has is a placement: an
assignment of processing sites to regions, and the routes it has decided admit a crossing between two
of them. This family is the vectors over that.

**Vector shape.** A **composition**, a **placement**, and a set of **flows**.

- The **placement** is the deployment's: for each processing **site**, the **region** it processes in;
  and a list of **routes**, each with an **id**, the ordered pair it admits (**from**, **to**), and its
  **basis**.
- A **region** is an opaque token this document does not interpret, for the reason §12.5 gives about a
  quote's format. What a region means is a matter of law and of where somebody's hardware is, and a
  specification that shipped a list of them would be wrong in a different jurisdiction every year.
- A **flow** names the site data leaves (**from**), the site it arrives at (**to**), and what it
  **carries**, as names. It may additionally carry a **pin** — the flow's *own* claim about the region
  it runs in — and omits the member when it makes none.

**A route is NAMED and carries its BASIS, and both halves are load-bearing.** An unnamed permission is
indistinguishable from an oversight; and what an operator needs in a dispute is not that a crossing was
allowed but that it was allowed *because of this*, recorded by somebody, *before* it happened.

**Pass criteria.** An implementation has passed a vector of this family when, from the vector's own
content:

1. every site a flow names resolves to a region the placement declares;
2. a flow whose endpoints resolve to **different** regions is admitted by a route naming **that
   ordered pair** — a route from `b` to `a` does not admit `a` to `b`;
3. a flow carrying a pin declares the region its own site resolves to;

and the outcome it reports is `sealed` when nothing crossed at all, `routed` when every crossing was
admitted, and the named refusal otherwise. All three conditions are checked **independently and all
three are reported**, on §12.5's argument: a reader needs to know *which* fact is wrong.

**An unresolved site is a REFUSAL, and this is the clause that is easiest to get wrong.** The
temptations are to read an unplaced site as "elsewhere", or as "the same region, nothing to see". Both
turn the one site nobody thought about into the one site that certifies clean. A proof with an
unresolved term is not a weaker proof; it is not one. A flow naming an unplaced site therefore
contributes **no crossing** either — a fact derived from a term that does not resolve is an invented
fact, and the missing region is already reported.

**A pin that contradicts the placement refuses, and NEITHER side is preferred.** One of the two is out
of date and nothing in the document says which. Silently preferring the placement would make a pin a
decoration that drifts for free; silently preferring the pin would let a flow opt out of the
deployment's own map.

**And every value the vector claims is exhibited by its own content under this table:**

| Value | What the vector's content must show |
|---|---|
| `locality` `regionSealed` | outcome `sealed`, at least one flow, every site resolving to **one** region, **and** the corpus carrying the same composition and flows under a placement that moves a site across a boundary, refused as `egress-undeclared` |
| `locality` `regionRouted` | outcome `routed`, at least one flow whose endpoints are in **different** regions, every such crossing named by a declared route, **and** the corpus carrying the same placement and flows with the route removed, refused as `egress-undeclared` |

Both rows end in a pair, and both pairs are the §12.5 window argument at a different boundary. An
evaluator that never resolves a region at all answers "sealed" and is right every time it is asked;
one that admits every crossing reproduces the routed vector perfectly. Only a perturbation that holds
everything else still separates either from an evaluator that checks.

**One perturbation serves both pairs, and that is a property of the corpus rather than a saving.** The
`egress-undeclared` reject vector is simultaneously the routed vector with its route taken away and the
sealed vector with one site moved across a border, because those two vectors differ from each other in
exactly that site's region. A corpus in which the two pairs needed different perturbations would be one
where the positive vectors were not about the same thing.

`unpinned` is **not declarable and not claimable**: it is the absence of a constraint, and a family
whose vectors are placement declarations cannot exhibit an absence. The corpus records it among the
values it states no discriminator for (§11.5), which is what makes "this evaluator pins nothing" a
declaration of an empty axis with a reason (§11.4) — exactly as `unattested` is one layer along.

**Its own falsifiers.** Each of the three refusal classes carries a reject vector whose content
genuinely exhibits the fault: a site the placement really is silent about, a crossing really admitted
by nothing, and a pin really naming another region. The pin vector's own crossing is deliberately
**routed**, so the contradiction is its only fault — a vector exhibiting two faults would be passed by
an implementation that found the other one.

### §12.7 `incremental-recompute`

**Exercises** `recompute`.

Registered under a name §12.3 never reserved, which is the first family to arrive that way. The family
is about one question: **when the data behind a composition's registered data type changes, how much
of the answer does the evaluator have to compute again — and is it still the same answer?**

The question is not answerable from a composition, and it is not answerable from a *pipeline* either.
§1.2 puts what an evaluator does outside this document, so a composition carries no member saying how
its data is evaluated and it must not gain one. What a *deployment* has is an evaluator, and what
distinguishes two evaluators of the same composition is what each does with a change. This family is
the vectors over that: the same source, the same change, the same required answer, and a **recorded
account of the work**.

**The two halves are not the same kind of claim, and conflating them is the mistake this family
exists to prevent.** The answer is a **pass criterion** — a refresh that produces a different table
from a full evaluation over the changed source has failed, with no allowance. The work is **recorded
evidence** — engines legitimately differ in how much they can avoid, so the counts are compared as
*less than* rather than as equal to. An instrument that graded on the counts would be measuring the
engine it was written beside.

**Vector shape.** A **composition**, the **data type** the pipeline runs over, a **pipeline**, a
**source** table, an **edit stream**, and the expected **result** with a **footprint triple**.

- A **table** carries its `columns` — each a `name` and a `type`, `int` or `string` — and its `rows`,
  each an ordered list of `cells` co-indexed with the columns. A cell is `{"int": n}`,
  `{"string": s}`, or the **null cell** `{"null": "true"}`. **This family's vectors still carry no
  ABSENT cell**, and the two are not the same thing: §4.5 omits an absent *member*, and an array
  element has no name to omit, so an absent cell would need a spelling this format does not have,
  whereas a null cell is a *present* cell carrying no value and is registered like any other member
  of the algebra. It exists because a bounded-frame `window` over a partition's first row has no
  predecessor to read, so the absence is what the frame *says* rather than a hole to be tidied. Its
  boolean rides as the string §4.5 requires — there is no JSON `true` or `null` anywhere in this
  format, and a family exempting itself from that would be proposing a change to §4, which is a
  different act from registering a vector.
- A **pipeline** is an ordered list of steps: `filter` (a `where` expression), `derive` (a `column`
  name and a `value` expression), `groupBy` (`keys` and `aggregates`, each an output `name`, an `fn`
  of `count`, `sum` or `first`, and the column it is `of`), `sort` (a `by` list of `column` and
  `direction`), `window` (a `partitionBy` column list, an `orderBy` list of `column` and `direction`,
  a frame function `fn`, the column it is `of`, and the column name it appends `as`), and `join` (a
  `how`, the `on` pairs of `left` and `right` column names, and the `source` table it joins against).
  An expression is a `column`, a `literal` integer, or a `binary` of `greaterThan` or `multiply` over
  two of them.
- **The algebra is deliberately the smallest that separates the values on this axis**, and it is open
  in the §7.4 sense: a later profile whose evaluators need a verb, an aggregate or an operator this
  list does not carry registers it, additive under §10.1. A corpus that specified an algebra it did
  not exercise would be publishing a vocabulary nothing certifies, which is the failure §11.5 names
  one layer along.
- An **edit stream** names its addressing `scheme` and its `ops`. Under `identity` it also names the
  `key` column, and an op's `row` is that column's value; under `ordinal` there is no key, and an op's
  `row` is the row's zero-based position in decimal. An op is `setCell` (a `row`, a `column` and a
  `value`), `appendRow` (its `cells`), or `removeRow` (a `row`).

**Row-addressed and identity-witnessed, and the scheme is the whole of the difference.** A positional
delta is not an identity delta: a cache keyed by position is invalidated wholesale by any insert, so
an evaluator handed an `ordinal` stream has nothing it may reuse and evaluates in full. An evaluator
that read the ops and ignored the scheme would reproduce the identity vector's answer perfectly and
would be wrong the first time a row was inserted above one it had cached. §12.6's argument, one axis
along: only a pair that holds everything else still separates the two.

**Pass criteria.** An implementation has passed a vector of this family when, from the vector's own
content:

1. applying the edit stream to the source yields the **changed source**;
2. evaluating the pipeline over the changed source from scratch yields the **result** the vector
   records;
3. advancing the previously-primed evaluation against the edit stream yields **that same result** —
   the same columns, in the same order, with the same rows, in the same order;
4. and the work each of those three did matches the **class** the vector's footprint triple records:
   `prime` over the source, `full` over the changed source, `refresh` from the primed state.

Conditions 2 and 3 together are the whole of the equivalence claim, and they are checked
independently and both reported: an implementation whose refresh is wrong and whose full evaluation is
also wrong has two faults, and being told about one of them is being told the wrong thing.

**The footprint record.** Each of the three carries the `sourceRows` it ran against, the `resultRows`
it produced, and what it `recompute`d — one of `primed` (with the `rowsEvaluated`), `reusedPrior`,
`rowsRecomputed` (with the `rowsEvaluated`), `groupsRecomputed` (with the `rowsEvaluated` and the
`groupsRecomputed`), or `fullRecompute` (with the `rowsEvaluated`, a `reason`, and the `verb` where
the reason names one).

**`rowsEvaluated` counts ROW EVALUATIONS AT STEPS, not rows, and this is the clause an implementer
gets wrong first.** A row that passes through three steps is evaluated three times; a row a filter
drops is not evaluated by the steps after it; a `groupBy` contributes none, because what it recomputes
is groups and it reports them separately, and a `sort`, a `window` and a `join` contribute none
because not one of them evaluates an expression of the algebra. Counting rows rather than
row-evaluations would give a one-step pipeline and a ten-step pipeline the same cost, which is the one
thing a work measure must not do.

**It is ONE scale, and a `fullRecompute` is counted on it too**, carrying what the full evaluation
itself evaluated over the changed source. The count is what makes a decline comparable with the thing
it fell back to, which is the comparison the record exists to support; reading it off `sourceRows`
instead charged a declined evaluation for a single pass, so a pipeline with two evaluating steps read
as having done *less* work by declining than by refreshing. The reason is still the half a consumer
needs first — a decline with no reason is indistinguishable from an evaluator that never tried — and
the count never stands in for it.

**A PRIME IS `primed`, whatever the plan says.** Priming a declined pipeline is not a fall-back: there
is no prior state to fall back *from*, and a prime evaluates everything either way. The decline and
its typed reason belong to the **refresh**, which is where a fall-back actually happens, and a consumer
that wants to know *before* evaluating asks the pipeline's classification rather than the prime's
footprint.

**A step propagates a delta when its output for a named row is that row's own function** — `filter`
and `derive` — **or when it computes nothing per row and merely REORDERS**, as `sort` does: the row's
cells are unchanged and its position is recoverable by merging the named rows into the order the
previous evaluation already produced, so every step admitted after it reads exactly the order a full
evaluation would have handed it. A step **declines** where it computes a value for a row from rows the
stream does not name — a `window`, whose frame is a neighbourhood of the row in its partition's order
— or from a relation the stream describes nothing about — a `join`, whose verdict for a row reads the
joined relation as well as the row, so a verdict reused because "the delta did not name this row"
would answer a changed relation with the previous relation's answer.

**A decline is a MEASURED outcome with a stated reason, never a gap.** The reason is derived from the
vector's own content and never read out of it. Three are derivable from this family's rule:
`stepNotRowLocal`, naming the `verb`, where a step's output for one row depends on rows the edit
stream does not name; `aggregateStepNotLast`, naming the `verb`, where a step that could be maintained
sits somewhere other than last, so the steps after it would be reasoning about a change to the group
table that nothing described; and `ordinalAddressing`, where the stream addresses rows by position.
Where a pipeline and a stream would each produce a reason, the **pipeline's is reported**: a pipeline
that can answer no delta at all is the larger fact, and re-addressing the stream would not help it.
The reason vocabulary is open on the same terms as the algebra — what closes it in practice is that a
vector may only claim a reason this family's own rule derives, so a reason nobody can derive is a
reason nobody can claim.

**The class this family records is its own reference boundary, not a ceiling on an implementation.**
The counts are already compared as strictly-less-than for that reason, and the same reading extends to
the class: an evaluator that restricts where this rule declines has done better than the reference,
not differently from it, and the pass criterion that binds it either way is the **result**. What such
an evaluator must not do is produce a different table — which is condition 3, checked on every vector
with no allowance.

**Two of the record's own cases are specified and not exercised, which is recorded here rather than
left to be noticed.** `reusedPrior` is what an edit stream naming nothing costs; the corpus carries no
vector for it because a scenario in which nothing changed measures nothing, and the case is specified
anyway because a consumer's evaluator will reach it and needs somewhere to report it.
`aggregateStepNotLast` is derivable, as above, and unclaimed. `stepNotRowLocal` is now exercised by
**two** verbs rather than by one, and deliberately by two that decline for different reasons — a
`window` reads rows the stream does not name, a `join` reads a relation it does not describe — because
a reason exercised by a single verb is indistinguishable from a rule about that verb.

**A group is carried only where its ORDERED membership is unchanged**, never merely because no row in
it was named. `first`, `last` and a floating-point sum all move when members are only reordered. The
corpus carries **no reordering-only vector**, and that is recorded rather than silently absent: such a
vector needs an edit that an identity stream reports as no change at all, which is a second scenario
shape rather than a variation on these, and the family would be registering it under a rule the
present vectors already state.

**And every value the vector claims is exhibited by its own content under this table:**

| Value | What the vector's content must show |
|---|---|
| `recompute` `fullOnChange` | the `refresh` recomputes in full, for a reason this family's rule derives from the vector's own pipeline and edit stream |
| `recompute` `rowLocal` | every step row-local, the `refresh` recomputing rows, and **strictly fewer** row-evaluations than the `full` it is measured against |
| `recompute` `groupLocal` | a row-local prefix and a final `groupBy`, the `refresh` recomputing groups, **strictly fewer** groups than the result carries, and strictly fewer row-evaluations than the `full` |

**Strictly fewer is the whole of the first two rows.** An evaluator that recomputed everything and
reported it as row-local would satisfy every other clause; one that recomputed every group would report
its group count truthfully and have maintained nothing.

**And a profile declaring `rowLocal` carries the RE-ADDRESSING PAIR in its own scope** — at least one
passing row-local vector, and a vector with the same composition, the same pipeline, the same source
and the same row named, re-addressed by `ordinal`, that declines. This is §12.2's shape rather than
§12.6's: stated over a profile's scope rather than per vector, because an evaluator that reads the ops
and ignores the scheme reproduces **every** row-local vector byte for byte, so what the corpus needs is
one control that holds everything else still, not a partner for each. `groupLocal` needs no pair at
all: its own content already carries the count it must beat, since the number of groups in the result
is the number an evaluator that maintained nothing would have recomputed.

**Equality is not in that table, and its absence is the design.** A vector records **one** result, and
both the full evaluation and the refresh must produce it — so the equality is not a fact a vector's
content can exhibit, it is the obligation the vector *imposes*. The corpus derives the result from the
changed source and checks the vector records that; the refresh's agreement with it is condition 3
above, discharged by an implementation at certification and by nothing else. A corpus that carried a
second, separately-recorded refresh result would be recording the same table twice and calling the
comparison a check.

That pair is §12.5's window argument at a third boundary, and §12.6's route pair at a fourth: a
perturbation that moves one thing and holds the rest still is the only construction that separates an
implementation which checks from one which has never needed to.

**This family registers no refusal class, and the absence is deliberate.** Every §9.4 class is
something a *run* refuses; the failure this family is most concerned with — a refresh that costs less
and answers differently — is not a scenario a vector can carry, because every vector here records the
result a correct evaluation produces. A vector "whose refresh diverges" would be a vector recording a
wrong answer, which is a defect in the corpus rather than a scenario in it. So the equivalence is a
pass criterion, checked on every vector, rather than a class refused on one.

---

## Appendix A — Implementer's checklist

Ordered by how often each item is the thing that is wrong.

1. **Member order is declaration order** (§4.2) — not sorted, at any depth, including inside a
   citation and an extension field entry. A JSON library that sorts keys, or that preserves
   insertion order only by accident, will produce non-canonical bytes that decode perfectly.
2. **Absent optional members are omitted**, never `null` and never `""` (§4.5). Check `viewSpec`,
   `surfaceKind`, `corpusHead`, `portAllocation.client`, `appRoot.displayName` and `appRoot.shortName` specifically — and `appRoot.projects` (§5.1), `factTables`,
   `metricDefinitions`, `subjectDefinitions`, `entities`, an owned entity's `fields` and
   `disclosurePolicies`, each omitted when EMPTY rather than spelled `[]`, because an empty one is
   refused (§5.4), and `aiExposure`, and the optional members inside a fact-table definition, a
   column, a disclosure, a metric definition, a classified field and a disclosure policy. A disclosure
   policy's `permitSurfaces` is the exception: it is REQUIRED, and written as `[]` when empty.
3. **`rateLimited` is the string `"true"`, not the literal `true`** (§4.5, §5.7), and so is a classified
   field's `auditOnRead` (§5.4). This is the single most common first failure.
4. **No trailing newline, no whitespace, no BOM** (§4.1). A fixture's bytes are the document.
5. **`\/`, `\b` and `\f` are accepted on input and never emitted** (§4.3). `/` is not escaped.
6. **A present-but-wrong-typed optional member is a refusal, not an absence** (§5.4, §6.2). This is
   the one an otherwise-correct reader gets wrong, because both look like "no value" to a lenient
   accessor.
7. **A missing `fields` array is a refusal; an empty one is legitimate** (§7.2).
8. **An unknown extension is carried, an unknown node kind is refused** (§7.3, §8.3). Getting these
   the same way round is a design error, not a bug.
9. **`children` is emitted always and accepted absent** (§3.1).
10. **A `core` implementation does not validate profile tokens** (§2.1). A reader that refuses an
    unrecognised `base` is claiming a profile it has not implemented.
11. **Comparing citations across different `spec` values has no answer** (§6.3) — report that, do not
    report "not older".
12. **Integers only, 32-bit signed** (§4.4). A JSON library that hands back doubles will re-emit
    `13000` as `13000.0` at the first opportunity.
13. **Declare a facet value only where a family demonstrates it** (§11.3). The temptation runs one
    way: `exactlyOnceEffective` is the sentence worth the most and the one hardest to show, and a
    declaration is free to write. It is refused as `facet-undemonstrated` here rather than believed
    somewhere else.
14. **`rowsEvaluated` counts row evaluations at steps, not rows** (§12.7). A row passing through
    three steps is evaluated three times; a row a filter drops is not evaluated by the steps after
    it. Counting rows gives a one-step and a ten-step pipeline the same cost, which is the one thing
    a work measure must not do — and it reads as correct until two pipelines are compared. It is one
    scale, so a `fullRecompute` is counted on it as well; reading a declined evaluation's cost off
    `sourceRows` makes it compare as having done less work than the full evaluation it fell back to.

---

## Appendix B — Rationale *(non-normative)*

### B.1 Why a neutral core and a profile, rather than one document

The vocabularies an application composition ranges over are not all of a piece. Some are statable
without naming any evaluator — a data type by name, a reserved port, an outbound integration's
authorisation standard, an opaque reference to a unit composed elsewhere. Others are read directly
off one evaluator's surface: which base hosts exist, which capability layers there are, which
substrate seams can be filled, which view technologies are available, which settings a host has.

An audit of one such composition vocabulary, element by element, found the two surfaces answering
differently and consistently: node **shapes** were largely neutral, and the **value spaces** those
shapes ranged over largely were not. That is not a defect to be fixed; it is the actual structure of
the subject, and the design that follows from it is a core specifying shapes and a profile
registering values. A single document would have had to either name an evaluator throughout — making
the format that evaluator's — or pretend the value spaces were neutral, which is the failure the
audit was run to detect.

The audit's contested cases are visible in this document's seams. A composition root was contested
because its *shape* is neutral and its *payload* is one evaluator's; §5.1 resolves that by splitting
the two, which is a finer answer than either verdict. A development-time client port was contested
because the case-level and field-level answers differ; §5.6 keeps it a core member and says in prose
why its presence is a statement about the evaluator. Neither is smoothed over, because a contested
classification recorded as resolved claims something the evidence did not support.

### B.2 Why declaration order rather than a sort

Sorting object members is the more common choice and it is the wrong one here, for a reason specific
to what this format carries.

A composition is stored, and content addresses are taken over its bytes — over whole documents, and
over individual nodes as they are authored. Those addresses are expected to keep reproducing.

Under a sorted encoding, adding an OPTIONAL member to a node kind can change the position of members
that were already there, because the new key sorts between them. Every stored address over a document
containing that node then stops reproducing, and it does so for a change that is additive in every
other sense. Under declaration order, an added member appends at its declared position and every
document that does not carry it is byte-identical to what it was. Combined with the omit-when-absent
rule (§4.5), an additive member is invisible to every composition that does not use it.

The cost is that declaration order must be *stated*, section by section, rather than derived from the
keys — which this document does (§5) and which is the reason §5's tables are ordered rather than
alphabetical.

### B.3 Why an unknown extension is carried and an unknown node kind is refused

They look symmetrical and are not.

A node is *part of the composition*. A reader that does not understand one does not understand the
composition, and carrying it forward while silently not knowing what it does is how a build ends up
missing a piece nobody can name. Refusing is the honest answer.

An extension is a reference whose meaning is *declared elsewhere by design*. A reader that holds no
declaration for it is in exactly the state the mechanism anticipates, and the reference's contents
are opaque strings it can preserve perfectly. Refusing would make the mechanism useless — an
extension nobody can carry is not an extension.

So the asymmetry is the mechanism working, and §8.3 states the consequence for a profile author: a
shape that must survive a reader who does not know it is an extension, not a node kind.

### B.4 What a `core` reader is for

It is tempting to think a reader that cannot check profile tokens is a lesser reader. The useful
ones are: a store, a differ, a transport, a viewer, a migration tool, an archive. None of them should
know an evaluator's vocabulary, and each of them is *more* durable for not knowing — a composition
written for an evaluator that no longer exists still reads, diffs and displays.

The check a `core` reader declines to make is a check it has no basis for. That is the difference
between a partial implementation and a scoped one.

It is also the class of implementation that folds. A store holding one composition from two writers
needs node identity (§3.2) and declaration order (§4.2) and nothing else, which is why `core` is the
profile that declares a `convergence` value while declaring nothing on the three axes that require
something to be *performed*.

### B.5 Why a runtime claim needs a family and a token does not

A profile registering `serverApp` as a base host is registering a fact about a vocabulary: the token
is admissible, and a document carrying it is well-formed. Anybody can check that by reading the
document, and the corpus vector for it is a convenience rather than the thing that makes the
registration mean something.

A profile declaring `exactlyOnceEffective` is doing something else entirely. Nothing in any document
exhibits it. No amount of reading establishes it. It is a claim about what happens when a process
dies at an inconvenient moment — which is to say, a claim about the one circumstance nobody
demonstrates on the way to shipping, and the circumstance every such claim is eventually tested by.
The asymmetry between how valuable that sentence is and how cheap it is to write is what §11.3
exists to correct.

So the two are held to different standards on purpose: a token vocabulary is registered and a runtime
guarantee is *demonstrated*, and the second is refused where the first would merely be unusual. It
also follows that declining to declare a value must cost nothing, or the rule would push in the wrong
direction — a profile whose honest answer is "we lose messages" should find saying so easier than
saying anything else, which is why §11.3's converse is deliberately not a rule and why §11.4 makes an
empty axis a statement with a reason rather than a blank.

### B.6 Why the fold refuses interference rather than ordering it

§12.2 specifies a total order over authorship ops and then declines to use it for the one case where
an order would settle everything. That looks like a gap and is the point.

The order exists so that independent work from two authors composes to one result every holder
computes identically — it is a *reconciliation* device, and stamps plus a lane tiebreak are exactly
enough for it. Two authors writing the same member to different values are not doing independent
work. Applying the order there produces a perfectly deterministic composition that neither of them
wrote, containing a decision nobody made, with a digest that reproduces on every machine forever.

A silent, reproducible wrong answer is worse than a halt, and considerably harder to notice: the
holder is not broken, the bytes are not corrupt, and every check passes. `fold-conflict` makes the
one thing a machine cannot decide arrive as a question rather than as a fact.

---

## Licence

Apache-2.0 — see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE). Copyright 2026 Diametrical Ltd.
