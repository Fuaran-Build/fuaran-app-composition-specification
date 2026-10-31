# Security Policy

## Supported versions

The specification and its conformance corpus are pre-1.0 as a project, whatever the format version
says. Fixes are applied to the latest revision on the `main` branch; older snapshots are not
maintained.

## Reporting a vulnerability

Please report suspected vulnerabilities privately — do **not** open a public issue.

- **Preferred:** GitHub's private vulnerability reporting (the repository's **Security** tab →
  **Report a vulnerability**).
- **Or email:** andrew@fuaran.com — include a description, the affected section or vector, and steps
  to reproduce.

We aim to acknowledge a report within five business days and to agree a disclosure timeline with you.
Please allow a reasonable window to ship a fix before any public disclosure.

## Scope

This repository is a **specification and a corpus of test vectors**. It executes nothing in
production and holds no credential, so the interesting failures here are failures of the *text*, and
they are in scope precisely because they propagate into every implementation that reads it:

- **A rule that does not determine the bytes.** Two conformant writers producing different bytes from
  the same composition is a specification defect, not an implementation bug. §4 exists to make that
  impossible, and a case where it does not is a finding — the sharpest instance being anything that
  makes member order ambiguous, since a stored content address over a composition is only as stable as
  the ordering rule.

- **A refusal a conformant reader can skip.** The `reject` vectors state what a reader must turn
  away, and each names the layer that owes the refusal. A malformed document the normative text does
  not require refusing — or requires refusing only by implication — is in scope. So is a refusal
  stated in a way that lets a reader satisfy it by failing for an unrelated reason.

- **A silent inversion.** The format's one boolean-valued member rides as a string (§4.5), so a
  tolerant reader that matches the string and falls through to a default decodes a JSON `true` as
  **false** — the opposite of what the document says, with nothing anywhere reporting it. Any other
  path by which a document decodes to a meaning its author did not write is the same class and is in
  scope.

- **An extension that can claim more than its declaration allows.** §7's opaqueness rests on a
  declaration stating the only fields there are, so that everything else is refused as undeclared
  without anyone enumerating what is forbidden. A path by which an undeclared claim is honoured —
  an inline body, an evaluation hint, a semantics tag — defeats the mechanism for every extension,
  including the ones nobody has thought of yet.

- **A profile that reaches past its boundary.** §2.3 forbids a profile from changing the canonical
  encoding, re-shaping a core member, weakening a core refusal, or registering a vocabulary for a
  slot the core states opaque. A profile that can do any of those is describing a different format
  under this one's name.

- **A vector whose digest does not match its file**, or a manifest enumeration that omits a vector
  present in the tree. Both make a conformance claim mean less than it appears to, and the second is
  invisible from inside any emitter.

Out of scope: the behaviour of any particular implementation, which belongs with that
implementation's own security policy.
