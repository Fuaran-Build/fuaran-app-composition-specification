# Certification runbook

**Runbook version 1.** Non-normative. This document is a **procedure**, not a specification: it tells
you the order to do things in and hands you the commands, and every rule it relies on is stated
somewhere else and cited here rather than restated. Where this document and a normative one disagree,
the normative one is right and this is a defect.

It exists because the obligations are stated across several documents — the format's conformance
profiles, a profile's own registrations, the runtime facets, the fixture families, the ladder — and a
first-time certifier has to assemble them in a particular order to avoid doing work that a later step
invalidates. That order is the content here.

**What it does not do.** It specifies no verifier, registers nothing, and confers no status. Nobody
audits your run and no registry records it; a certification is a **claim you publish with the evidence
attached**, and the report is that evidence. The specification family maintains no
certified-implementations registry, deliberately.

**Read alongside:**
[`TEMPLATE.md`](TEMPLATE.md) (the artefact you produce) and
[`WORKED_EXAMPLE.md`](WORKED_EXAMPLE.md) (all seven steps carried out end to end against a real
implementation, including the two places it does not come out clean).

## What you need

- **Node.js** (standard library only — nothing to install) and **PowerShell 7**, for the corpus's own
  gate and for the queries below. Neither is a requirement on your implementation; they are how *this
  checkout* verifies itself.
- A **checkout of this specification home**, at the revision you intend to certify against.
- **Your own harness**, in your own language, which is the part nobody can write for you: something
  that feeds a vector to your implementation and compares what comes back. It is usually smaller than
  expected — the worked example's is a few hundred lines of test code.

Every command below runs from the **root of this checkout** and is written to survive both a
PowerShell and a POSIX shell unchanged: the Node programs are single-quoted, use double quotes
internally, and contain no `$`.

---

## Step 1 — Check out the corpus, and verify it before you certify against it

```powershell
pwsh ./run.ps1
```

Green means the corpus you are about to be judged by is internally consistent: an independent emitter
reproduces the round-trip documents byte for byte, the manifest still describes the tree it sits in,
the documents agree with each other, every declared runtime guarantee resolves to a passing vector,
and each of those checks has been shown to go red on a perturbed copy.

**Do not skip this because it is somebody else's gate.** You are about to spend real effort matching
bytes; a corpus that does not verify is not an oracle, and finding that out afterwards is expensive.
It also takes under a minute and needs no build step.

Now record what you are certifying **against**, because a verdict that does not say so is a verdict
about nothing:

```powershell
git rev-parse --short HEAD
(Get-FileHash wire-fixtures/manifest.json -Algorithm SHA256).Hash.ToLowerInvariant()
```

The manifest is the corpus's own enumeration — every vector with its own digest — so a digest over it
moves whenever anything in the corpus moves, which makes it the cheapest thing to pin against
(`wire-fixtures/README.md`, "Certifying", step 5). **Lower-case it**: `Get-FileHash` returns
upper-case hex and every digest recorded in this corpus is lower-case, so a pin that compares them as
strings will disagree with itself.

The commit and the digest answer different questions and you want both. The commit says which revision
a human reviewed. The digest says whether the checkout in front of you is still that one — and it is
expected to **lag** the head, because a commit that edits only prose moves the head and changes nothing
you certify against.

---

## Step 2 — Choose your rungs

A **rung** is a claim about which *other* specifications you meet alongside this one
([`../CONFORMANCE_LADDER.md`](../CONFORMANCE_LADDER.md) §L2). List them:

```powershell
node -e 'const m = JSON.parse(require("node:fs").readFileSync("wire-fixtures/manifest.json", "utf8")); Object.entries(m.stackRungs).forEach(([rung, r]) => console.log(rung.padEnd(24), r.status.padEnd(11), (r.extends ? "above " + r.extends : "the floor").padEnd(20), r.obligations.map(o => o.citedSpecification + "@" + o.version).join(", ") || "(nothing)"))'
```

Three things decide your answer, and all three are commonly got wrong on a first attempt:

1. **The floor is a complete answer.** An implementation that reads, stores, diffs, transports or
   reduces a composition without rendering a view, reaching another deployment or carrying a logic
   vocabulary claims `composition` and **owes nothing above it** (§L3.1). That is not a partial
   result to be apologised for; it is the ordinary case, and the ladder exists so it can be said
   positively rather than as a list of what you lack.
2. **A claim is a set, closed downwards** (§L4). Naming `composition+ui` also names `composition`,
   computed rather than written, so you cannot be wrong about your own floor. Claim what you will
   run, not what you aspire to: the rungs above the floor are **independent**, not a progression, so
   claiming one you do not exercise buys you nothing.
3. **A reserved rung must not be claimed** (§L6). It obliges nothing, so a claim to it is
   unfalsifiable — and it is refused rather than believed. The listing above marks them.

A rung above the floor is discharged **entirely in the cited specification's own repository**, against
that specification's own manifest (§L3.4). Nothing here tells you what those obligations are, and if
you find yourself reading this document to discover them, you are reading the wrong one.

