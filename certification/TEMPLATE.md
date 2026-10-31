# Certification report — template

**Template version 1.** Non-normative. Copy everything below the rule, fill it in, publish it beside
the implementation it describes.

**What moves this number.** Adding, removing or re-meaning a section a report must carry moves the
template version; wording that changes no section does not. A report states the template version it
was written to, so a reader knows which sections to expect and can tell an absent section from one
that did not exist yet — the same argument core §11.4 makes about an absent axis.

**Three rules the shape enforces, none of them optional:**

1. **Every verdict is three-valued** — `met`, `refuted`, `not-run` — and **not-run is never met**
   ([`../CONFORMANCE_LADDER.md`](../CONFORMANCE_LADDER.md) §L7). A verifier that reported an unrun
   obligation as satisfied would turn the ladder into decoration: every claim would verify, and the
   sentence worth the most would be the cheapest one to produce.
2. **Every claim carries the revision it was met at.** A verdict that does not say which revision is a
   verdict about nothing.
3. **A vector that does not pass is a named limit, not an omission.** It is listed with its class and
   its consequence. An omission and a pass are indistinguishable from outside, which is why the
   executed-count line exists.

---

# Certification report — `<subject>`

**A claim, published with its evidence.** Nobody audited this run; the specification family maintains
no certified-implementations registry. What makes it worth reading is that every line is falsifiable
against a corpus anyone can check out.

| | |
|---|---|
| **Subject** | `<name>` — one sentence on what it does with a composition. |
| **Subject revision** | `<commit / version / build>` |
| **Certified on** | `<date>` |
| **Report template** | version 1 |
| **Runbook** | version `<n>` |

## Pins

| Artefact | Value |
|---|---|
| Specification | `app-composition-wire`, format version `<n>` |
| Conformance profile | `<core, or a profile id>`, profile version `<n, or n/a for core>` |
| Ladder | version `<n>` |
| Corpus commit | `<short sha>` |
| Corpus manifest digest | `<sha256, lower-case>` |

The digest is the operative pin — it moves whenever anything in the corpus moves. The commit is
expected to lag it, because a commit editing only prose changes nothing certified against.

## The claim

- **Rungs, as claimed:** `<as written>`
- **Effective claim (closed under the prerequisite relation, §L4):** `<computed>`
- **Conformance profile:** `<profile>`
- **Facet claim:** `<values, per axis — or "none, on every axis">`

_(One paragraph: what this implementation is, and what it does not attempt. A scope stated positively
— "reads and reduces; renders nothing; federates with nobody" — is worth more than a list of
absences.)_

## Per-rung verdicts

| Rung | Cited specification @ revision | Corpus families run | Executed | Verdict |
|---|---|---|---|---|
| `composition` | `app-composition-wire@<n>` | `<families, from the profile partition>` | `<n>` | `<met / refuted / not-run>` |
| `<rung>` | `<spec@revision, verbatim from §L3>` | `<external: that specification's own manifest>` | `<n>` | `<…>` |

Rungs not claimed are omitted rather than listed as failures — not claiming is a posture, not a gap
(§L5.2).

## Per-family verdicts

| Family | Kind(s) | Enumerated | Executed | Passed | Verdict |
|---|---|---|---|---|---|
| `document` | round-trip | `<n>` | `<n>` | `<n>` | `<…>` |
| `node` | round-trip | | | | |
| `citation` | round-trip | | | | |
| `extension` | round-trip | | | | |
| `accept` | accept | | | | |
| `reject` | reject | | | | |
| `<profile family>` | round-trip, reject | | | | |
| **Total** | | `<n>` | `<n>` | `<n>` | |

**Executed must equal enumerated** for the claimed scope. Passed may be lower; the difference is
itemised under named limits.

## Harness obligations

| Obligation | Evidence |
|---|---|
| Executed count equals the manifest's enumeration for this scope | `<asserted where — name the check>` |
| A mutated document makes the harness go red | `<the mutation used, and where it is asserted>` |

The mutation is performed in memory. A self-test that edited the checkout is one interrupted run away
from leaving the corpus broken.

## Declared vs certified facets

| Axis | Profile declares | Subject claims | Demonstrating vector(s) | Verdict |
|---|---|---|---|---|
| `delivery` | `<from the profile's declaration>` | `<subset, or none>` | `<vector ids, or —>` | `<met / not-run / n/a>` |
| `idempotency` | | | | |
| `restart` | | | | |
| `convergence` | | | | |
| `attestation` | | | | |

**Every registered axis appears, including the ones claimed empty.** Empty-with-a-reason and absent
are different, and only one of them is something somebody wrote (core §11.4).

_(Where the subject honours a value its profile does not declare, say so here, and say what the honest
resolution is — registering a profile of its own, per core §8. Do not claim it: a value outside the
profile's declaration is not available to claim, and claiming it anyway is the shape core §11.3
refuses.)_

## Named limits

Vectors in scope this subject does not pass. Each one stands: the corpus is the oracle and no
implementation's behaviour is.

| Vector | Class | What happens instead | Consequence |
|---|---|---|---|
| `<id>` | `<class the manifest names>` | `<observed behaviour, precisely>` | `<what a document exercising it does here>` |

_(If there are none, say "none" — an empty section and an omitted one are not the same.)_

## Verdict

**`<met / refuted / not-run>` at `<rung set>`, profile `<profile>`, against corpus `<digest>`.**

_(Two or three sentences. What this does say. What it does not say — a certification is a claim about
obligations met, never a licence to behave in any particular way, and never a statement about anything
outside the profile and the rungs named above.)_

---

## Licence

Apache-2.0 — see [`../LICENSE`](../LICENSE) and [`../NOTICE`](../NOTICE). Copyright 2026 Diametrical Ltd.
