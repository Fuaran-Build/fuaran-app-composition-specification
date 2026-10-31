# Module-authoring wire specification

**Module format 1.0.** Sections §M1–§M10 are **normative**, and §10.1 and §10.2 of
[`APP_COMPOSITION_WIRE.md`](APP_COMPOSITION_WIRE.md) bind them (§M2). Appendix M-A is not normative.

A composition says that an application has a module, how the module is reached and what facts it
writes ([`APP_COMPOSITION_WIRE.md`](APP_COMPOSITION_WIRE.md) §5.4). It says nothing about what the
module **does**: its `moduleRef` is an opaque reference, and the body it refers to is a separate tree
with its own process. This document specifies that tree — the **module document** — so a body can be
read, written, diffed, stored, cited by content address and certified by any party, exactly as a
composition can.

| | |
|---|---|
| Module format version | 1.0 |
| Profile | `module-authoring` |
| Profile version | 1.0 |
| Status | Stable |

## Shared conventions

This document is part of the app-composition specification and cites the same shared conventions,
**binding here on the same terms**: the bytes are the contract and byte-stable round-trip is the
conformance property; the canonical encoding is stated exhaustively; the corpus is the oracle;
`wire-fixtures/manifest.json` is the authoritative enumeration and counts appear nowhere else;
conformance is profile-scoped; and normative text names no implementation, product, vendor or
language. It states **no exception** to them of its own: its encoding is
[`APP_COMPOSITION_WIRE.md`](APP_COMPOSITION_WIRE.md) §4 verbatim (§M4), and that section's two
stated exceptions are therefore inherited unchanged rather than restated.

---

## §M1. Scope

### §M1.1 What this specifies

A **module document** is the authored architecture of one composed unit:

- its **identity** — the namespace its declarations live under and the platform version it is written
  against (§M5.1) — and the view its user-facing surface is written in, and the **effect ceiling** the
  unit declares;
- its **parameters** — the holes the unit is a function of (which data type it operates over, how many
  columns it renders, which endpoint it exposes, which substrate it requires, which query it
  consumes), each either open or bound to a value;
- its **handlers** — what the unit's server side does, as a closed vocabulary of cases, each carrying
  value-space parameters only (§M6);
- a reference to its **view body** by content address;
- its **declarations** — the data types it registers and the routes it claims (§M5.9, §M5.10);
- optionally its **data flow** — the input it reads and the pipeline it applies, as data (§M5.11);
- optionally its **author body** — the author-owned sources its escapes are written in, in order, and
  the packages those sources reference (§M5.12).

The unit's **signature** — what it provides a composition and what it needs from one — is not among
these, because it is never authored: it is derived from them (§M10). A module document is therefore
the whole of what a binder, a reducer and a verifier read about one unit, and nothing about the unit
is recorded beside it.

### §M1.2 What this does not specify

- **A handler's body.** A handler case names *what* it operates over, never *how*. The one case whose
  body is data names a program tree **by reference** (§M6.6) and never carries it; a body that cannot
  be modelled is an explicit escape (§M6.5). An author body (§M5.12) names the sources such a body is
  written in and never carries them: their content, their language and what compiling them means are
  the evaluator's.
- **A view body.** It is referenced by content address and carried nowhere here.
- **The value spaces a parameter is bound in**, the **token vocabularies** of an AI tool's definition
  (§M6.3), and **the effect a handler case implies**. Each is an evaluator's question at this
  revision.
- **How a module is generated, reduced or run.** That is an evaluator's, as it is for a composition.
  So is **how a data flow is evaluated**: §M5.11 states the pipeline's terms and their order, and an
  evaluator answers what running it does, exactly as §12.7 leaves evaluation to the evaluator.
- **A data flow step that joins.** §12.7's algebra carries a `join` whose source is a table written
  inline in the vector; a unit's join reads data the deployment holds, and this revision has no way to
  name that. The step is therefore not registered for a module's data flow at this revision (§M5.11).
- **A handler that receives an upload, or reads a file.** A composition may declare that a data
  source's data arrives by `upload` through a named unit's own route
  (`server-app-host` §P3.8, published where core §8.5 says). The unit's side of that route —
  taking the file, storing it and running the ingestion over it — has no handler case at this
  revision, and neither has the routine that recognises a file as one of the unit's declared types and
  reads it. A unit that serves either writes it as an escape (§M6.5). Both real modules measured
  against §M2 do exactly that.
- **Which principals a unit's routes admit.** Both real modules measured against §M2 admit the ones an
  evaluator admits by default and declare nothing. This revision has no term for another set, and a
  unit that needs one writes it in its author body (§M5.12).
- **Where a package comes from.** An author body names its packages by identity (§M5.12). Their
  version, the source an evaluator fetches each from, and the credentials such a source needs are the
  evaluator's, exactly as a package's syntax and admission are. A document that named a source would
  carry one evaluator's channel layout, and often one machine's, into a format every evaluator reads;
  and a unit's address would move when a channel did, though nothing the unit provides or needs had.

### §M1.3 Terminology

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, MAY and OPTIONAL are used as
[`APP_COMPOSITION_WIRE.md`](APP_COMPOSITION_WIRE.md) §1.3 uses them. A **reader** decodes a module
document; a **writer** encodes one; a **binder** fills a parameter.

---

## §M2. Stability, and the evidence the profile was promoted on

**This profile is stable, at 1.0.** From this revision §10.1 and §10.2 of
[`APP_COMPOSITION_WIRE.md`](APP_COMPOSITION_WIRE.md) bind it exactly as they bind the composition
format. An OPTIONAL member, a new leaf kind, or a refusal class that binds only documents carrying
something new is additive. Removing a member, kind or case, changing what an existing member means, or
making an OPTIONAL member REQUIRED is a break, and takes a new major version. An implementation
certifying against 1.0 certifies against the corpus revision it names, as it does for the
composition format. Revision 1.0 added no member, kind, case or refusal class, so **every document of
revisions 0.1 to 0.4 decodes as a 1.0 document with the same bytes and the same content address**.