---

## Step 3 — Choose your conformance profile

Different partition, different question: a rung is a claim about several documents, a **conformance
profile** is a claim about the obligations inside *this* one (core §2, and §L0's table if the three
notions are still running together).

```powershell
node -e 'const m = JSON.parse(require("node:fs").readFileSync("wire-fixtures/manifest.json", "utf8")); Object.entries(m.profiles).forEach(([p, fams]) => console.log(p.padEnd(20), (m.profileVersions[p] ? "v" + m.profileVersions[p] : "(this document)").padEnd(18), fams.join(", ")))'
```

- **`core`** if you read, write, store, diff or transport compositions. You treat every
  profile-registered token as an opaque string and **must not refuse an unrecognised one** (core §2.1).
- **An evaluator profile** if you are going to *build* the composition: you additionally owe that
  profile's token vocabularies, its profile-only node kinds and its composition rules (core §2.2).

**Claim the smaller one if you are unsure.** An implementation that reads compositions written for an
evaluator profile without implementing its rules claims `core`, and that claim is honest and useful
(core Appendix B.4). A profile claim you cannot discharge is worse than a narrower one you can.

Two traps worth naming before you commit to an answer:

- **A closed-sum-type implementation cannot be a pure `core` reader on a token slot.** If your
  language models the token spaces as closed variants, an unregistered token has no case to decode
  into and is refused *before* any profile rule is consulted — which is strictly **more** than `core`
  obliges and is not something you chose. That is not a failure, and it is not a profile claim either;
  it is an unevenness, and the honest thing is to report it as one (the worked example does).
- **"Conformant to this specification" is not a claim.** It does not say which of the two obligation
  sets was met (core §2.2). Every artefact you publish names the profile, and an evaluator profile's
  claim additionally names the **profile version**.

---

## Step 4 — Enumerate your scope

Your scope is decided by the manifest's `profiles` partition and by nothing else — not by the
directory listing, and not by what looks relevant.

```powershell
node -e 'const m = JSON.parse(require("node:fs").readFileSync("wire-fixtures/manifest.json", "utf8")), p = "core", f = new Set(m.profiles[p]), s = m.vectors.filter(v => f.has(v.family)); s.forEach(v => console.log(v.kind.padEnd(11), (v.detect || "-").padEnd(9), v.id)); console.log("scope", p, "=", s.length, "vectors")'
```

Change `p = "core"` to the profile you chose in step 3.

**The facet families are NOT in this scope, and that is the single most likely way to waste a day.**
They live in a separate partition (`facetProfiles`), for the reason core §11.2 gives: a facet claim is
not part of anybody's decode obligations, so folding those families into this partition would widen
what every conformant reader must do. Their vectors are **scenarios, not documents a reader decodes**
(core §12) — feed one to your decoder and it will fail, correctly, and tell you nothing. Step 6 is
where they belong.

Write the number down. You will assert against it in step 5.

---

## Step 5 — Run the decode-scope families

For every vector in the scope you just enumerated, do what its `kind` says. The four kinds are
`round-trip`, `hash`, `reject` and `accept`, and **what each one obliges is stated once**, in
[`../wire-fixtures/README.md`](../wire-fixtures/README.md) ("Certifying", step 2), together with the
rule that a `reject` vector must be refused **for the class the manifest names** and the meaning of
each `detect` layer (core §12.4). It is not repeated here, for the reason §L3.4 gives about
restatement: a second copy on a different release schedule is wrong the first time the two disagree,
and wrong in the copy that has no way to notice.

Then discharge the **two obligations that fall on your harness rather than on your implementation**
(§L3.1), because a conformance suite is exactly the kind of code that passes by doing nothing:

1. **The count you executed equals the count the manifest enumerates for your scope.** Not "all the
   ones I ran passed" — a green run that exercised nothing is indistinguishable from a green run that
   exercised everything. Assert the equality in the harness, so it fails when a filter silently stops
   matching.
2. **Prove at least once that a mutated document makes you go red.** Perturb a vector **in memory**,
   never on disk: a self-test that edited the checkout is one interrupted run away from leaving the
   corpus broken. Record which mutation you used — the report has a line for it.

**A vector you do not pass is recorded, never dropped.** The corpus is the oracle and no
implementation's behaviour is, so a vector that fails stands and goes in the report as a **named
limit** with its class and its consequence. Write it as an assertion on the *current* behaviour where
you can, so that closing the gap arrives as a failing test somebody has to decide about rather than as
a silent improvement. A vector quietly omitted from the run is indistinguishable from one that passed,
which is the whole reason the count obligation exists.

---

## Step 6 — Declare your facets, then run the families that demonstrate them

**Do this after step 3, never before, because your profile bounds what you may claim.** An
implementation's facet claim names values **from within its profile's declaration** (core §11.2), so
the set you can claim is fixed by an answer you gave two steps ago.

