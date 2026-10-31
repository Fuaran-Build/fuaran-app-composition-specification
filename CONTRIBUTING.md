# Contributing

Thanks for your interest. This repository is a specification, an evaluator profile and their
executable conformance corpus, so contributing here is a slightly unusual activity: **the round-trip
vectors are generated, never hand-edited**, and the normative text, the profile, the schemas and the
vectors move together or not at all.

## Developer Certificate of Origin

Contributions are accepted under the [Developer Certificate of Origin](https://developercertificate.org/).
Sign off each commit with `git commit -s`, which appends a `Signed-off-by:` trailer.

## The forward-coupling rule

A change to any specified member, ordering, encoding, refusal class or derived value updates **every
one** of the following in the same change-set (§10.4):

1. the normative text in `APP_COMPOSITION_WIRE.md`;
2. the affected profile document, where a profile is affected;
3. the schemas under `schemas/v1/` and the profile registry under `profiles/`;
4. the resident emitter in `wire-fixtures/emit.mjs`;
5. the vectors and digests in `wire-fixtures/manifest.json`;
6. **the codec of every implementation that certifies against the corpus.**

The sixth is the one most often left out and the one that makes the other five mean something.

A change to a **facet axis**, a family's vector shape or a family's pass criteria (§11, §12)
additionally updates every affected facet declaration and every vector in the affected family, in the
same change-set. A discriminator that moved leaves every claim decided by it undecided — and the
claims decided by it are the runtime guarantees, which are the ones a reader is least able to check
for themselves.

Run the gate before you open a pull request:

```powershell
pwsh ./run.ps1
```

## Which change belongs where — core, or profile?

This is the question worth getting right before writing anything, and the test is short:

- **Can the thing be stated without naming any evaluator?** Then it is the core's. A shape, a member,
  an encoding rule, a refusal a decoder owes.
- **Does its meaning come from which admissible values one evaluator's surface happens to have?**
  Then it is a profile's, even if the name reads perfectly neutral. That is the usual case for a
  token vocabulary, and a name that reads neutral while its admissible values are read off one
  surface is exactly the mistake this split exists to prevent.

A change that would put an evaluator's vocabulary into the core is not a small liberty — it makes the
format that evaluator's, which inverts the direction the whole arrangement carries.

## Five things that are easy to get wrong

**Do not hand-edit a round-trip fixture.** A fixture's bytes *are* the wire document and the manifest
records a digest of the file itself. Editing one by hand and updating its digest to match produces a
corpus that is internally consistent and no longer describes what any emitter emits. Change the
emitter, then `pwsh ./run.ps1 -Write`, then read the diff.

**Do not add a reject or accept vector to the resident emitter.** Reject vectors are documents a
reader must refuse; reproducing their bytes demonstrates nothing about the refusal. Accept vectors
are deliberately *not* what a writer produces, which is the whole of what they test. Both are
hand-authored, and `check-manifest.mjs` is what holds them to the tree. **Facet-family vectors are
the exception in both directions** — every one of them is emitted, reject vectors included, because a
facet reject vector is a well-formed scenario whose required outcome is a refusal rather than a
malformed document.

**Do not declare a facet value without a vector that demonstrates it** (§11.3). The gate refuses it
as `facet-undemonstrated`, and that refusal is the point rather than an obstacle: the runtime
guarantees are the claims a reader cannot check by reading anything, so they are the ones this home
declines to take on assertion. Where the honest answer is that an evaluator does not provide a value,
leaving it out of the declaration **is** the answer — §11.3's converse is deliberately not a rule, so
declining costs nothing.

**Do not sort object members.** Member order is declaration order at every depth (§4.2), and the
reason is in Appendix B.2: sorting makes canonical bytes unstable under an additive member, and a
composition's bytes are what stored content addresses fold. This is the divergence from RFC 8785 that
matters most, and the one a JSON library will silently reintroduce.

**Do not emit an absent optional as `null` or `""`.** Omission is the rule (§4.5), and it is what
makes an additive member invisible to every composition that does not carry one.

## Adding a vocabulary

Prefer an **extension** (§7) over a new node kind. An extension is namespaced, declared, opaque and
carried by readers that do not know it; a node kind is refused by every reader that does not know it,
correctly (§8.3, Appendix B.3). If the shape must survive readers who have not adopted it, it is an
extension.

Prefer **registering a token** in a profile over adding one to a core vocabulary. The core's three
closed vocabularies — surface kinds and authorisation kinds — are closed because each names something
external to every evaluator, and narrowing or widening one is a breaking change (§10.2).

## Proposing a change to the normative text

Open an issue first. A specification change is a change to every implementation that reads it, so the
useful question is not "should the format allow this" but "what does a conformant reader do with a
document that predates the change" — say what you expect that to be, and the discussion will be much
shorter.

## Reporting a vulnerability

See [SECURITY.md](SECURITY.md) — please do not open a public issue for one.