**Before 1.0 the profile was a DRAFT**, in the sense §10 gives versioning: it made no stability promise,
and a member, case, ordering or refusal class could change in a later draft revision without a format
break being declared. The composition format's stability was unaffected throughout: the one composition
member this work added (`moduleRef`'s `bodyAddress`, §M7) is OPTIONAL and additive under §10.1. The
draft existed because the vocabulary was still moving. Its handler cases gained members three times in
the week before it was written, and an unstated format is worse than a draft one: it is read anyway, by
whoever has to, and differently by each.

**Revision 0.2** made the document stand alone: the root gained the unit's identity (§M5.1), the tree
gained its declarations and its data flow (§M5.9–§M5.11), and the unit's signature became a rule over
the document (§M10). Every member and kind it added is OPTIONAL or a new leaf, so **every 0.1 document
decodes as a 0.2 document with the same bytes and the same content address**. One rule it added binds
documents that already existed: a handler over a type the document does not declare is now refused
(`handler-type-undeclared`, §M8.2), because the record that used to supply the declaration is no
longer read.

**Revision 0.3** let a unit whose escapes are written as more than one source say so: the tree gained
the `authorBody` leaf (§M5.12), which names the author-owned sources in order and the packages they
reference. It is a new leaf kind and nothing else, so **every 0.2 document decodes as a 0.3 document
with the same bytes and the same content address**. Its two codec classes (`author-source-invalid`,
`author-package-invalid`, §M8.1) and its one rule (`author-body-duplicate`, §M8.2) bind only documents
that carry the leaf.

**Revision 0.4** carried a module captured from an application that already shipped it: the root
gained the unit's package identity and its registration name beside its namespace (§M5.1), a
declaration gained the statement that its type is the author body's own (§M5.9), and the author body
gained a shared tier, a client tier and the assets the client tier reads (§M5.12). Every member it
added is OPTIONAL and written only when it says something, so **every 0.3 document decodes as a 0.4
document with the same bytes and the same content address**. Its one new codec class
(`data-type-owner-unknown`, §M8.1) and the wider reach of `author-source-invalid` bind only documents
that carry the new members.

**The promotion criterion.** Promotion to 1.0 was a recorded act with one criterion, and the criterion
was checkable. The profile was to be promoted when a **real module** — one written for an application in production use, not
for this corpus — has been composed **end to end** against this document:

1. its module document is authored in this format and round-trips byte for byte through at least
   one certified implementation;
2. a composition cites it by **content address** (`bodyAddress`, §M7), and the address verifies
   against the document;
3. an evaluator reduces that composition and generates the module's handlers **from the document**
   — every handler case the module uses, with every member it uses — and the generated application
   builds and serves them;
4. every gap the exercise found has been either specified here or recorded as out of scope in §M1.2,
   so the promoted text describes a module that exists rather than one that might.

The promotion was to be a revision of this document: the DRAFT marker removed, the profile version
`1.0`, and from then on §10.1 and §10.2 binding this profile exactly as they bind the composition
format. Revision 1.0, below, is that revision.

**The criterion, measured once — and the promotion held (Phase 2370).** The first real module, an
analytics unit of an application in production use, has been composed end to end against revision
0.3. Measured step by step:

1. **Met.** Its document is authored in this format. The certified implementation decodes it and
   re-encodes the same bytes, and those bytes are the ones its content address is computed over.
2. **Met.** Its composition cites it by `bodyAddress`. The address verifies against the document,
   and a verification of the composition passes on the module's chain and capability.
3. **Met, and weakly.** An evaluator reduces the composition and generates the module from the
   document. The generated module packs, and the application builds against the package and serves
   what it served before. But **every handler case the module uses is the escape** (§M6.5): two
   handlers, both `customHandler`, written in one author body (§M5.12). The step is met for the
   vocabulary the module uses, and that vocabulary includes none of the structured cases. Nothing
   in §M6.1–§M6.4 or §M6.6 has yet been exercised by a real module.
4. **Not met.** The exercise found one gap, and the item above records it as out of scope in
   §M1.2. A second real module, captured from an application that already shipped it, found four
   more, and none is specified yet:
   - the unit's package identity, its namespace and its registration name are three different
     things, and the document carries one;
   - a declared data type may name a type the author body owns, rather than one the reduction
     mints;
   - an author body may have a client tier;
   - the packages a unit references may need sources of their own.

   §M2's own premise, that the draft exists because the vocabulary is still moving, therefore still
   holds. Promoting now would freeze a format already known to be short of a module that exists.

**So the profile stayed a DRAFT, at 0.3.** It was to be promoted when step 4 was met, which meant those
four specified or recorded as out of scope, and step 3 measured again against every real module then
under composition.

**Revision 0.4 closed step 4 for the four (Phase 2377).** Three were specified: the three identities
(§M5.1), a declaration of a type the author body owns (§M5.9), and the author body's shared and client
tiers with their assets (§M5.12). The fourth, where a package is fetched from, was recorded as out of
scope in §M1.2. It is the evaluator's, as a package's version and admission already were.

**Revision 1.0: the criterion measured again, against both real modules, and the profile promoted
(Phase 2379).** The second real module, captured from an application that already shipped it, is now
generated from its own document. Measured step by step, against the first module (above) and the
second:

1. **Met, for both.** Each document is authored in this format. The certified implementation decodes
   it and re-encodes the same bytes, and those bytes are the ones its content address is computed over.
   The first module's document has not changed since revision 0.3, so its address has not moved.
2. **Met, by the first.** Its composition still commits to its address. The second is consumed by an
   application that does not yet compose its modules, so no composition commits to its address yet. The
   criterion asks this of one real module, and the first meets it.
3. **Met, for both, and only for the escape.** For the first module the measurement above stands,
   because its bytes did not change. For the second, an evaluator generates the unit from its document,
   with the author body as the unit's own code. The generated unit packs. Its server registration
   offers what the hand-written unit it replaced offered, and a client built against the package
   compiles for both of the unit's tiers. **No real module exercises a structured handler case**, and the
   reason is the same for each handler they carry: none is a body a structured case can express.
   - Receiving a file, and recognising and reading one as a declared type (the first module's
     ingestion, the second's two file readers), has no case (§M1.2).
   - Both of the second module's model-facing tools compute their results with a numerical routine
     written in the author body. §M6.3's `executor` names a program tree, and a tool with no executor
     SHOULD be refused, so a tool whose body is code is an escape.
   - A remote interface whose routes are composed in code (the second module), and an observer that
     sets a briefing's cadence (the first), are bodies §M1.2 leaves to the evaluator.
   - A create, read, update and delete handler (§M6.1) or a transition (§M6.2) holds records whose
     shape the reduction defines. Every data type the second module declares is its author body's own
     (§M5.9), and a record-holding handler over such a type is refused. The first module declares none.

   So §M6.1 to §M6.4 and §M6.6 are specified, and certified by the corpus's vectors, but **no real
   module has exercised them at 1.0**. This revision says so, so that a reader knows which parts of
   the vocabulary were tested and which were only specified.
4. **Met.** Revision 0.4 closed the four gaps the second module found. Generating it from its document
   found no member the document lacks. Two things it found that are not members are recorded as out of
   scope in §M1.2: the file reader, and the principals a unit's routes admit. Its client registration
   is the view's, which this format cites by address (§M5.8) and does not carry. What generation
   itself required of the evaluator is the evaluator's (§M1.2).

**The profile is therefore promoted.** It was not held until a structured case had been exercised,
because no real module may need one soon, and step 3 asks for every case a module uses, not every case
the format has. A later real module that does exercise one is a measurement for the record, not a
condition of this revision.

---

## §M3. The document

### §M3.1 The module tree

A module document is a **rooted tree** of nodes with exactly the node envelope
[`APP_COMPOSITION_WIRE.md`](APP_COMPOSITION_WIRE.md) §3.1 specifies: `kind` first, the kind's own
members in declaration order, then `id`, then `children`. A reader MUST accept a node with `children`
absent and read it as a leaf; a writer MUST emit the member.

### §M3.2 Identity

`id` is an opaque, non-empty string, unique within one module document (§3.2's rule, applied to this
tree). It is the module's own identity space, separate from any composition's.

**The root's `id` names the unit itself.** It is the identity a binder checks for collision against
the units a deployment already composes, and the identity a module document is known by. Every other
node's `id` names a declaration within the unit and nothing outside it.

### §M3.3 The root, and containment

The root node MUST be a `moduleRoot` (§M5.1). **Only the root holds children**: every other kind is a
leaf, and a node of any other kind carrying a child, or a `moduleRoot` below the root, is refused
(`module-node-not-leaf`). The tree is therefore one level deep, and that is deliberate — a module's
architecture is a flat set of declarations about one unit, and nesting would invent a scope nothing
reads.

---

## §M4. Canonical encoding, and the content address

### §M4.1 The encoding

A module document is encoded **exactly** as [`APP_COMPOSITION_WIRE.md`](APP_COMPOSITION_WIRE.md) §4
encodes a composition: UTF-8 with no byte-order mark, no insignificant whitespace, no trailing
newline, declaration-order members, the §4.3 escape table, signed 32-bit integers only, and **no JSON
`true`, `false` or `null` anywhere** — a boolean-valued member is the string `"true"` or `"false"`,
and an optional member with no value is omitted. A writer that encodes compositions correctly needs
no new rule to encode a module document, and that is the reason this section restates nothing.

### §M4.2 The content address

A module document's **content address** is the SHA-256 digest of its canonical bytes, written as
**exactly 64 lower-case hexadecimal digits**. It is the address a composition cites a body by (§M7),
and because it is taken over the canonical bytes, two writers that agree on the document agree on the
address.

The address is over the bytes a writer produces, so it is stable across a round trip and moves with
any change to any member — which is the point: an address that survived an edit would not be naming
the document.

---

## §M5. The node kinds

### §M5.1 `moduleRoot` — the module

| Member | Type | Presence |
|---|---|---|
| `view` | string *(profile token)* | REQUIRED |
| `viewSpec` | citation object | OPTIONAL |
| `host` | string, module vocabulary | REQUIRED |
| `determinism` | string, module vocabulary | REQUIRED |
| `namespace` | string | OPTIONAL |
| `platformVersion` | string | OPTIONAL |
| `packageId` | string | OPTIONAL |
| `registration` | string | OPTIONAL |

`view` and `viewSpec` are exactly `moduleRef`'s (§5.4): the view technology the unit's surface is
written in, and — present when and only when the profile marks the token citation-bearing — the
revision of the view contract it was authored against (§6). A module body declares which contract its
view was written against exactly as a reference to it does.

`host` and `determinism` are the unit's **declared effect ceiling**, on two independent axes:

| `host` | Meaning |
|---|---|
| `pure` | Reaches nothing outside its inputs. |
| `readsHost` | Reads state the host holds. |
| `writesHost` | Writes state the host holds. |

`determinism` names the **set** of non-deterministic sources the unit may read, drawn from three
factors — `clock`, `random`, `network`. The empty set is spelled `deterministic`; any other set is
its factors **in the fixed order clock, random, network, joined by `+`**: `clock`, `random`,
`network`, `clock+random`, `clock+network`, `random+network`, `clock+random+network`. Those eight
labels are the whole vocabulary and each set has exactly one: `random+clock`, `clock+clock` and
`deterministic+clock` are refused, because a second spelling of one set is a second document saying
the same thing in different bytes. A `host` or `determinism` outside these vocabularies is refused
(`effect-token-unknown`).

`namespace` and `platformVersion` are the unit's **identity** beyond its `id` (§M3.2), and both are
claims the unit makes rather than choices a binder fills:

- `namespace` is the name the unit's declarations live under — the root its declared data types
  (§M5.9) and whatever an evaluator generates for the unit are named in. It is OPTIONAL because a
  module document is legitimately written before it is named; an evaluator that names generated code
  by it SHOULD refuse to reduce a document that omits it rather than invent one.
- `platformVersion` is the version of the evaluator's platform the unit is written against: the lowest
  an evaluator may reduce it onto. Its syntax and its comparison are the evaluator's (§M1.2). Absent, the
  unit makes no version claim, which is a different statement from claiming any particular version.
  It is deliberately **not** called `version`: it is a pin on what the unit runs on, not a release
  number of the unit itself, and this format carries no release number for a unit.

Both are strings, and present with any other type they are refused (`member-type-invalid`) on §M5.6's
rule. An empty string is a value, not an absence, and is carried as written.

`packageId` and `registration` (revision 0.4) name the unit's two other identities, which a unit
captured from an application that already shipped it rarely shares with its namespace:

- `packageId` is the identity the unit is **distributed** under — what a composition's application
  references to obtain it. Absent, it is the `namespace`: the single-field form, which stays correct
  for every unit whose three names coincide.
- `registration` is the name the unit **registers** under in the evaluator's platform — the key a host
  and every consumer of the unit's state address it by, which therefore cannot move without breaking
  them. Absent, it is the `namespace`, on the same default.

The defaults are a reading rule, not an encoding one: a document that omits either member and one
that states it equal to the `namespace` are different bytes with different addresses, and both are
carried as written. Both members are strings, refused with any other type (`member-type-invalid`),
and an empty string is a value. They are OPTIONAL and last, so every 0.3 document keeps its bytes and
its content address.

### §M5.2 `dataTypeParam` — which data type the unit operates over

| Member | Type | Presence |
|---|---|---|
| `bound` | string | OPTIONAL |

### §M5.3 `columnCount` — how many data columns the unit renders

| Member | Type | Presence |
|---|---|---|
| `bound` | string | OPTIONAL |

### §M5.4 `apiParam` — which endpoint the unit exposes

| Member | Type | Presence |
|---|---|---|
| `bound` | string | OPTIONAL |

### §M5.5 `substrateParam` — which substrate the unit requires

| Member | Type | Presence |
|---|---|---|
| `bound` | string | OPTIONAL |

### §M5.6 `queryTargetParam` — which query the unit consumes

| Member | Type | Presence |
|---|---|---|
| `bound` | string | OPTIONAL |

The five parameter kinds share one shape and one rule. A parameter is a **hole**: absent `bound`
means the hole is **open** — the unit is a function of it — and present `bound` means it has been
filled with that value. Absence is a posture, not a default: a reader MUST NOT substitute a value for
it. `bound` present and not a string is refused (`member-type-invalid`), on §5.4's rule that a member
of the wrong type is a broken record and must not decode as the absence it is not. A count is a
string too (`"12"`), because the format carries no number a binder did not put there, and the value
space a binding is checked against is the binder's (§M1.2).

`apiParam` is what the unit **exposes**; `queryTargetParam` is what it **consumes**. One is a
provision a composition checks against what it has already claimed, the other a need it checks
against what it provides — which is why they are two kinds and not one.

### §M5.7 `handler` — one thing the unit's server side does

| Member | Type | Presence |
|---|---|---|
| `handler` | handler object (§M6) | REQUIRED |

A handler is **not a hole**. A hole is a choice from a value space; a handler is a declaration the
unit makes about what it does. A `handler` node with no `handler` member is refused (`member-absent`):
"declares no handler" and "the handler was omitted" are different claims and only one is authored.

### §M5.8 `viewBody` — the unit's view, by content address

| Member | Type | Presence |
|---|---|---|
| `contentHash` | string | REQUIRED |

The view tree itself is a document of another specification and is never carried here. This format
places no structure on `contentHash`.

### §M5.9 `dataTypeDecl` — a data type the unit registers

| Member | Type | Presence |
|---|---|---|
| `name` | string | REQUIRED |
| `owner` | string, closed vocabulary | OPTIONAL |

The unit **declares** the data type `name`: it is the unit's own, registered by it, and what the unit
provides a composition (§M10). A declaration is **not a hole**, for §M5.7's reason: it is a statement
the unit makes, not a choice from a value space. A `dataTypeDecl` with no `name` is refused
(`member-absent`), and one whose `name` is not a string is refused (`member-type-invalid`).

A `dataTypeParam` bound to a name and a `dataTypeDecl` of the same name are different statements and
both may appear: the first says which type the unit operates over, the second that the unit registers
it. A `dataTypeParam` bound to a name **no** declaration names is a type the unit needs a composition
to supply (§M10).

`owner` (revision 0.4) says **who defines the type's shape**. Its one token is `author`: the type is
defined by the unit's author-owned sources (§M5.12), and an evaluator generates no definition for it.
Absent, the type's shape is the evaluator's to generate from the declaration, which is what every 0.3
declaration meant. The distinction is not cosmetic: a type whose records are files of the unit's own
format has its own wire shape, and a generated definition beside it would be a second, false contract
shipped with the unit. A unit captured from code that already defines its types declares each one
`author`. A record-holding handler (§M6.1, §M6.2) over an `author` type operates over a shape the
document does not describe; whether an evaluator can reduce one is that evaluator's question, not a
refusal of this format. An `owner` outside the vocabulary is refused (`data-type-owner-unknown`), and
one that is not a string is refused (`member-type-invalid`). The member derives nothing different in
the signature: an `author` type is still a type the unit provides (§M10).

### §M5.10 `routeDecl` — a route the unit claims

| Member | Type | Presence |
|---|---|---|
| `route` | string | REQUIRED |

The unit **claims** the route key `route`: a composition that already holds it has a collision, which
a binder checks rather than a reader. This format places no structure on the key. A `routeDecl` with
no `route` is refused (`member-absent`), and one whose `route` is not a string is refused
(`member-type-invalid`).

`apiParam` is a hole an endpoint is bound into; `routeDecl` is a claim the unit makes. A unit can
carry both, and they are not reconciled by a reader.

### §M5.11 `dataFlow` — the unit's data logic, as data

| Member | Type | Presence |
|---|---|---|
| `input` | array of column objects | REQUIRED |
| `pipeline` | array of step objects | REQUIRED |

A unit MAY carry its data logic as a **pipeline over an input**, so the flow it was validated as is in
the document it was validated from. A document carries **at most one** `dataFlow`; a second is refused
(`data-flow-duplicate`, §M8.2). Absent, the unit declares no data flow, which is the ordinary case.

**The terms are §12.7's**, adopted by normative reference rather than restated, so a pipeline means
the same thing in a module document as in the composition's incremental-recompute family:

- A **column object** is §12.7's table column: `name` then `type`, both REQUIRED strings, `type` one of
  `int` or `string`. `input` is the columns the pipeline reads, in the author's order.
- A **step object** is §12.7's pipeline step: `verb` first, then the verb's members in the order §12.7
  states them — `filter` (`where`), `derive` (`column`, `value`), `groupBy` (`keys`, `aggregates`, each
  aggregate `name`, `fn`, `of`), `sort` (`by`, each `column` then `direction`) and `window`
  (`partitionBy`, `orderBy`, `fn`, `of`, `as`). An **expression** is §12.7's: `expr` first, then
  `column` (`name`), `literal` (`int`) or `binary` (`op`, `left`, `right`).
- The **closed tokens** are §12.7's: a `groupBy` `fn` is `count`, `sum` or `first`; a `window` `fn` is
  `lag`; a `direction` is `ascending` or `descending`; a `binary` `op` is `greaterThan` or `multiply`.

`pipeline` is REQUIRED and `[]` is a value — a flow that reshapes nothing and still states the input it
reads. Every array carries the author's order (§4.6).

**This algebra is closed at this revision, and narrower than §12.7's by one verb.** A `verb`, an
`expr`, a column `type` or a token outside the lists above is refused (`data-flow-term-unknown`): a
reader that guessed what an unregistered step does would be inventing behaviour, which is §M6's
argument for the handler vocabulary, applied to the pipeline. `join` is §12.7's and is not registered
here (§M1.2). A later revision registers further terms additively (§M2), exactly as §12.7 grows.

A REQUIRED member missing, at any depth of the flow, is refused (`member-absent`); a member of the
wrong type is refused (`member-type-invalid`); an unknown member on a column, a step, an aggregate or
an expression is ignored on read and not re-emitted (§M6's rule, one level in).

Whether the pipeline is **consistent with its input** — every column it reads exists by then, every
type agrees — is an evaluator's check, as a legal-move table's consistency is (§M6.2). It is not a
decode question.

### §M5.12 `authorBody` — the sources the unit's escapes are written in

| Member | Type | Presence |
|---|---|---|
| `sources` | array of strings | REQUIRED |
| `shared` | array of strings | OPTIONAL |
| `client` | array of strings | OPTIONAL |
| `assets` | array of strings | OPTIONAL |
| `packages` | array of strings | REQUIRED |

A unit whose escapes (§M6.5) are written as more than one source, or whose author-owned code
references packages beyond what an evaluator emits for the document's other declarations, **declares
that body here** rather than leaving an evaluator to infer it from whatever files it finds. The body
itself stays author-owned and is never carried (§M1.2); what the document carries is the set an
evaluator compiles and resolves, so the address a composition commits to (§M7) moves when the body
gains or loses a source or a package.

- `sources` names the author-owned sources **in the order they are compiled**: a source may use only
  what precedes it. Each entry is a **relative path** in the grammar
  [`APP_COMPOSITION_WIRE.md`](APP_COMPOSITION_WIRE.md) §5.1 gives a declared project — one or more
  segments separated by `/`, no segment empty, `.` or `..`, and no `\`, `:` or control character
  anywhere — taken relative to the place an evaluator keeps the unit's author-owned sources, so an entry
  names the same file on every platform and cannot name one outside that place. Their language, their
  placement and what compiling them means are the evaluator's (§M1.2).
- `shared` (revision 0.4) names the author-owned sources that belong to **both** of the unit's
  tiers — compiled into its server side and delivered to its client side — in compile order. They
  precede the server and client sources, which may use them.
- `client` (revision 0.4) names the author-owned sources of the unit's **client** tier, in compile
  order: delivered to the client side and never compiled into the server side. A unit whose client
  tier is generated from its view declaration alone omits it.
- `assets` (revision 0.4) names the author-owned files the client tier reads that are not sources —
  images, styles — and that travel with it.
- `packages` names, by identity, the packages the body references. Their syntax, their resolution,
  their version, the source each is fetched from and whether a given evaluator admits a given package
  are the evaluator's (§M1.2); a document that names a package an evaluator does not admit is that
  evaluator's refusal, not this format's.

`sources` is the **server** tier, which is what it named before revision 0.4 gave the body other
tiers. Every entry of the four path arrays is a relative path in the grammar above, and a path is
named **once across all four**: one file is in one tier. The three OPTIONAL arrays are written only
when they name something, so an empty one is refused (`author-source-invalid`) rather than read as
absent — a writer that writes `[]` there diverges, exactly as one that omits `sources: []` does.

The body is **declared, never discovered**, on §5.1's argument for `projects`: a reader infers no
entry from any file, and an evaluator compiles no source and references no package the leaf does not
name. Both members are REQUIRED and `[]` is a value — a unit whose escapes are one source each and
which references a package declares `sources: []` — so a writer that omits an empty array diverges.
Order is significant and preserved exactly (§4.6), and nothing normalises an entry: a reader neither
re-separates, trims nor case-folds it.

An `authorBody` missing either REQUIRED member is refused (`member-absent`); a member that is not an
array, or an entry that is not a string, is refused (`member-type-invalid`). An entry of `sources`,
`shared`, `client` or `assets` outside the path grammar, or repeating an entry of any of the four
(read in that order), is refused (`author-source-invalid`), and so is a present, empty `shared`,
`client` or `assets`; a `packages` entry that
is empty or wholly whitespace, or repeating an earlier entry, is refused (`author-package-invalid`).
Repeats compare exactly. A document carries **at most one** `authorBody` (`author-body-duplicate`,
§M8.2), and whether a named source exists is not a reader's question — a document is read without the
unit's files.

The author body shapes how an evaluator **builds** the unit, not what the unit provides a composition
or needs from one: it derives no signature pair (§M10).

---

## §M6. Handler objects

A handler object is a kind-tagged object: `kind` first, then the case's members **in the order its
table states** (§4.2). It carries no `id` and no `children` — it is a member of a node, not a node.
Every member below is a string unless its table says otherwise. A REQUIRED member missing is refused
(`member-absent`); a member present with the wrong type is refused (`member-type-invalid`), at any
depth; an unknown member is ignored on read and not re-emitted (§9.3's rule, one level in). A `kind`
outside the six below is refused (`handler-kind-unknown`), unlike an unknown member — the vocabulary
is **closed**, and a reader that guessed what an unknown handler does would be inventing behaviour.

### §M6.1 `crudOverDataType` — create, read, update and delete over a data type

| Member | Type | Presence |
|---|---|---|
| `dataType` | string | REQUIRED |

### §M6.2 `stateTransition` — a guarded move of a status field

| Member | Type | Presence |
|---|---|---|
| `dataType` | string | REQUIRED |
| `field` | string | REQUIRED |
| `table` | legal-move table | OPTIONAL |

A transition on `dataType`'s `field` whose write is **conditional on the current value**. `table` is
its **closed** legal-move table: a move the table does not list is not a move. Absent, the handler
declares no table; this format reads that as a declaration with nothing behind it, and an evaluator
SHOULD refuse to reduce it rather than produce a transition that permits any move.

A **legal-move table**, members in this order:

| Member | Type | Presence |
|---|---|---|
| `states` | array of strings | REQUIRED |
| `initial` | string | REQUIRED |
| `moves` | array of move objects | REQUIRED |

and a **move**: `{ "from": string, "to": array of strings }`, both REQUIRED — the states reachable in
one step from `from`. Every array carries the author's order (§4.6). Whether the table is consistent
— `initial` among `states`, every move from and to a declared state, at most one row per `from` — is
a module rule an evaluator checks; it is not a decode question (§M8.2).

### §M6.3 `aiToolHandler` — a tool a model may call

| Member | Type | Presence |
|---|---|---|
| `tool` | string | REQUIRED |
| `definition` | tool definition | OPTIONAL |
| `executor` | string | OPTIONAL |

`tool` is the tool's name. `definition` is what a model is told about it; `executor` names the
**program tree** that runs when it is called, by the same reference a `logicTreeHandler` carries
(§M6.6) — a reference, never a body. Either absent, the handler declares a tool with nothing behind
that half of it, and an evaluator SHOULD refuse to reduce it.

A **tool definition**, members in this order:

| Member | Type | Presence |
|---|---|---|
| `description` | string | REQUIRED |
| `parameters` | array of parameter objects | REQUIRED |
| `emitsActions` | array of action objects | OPTIONAL |
| `location` | string *(evaluator token)* | REQUIRED |
| `surface` | string *(evaluator token)* | REQUIRED |
| `isLiveInterface` | boolean string | REQUIRED |
| `resultBudget` | case object | REQUIRED |
| `effects` | array of case objects | OPTIONAL |
| `reads` | array of edge objects | OPTIONAL |

A **parameter**: `name`, `type`, `description` (strings, REQUIRED), `required` (boolean string,
REQUIRED), `default` (string, OPTIONAL). An **action**: `moduleId`, `actionKey`, `description`
(strings, REQUIRED), `payloadSchema` (string, OPTIONAL). A **case object** names one case of an
evaluator's closed union: `case` (string, REQUIRED) and `argument` (string, OPTIONAL — present exactly
when the case takes one).

The two boolean-valued members ride as the strings `"true"` / `"false"` and in no other spelling
(`boolean-spelling-invalid`), as every boolean in this family does (§4.5).

`emitsActions` and `effects` are OPTIONAL and **an empty array is a value, not an absence**: a tool
that declares it performs no effects has said something a tool that declares nothing about its
effects has not, and an evaluator holding a tool to its declared effects can hold only the first. So
`[]` is admitted and is not the same document as the member omitted — the one place in this family
an empty array is meaningful, and stated here so a writer does not "normalise" it away. `reads` is
OPTIONAL on the same terms.

An **edge**: `module` then `entity` (strings, REQUIRED) — the `id` of a composition's `moduleRef` and the
`name` of an entity that unit owns. `reads` lists the owned entities the tool reads, so a composition can
refuse the one edge that would carry a record to a model rather than only the unit's boundary. It is
checked where a composition and this document meet, by the composing profile's rules for a surface's
edges (for `server-app-host`, its §P4.42–§P4.44, which hold a model-facing tool to the edge rules every
other surface meets); a reader decoding this document alone reads it and checks nothing about it. An
evaluator carries no read scope on the tool from it: the edge is the composition's to check.

The definition's tokens — `location`, `surface`, `resultBudget`'s and `effects`' cases — are an
**evaluator's** vocabulary and are opaque strings at this revision (§M1.2).

### §M6.4 `notificationEmit` — a notification on the composition's channel

| Member | Type | Presence |
|---|---|---|
| `topic` | string | REQUIRED |

### §M6.5 `customHandler` — the explicit escape

| Member | Type | Presence |
|---|---|---|
| `note` | string | REQUIRED |

A handler the vocabulary cannot express, described in prose. Nothing can see inside it, so a reader
MUST NOT derive anything about what it does from the document, and the escape is the case a module
reaches for **only** when no other fits. It is superseded in that role by §M6.6, and kept because
removing it would strand the genuinely unmodellable body.

### §M6.6 `logicTreeHandler` — a handler whose body is a program tree

| Member | Type | Presence |
|---|---|---|
| `ref` | string | REQUIRED |

The handler's body is a **program tree named by reference** — the same reference form the reserved
`fuaran.program/logic-tree` declaration carries at the composition's boundary
([`APP_COMPOSITION_WIRE.md`](APP_COMPOSITION_WIRE.md) §7.4). The tree belongs to another
specification and is never carried here; a slot admitting an inline body would make this format a
second home of a format it does not own.

---

## §M7. Citing a module from a composition

A composition names a unit with a `moduleRef` (§5.4). Since this document's first revision that node
carries an OPTIONAL member, `bodyAddress`: the **content address** (§M4.2) of the module document that is the unit's
body. Present, it **commits** the composition to those bytes — a composition, and anything that
attests a composition, then reaches what the unit does and not merely that it exists.

- **Absent is valid.** A composition that commits to no body bytes is the ordinary case and every
  composition written before the member existed is one. The member is OPTIONAL under §10.1 and is
  not required at any revision of format version 1: requiring it would make every existing
  conforming composition non-conforming, which §10.2 calls a break.
- **Present, it is validated.** A `bodyAddress` that is not a string is refused
  (`member-type-invalid`); a string that is not exactly 64 lower-case hexadecimal digits is refused
  (`body-address-malformed`). Upper case is refused rather than folded: two spellings of one address
  would be two composition documents saying one thing in different bytes.
- **Present, it is checked against the body.** Wherever a composition and the module documents it
  references meet — at reduction, or at verification — a module document presented as the body of a
  reference whose `bodyAddress` it does not hash to is refused (`body-address-mismatched`). A reader
  decoding one composition cannot reach this rule, because it needs the other document; that is why
  it is a module rule rather than a codec class (§M8.2).

The corpus carries the relationship as data: the composition vector `node/module-ref-body-address`
cites a module vector of this profile by its content address, and the gate recomputes the address
from that vector's bytes.

---

## §M8. Refusals

A reader that refuses a module document refuses it **whole**, and names the class — §9's rules,
applied to this document.

### §M8.1 Codec classes

These a reader decoding one module document owes, and the corpus carries a vector for each.

| Class | Condition | § |
|---|---|---|
| `document-malformed` | Not well-formed JSON, or not an object. | §M4 |
| `node-kind-unknown` | A node `kind` this format does not define. | §M5 |
| `node-kind-absent` | A node object with no `kind` member. | §M3.1 |
| `node-id-absent` | A node with no `id`, or an empty one. | §M3.2 |
| `member-absent` | A REQUIRED member missing, on a node or at any depth of a handler. | §M5, §M6 |
| `member-type-invalid` | A member present with the wrong type, at any depth. | §M5, §M6 |
| `boolean-spelling-invalid` | A boolean-valued member spelled any way but `"true"` / `"false"`. | §M6.3 |
| `effect-token-unknown` | A `host` or `determinism` outside §M5.1's vocabularies. | §M5.1 |
| `handler-kind-unknown` | A handler `kind` outside §M6's six. | §M6 |
| `citation-incomplete` | A `viewSpec` missing `spec` or `version`. | §M5.1, §6.2 |
| `data-flow-term-unknown` | A data flow `verb`, `expr`, column `type` or token outside §M5.11's closed lists. | §M5.11 |
| `data-type-owner-unknown` | A `dataTypeDecl` `owner` outside §M5.9's vocabulary. | §M5.9 |
| `author-source-invalid` | An `authorBody` path outside the relative-path grammar, repeating an earlier path of any of its four path arrays, or an OPTIONAL path array present and empty. | §M5.12 |
| `author-package-invalid` | An `authorBody` package that is empty or wholly whitespace, or repeating an earlier package. | §M5.12 |
| `token-unregistered` | A `view` token the profile does not register. | §M5.1, §M9 |

`token-unregistered` is a profile class and its vector is marked so; every other class above is a
decode question.

### §M8.2 Module rules

These need the whole tree, another document or an evaluator's vocabulary, so no single-document
decode path reaches them. Each is recorded in `manifest.json` with the reason it carries no vector,
on §9's terms: openly outstanding rather than silently absent.

| Class | Condition | § |
|---|---|---|
| `root-kind-invalid` | A module document whose root is not a `moduleRoot`. | §M3.3 |
| `node-id-duplicate` | Two nodes sharing an `id`. | §M3.2 |
| `module-node-not-leaf` | A node other than the root carrying a child. | §M3.3 |
| `body-address-mismatched` | A module document presented as a body its reference's `bodyAddress` does not name. | §M7 |
| `data-flow-duplicate` | A module document carrying more than one `dataFlow`. | §M5.11 |
| `handler-type-undeclared` | A `crudOverDataType` or `stateTransition` handler whose `dataType` no `dataTypeDecl` in the document declares. | §M5.9, §M6 |
| `author-body-duplicate` | A module document carrying more than one `authorBody`. | §M5.12 |

`handler-type-undeclared` is the rule that makes a module document stand alone. A handler that stores
or moves a record of a type operates over that type's records, and the document is where the unit says
which types are its own; a handler over a type the document does not declare would have the reducer
consult some record kept beside the document, and there is no such record. The rule binds only the two
cases that hold records — a tool, a notification, an escape and a program reference name no data type
of the unit's.

The consistency of a legal-move table (§M6.2) and of a data flow with its input (§M5.11), and the resolution of an `executor` or `ref` to a
program tree (§M6.3, §M6.6) are evaluator checks at this revision, not refusal classes: a refusal
class is a promise every reader keeps, and those two are not yet that. No real module measured
against §M2 exercised either, so making them classes waits on one that does; doing so later is
additive only for a document that carries something new (§M2).

---

## §M9. The `module-authoring` profile

The profile is the **conformance scope** of this document — what an implementation certifying a
module codec claims. It is a **document profile**, not an evaluator profile: it registers no placement
and declares no runtime facet (§11), and an implementation claiming it says how it reads and writes
module documents, not how it runs them.

- **Its families** are `module-document` and `module-handler` (round-trip vectors), `module-reject`
  (one reject vector per §M8.1 class) and `module-accept` (what a reader must not refuse), enumerated
  in `manifest.json` under the profile's name.
- **Its one profile-token slot is `view`**, and it registers **no vocabulary of its own** for it: it
  adopts `server-app-host`'s `moduleRef.view` vocabulary — the tokens and which of them are
  citation-bearing (its §P2.4, published where core §8.5 says) — by normative reference, so a module
  body and the reference to it range over one set. Its machine-readable rendering is
  `profiles/module-authoring/registry.json`, which records the reference rather than a copy.
- **It is versioned on its own**, at the version the table at the head of this document states, and
  since 1.0 that version carries §10.1 and §10.2's promise (§M2).

---

## §M10. The signature a module document derives

A unit's **signature** is what it provides a composition and what it needs from one, as two sets of
`(kind, key)` pairs. **It is derived from the module document and is never authored**: a format that
let a unit state its signature beside the declarations it is derived from would admit a document whose
two statements disagree, and a binder would then have to choose which to believe.

The signature of a module document is exactly:

- **provides** — a `dataType` pair for the `name` of every `dataTypeDecl`, and a `route` pair for the
  `route` of every `routeDecl`;
- **needs** — a `substrate` pair for the `bound` value of every bound `substrateParam`, a `queryTarget`
  pair for the `bound` value of every bound `queryTargetParam`, and a `dataType` pair for the `bound`
  value of every bound `dataTypeParam` whose value **no** `dataTypeDecl` declares.

Each is a **set**: a pair appears once however many nodes derive it, and the order of the nodes that
derive it does not change it. An open parameter derives nothing — a hole is not yet a need. A type the
unit declares is never a need, because a composition cannot be asked to supply what the unit supplies.
Nothing else in the document derives a pair: a handler, the view, the effect ceiling, the data flow
and the author body shape what the unit does, and are read from the document by whoever needs them rather than restated as
signature entries.

An implementation MAY render the kinds in its own vocabulary; what it MUST NOT do is derive a different
set, or accept a signature that was not derived.

---

## Appendix M-A — Rationale *(non-normative)*

**Why a sibling document and not a section of the composition specification.** The two documents
had different stability: the composition format was at version 1 with §10's promises, and this one
was a draft. Putting a draft inside a stable document would have left a reader to work out, section by
section, which promises applied. Both are now stable, and the documents stay separate because they
are versioned separately (§M9).

**Why the composition cites by content address rather than by id alone.** An id says *which* unit;
only an address says *which bytes*. An attestation over a composition that cited bodies by id would
attest that a unit of that name exists, and the unit's behaviour could change under it without the
attested document moving. That is the gap the `bodyAddress` member closes, and it is OPTIONAL rather
than required for exactly one reason: requiring it is a format break, and a break is taken at a major
version or not at all.

**Why identity, declarations and the data flow sit in the one document, under the one root.** Draft
0.1 specified the body and nothing else: a unit's namespace, its declared types and routes, its platform
pin and its data flow were kept beside the document by whoever held it, so the document could not be
reduced, committed to by address or certified on its own. Two shapes could close that. One adds a
second root kind — a "module" envelope holding identity and declarations around a body tree. It was not
taken: a second root kind is a second document type, with its own address, its own codec classes and a
question this format would then owe an answer to (which of the two does a composition cite?). Widening
the one root by two OPTIONAL members, and the one tree by three leaf kinds in the shape every other
declaration already has, changes no existing document's bytes and leaves one document, one address and
one answer.

**Why the author body is declared in the document, and not beside it.** An evaluator that reduces a
module document writes files that name the body — the list of what it compiles, the packages it pins —
and a reduction is only reproducible if those files are a function of what it read. Reading the body's
shape from a directory listing would make the reduction a function of whatever happened to be on disk,
and keeping it in a second record beside the document would reopen the gap revision 0.2 closed. The
leaf names sources and packages, never their content, so the format still says nothing about what an
escape does (§M6.5); and because it is one leaf in the one tree, a unit that declares no author body
keeps its bytes and its address.

**Why the identities, the owner and the tiers are members, and the package sources are not.** Revision
0.4 was written from a unit that already shipped, and every member it added is something an evaluator
could not reproduce that unit without: the identity its consumers reference, the name its state is
keyed by, the knowledge that its types are its own, and which of its sources run where. Each changes
what the unit IS, so each belongs under the address. Where a package is fetched from changes nothing
the unit is — the same identities at the same versions from a different channel are the same unit —
and channels are an evaluator's and often one machine's, so they stay out (§M1.2). The defaults keep
the single-field and single-tier forms correct, which is why no 0.3 document changes.

**Why the handler vocabulary is closed.** A handler case is a commitment every reader must honour, and
an open vocabulary would let a writer emit a case no reader can interpret — which a reader would then
have to guess at or drop, and both are worse than refusing. The escape (§M6.5) and the program-tree
reference (§M6.6) are how a module says something the closed cases cannot, without the vocabulary
growing to say it.

## Licence

Apache-2.0. See `LICENSE` and `NOTICE`.