```powershell
node -e 'const m = JSON.parse(require("node:fs").readFileSync("wire-fixtures/manifest.json", "utf8")), p = "core"; Object.entries(m.facetDeclarations[p]).forEach(([axis, d]) => console.log(axis.padEnd(12), d.honoured.length ? d.honoured.join(", ") : "(none) — " + d.note))'
```

Compare it against what your implementation actually does, honestly and per value (core §11.2 is per
value, never per axis). Three outcomes, and each has one correct response:

- **You honour a value your profile declares.** Claim it, and run a vector demonstrating it (below).
- **You honour fewer values than your profile declares.** Entirely normal and needs no explanation. A
  profile declares what an implementation of it **may** claim, not what every one of them does.
- **You honour a value your profile does NOT declare.** This is the interesting one, and the answer is
  *not* to claim it anyway. You are describing an evaluator of a different family, and the mechanism
  for that is to **register your own profile** (core §8), with its own facet declaration carrying
  **every** registered axis — empty-with-a-reason where you provide nothing (core §11.4), because an
  absent axis is indistinguishable from a forgotten one. Until such a profile exists, the honest
  position is to claim nothing on that axis and say why in the report.

Claiming **nothing** is a complete answer. A value you do not claim is a statement rather than a gap
(core §11.3): declining to claim costs nothing, and claiming costs a vector.

For each value you do claim, find the vectors that demonstrate it for your profile:

```powershell
node -e 'const fs = require("node:fs"), m = JSON.parse(fs.readFileSync("wire-fixtures/manifest.json", "utf8")), p = "core", fams = new Set(m.facetProfiles[p]); m.vectors.filter(v => fams.has(v.family) && v.profile === p).forEach(v => { const d = JSON.parse(fs.readFileSync("wire-fixtures/" + v.file, "utf8")).demonstrates || []; console.log(v.kind.padEnd(10), v.id.padEnd(46), d.map(x => x.axis + "=" + x.value).join(", ")); })'
```

**Both filters are load-bearing.** `facetProfiles` decides which families are in scope; the manifest
entry's own `profile` member decides which profile a vector demonstrates *for*. One family can be in
scope for two profiles while its individual vectors demonstrate for one or the other — so a query that
used only the family scope would credit you with a demonstration that was never about you. And the
values themselves are read from the **vector document's** `demonstrates` member, not from the manifest
entry.

Then run them. A declared value with no passing run **refuses the certification** — the outcome is
`facet-undemonstrated` (core §11.3), and it is an outcome of a certification rather than a refusal of a
document. Note what some of these vectors are: a family's control is often a **pair** (two arrival
orders folding to one digest; the same quote observed inside and outside its window), and passing one
of a pair alone demonstrates nothing, because an implementation that ignores the property reproduces
that half perfectly.

---

## Step 7 — Produce the report

Fill in [`TEMPLATE.md`](TEMPLATE.md). Two rules about the verdicts carry most of the
value:

- **Every pin the template asks for is a pin somebody downstream needs**: format version, profile and
  its version, ladder version, corpus commit and manifest digest. A verdict that does not say which
  revision was met is a verdict about nothing (§L7).
- **A rung whose obligations were not run reports as the middle value of three — neither met nor
  refuted — and never as met** (§L7). This is the rule that stops the ladder from becoming decoration:
  if an unrun obligation reported as satisfied, every claim would verify and the sentence worth the
  most would be the cheapest one to produce.

Publish it beside your implementation, at the revision it describes. It is the whole of the claim.

---

## Pitfalls, in the order they usually bite

Collected from carrying this out rather than from imagining it. The first four are ordering mistakes —
they cost work already done, which is why the steps are numbered.

1. **Computing your facet claim before choosing your profile** (step 6 before step 3). The profile
   bounds the claim, so an honest inventory of what your runtime does can turn out to be unclaimable
   under the profile you then pick, and the answer is a new profile rather than a smaller conscience.
2. **Running the facet families as decode vectors** (a step-4 scope taken from the directory listing
   rather than from `profiles`). They are scenarios; your decoder will refuse them and be right to.
3. **Certifying against an unverified corpus** — skipping step 1 because the gate belongs to somebody
   else.
4. **Pinning the head instead of the manifest digest.** The head moves when prose moves. The digest
   moves when the thing you are judged by moves.
5. **Upper-case digests.** `Get-FileHash` returns them; this corpus records lower-case.
6. **Sorted members.** A JSON library that sorts keys, or preserves insertion order only by accident,
   produces non-canonical bytes that decode perfectly. It is the first item in the specification's own
   implementer checklist (Appendix A) for a reason.
7. **Passing a `reject` vector for the wrong reason.** A refusal for another class is not a pass — it
   lets an implementation certify by being broken in a convenient way.
8. **Refusing what you must not refuse.** A `core` implementation must not refuse a `detect: profile`
   vector: it has no basis for the check, and refusing anyway is claiming a profile it has not
   implemented.
9. **Dropping a vector you fail.** Record it as a named limit. An omission and a pass look identical
   from outside.

## Licence

Apache-2.0 — see [`../LICENSE`](../LICENSE) and [`../NOTICE`](../NOTICE). Copyright 2026 Diametrical Ltd.
