#Requires -Version 7.0
<#
.SYNOPSIS
    The gate for the app-composition specification home.

.DESCRIPTION
    Three checks, in order, each answering a question the others cannot —
    and then a proof that each of them can actually fail.

      1. The resident emitter reproduces every round-trip document byte
         for byte from unsorted, undecorated input models. This is the
         specification checking that its own text still determines the
         bytes. A divergence is a specification defect by definition.

      2. The manifest still describes the tree it sits in: every
         enumerated vector present, every present file enumerated, every
         digest matching its file, every reject vector naming a class and
         a detection layer, every accept vector naming an interpretation.
         The emitter cannot see this class — it only ever looks at
         vectors the manifest already lists, so a fixture the manifest
         forgot is invisible to it and to every implementation certifying
         against it.

      3. The artefacts still agree with each other: the normative text,
         the profile documents, the conformance ladder, the profile
         registries, the node schema and the manifest carry the same facts
         in several renderings, and each is a place they can drift while all
         of them stay internally perfect. This step also enforces two of the
         ladder's own rules, which no single rendering can show: a
         registered rung that obliges nothing, and a reserved rung that
         obliges something, are both claims resting on nothing.

      4. Every runtime-semantics claim is demonstrated. A profile declares
         which facet values its evaluators honour; this certifies each
         declared value against a passing vector in a registered family,
         recomputing every derived outcome from the vector's own content
         rather than reading the outcome it records. A declaration with
         no passing run is refused. This is the check that stops the most
         valuable sentence a specification can carry from also being the
         cheapest one to write.

      5. All four go RED. A conformance gate is exactly the kind of code
         that passes by doing nothing, so each check is run once against a
         deliberately perturbed copy and required to fail. The
         perturbation happens in a temporary directory; the committed
         tree is never modified.

    Everything runs on Node's standard library alone. There is no build
    step, no package manager, and nothing to install beyond Node itself.

.PARAMETER Write
    Rewrite the round-trip vectors from the resident emitter and refresh
    the manifest's derived digests. Use after a deliberate specification
    change, then re-run WITHOUT this switch: verification recomputes
    everything independently, so a rewrite is never self-certifying. Read
    the diff before committing — a rewrite that moves bytes you did not
    intend to move is the thing this switch is capable of hiding.
#>
[CmdletBinding()]
param(
    [switch] $SkipEmitter,
    [switch] $SkipManifest,
    [switch] $SkipAgreement,
    [switch] $SkipFacets,
    [switch] $SkipSelfTest,
    [switch] $Write
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Invoke-Node {
    # node.exe is a real executable, not one of the PowerShell shims that
    # rebuild argv from the caller's command-line text — but resolve it
    # explicitly anyway so the gate does not depend on which of several
    # installations happens to win on PATH.
    [CmdletBinding()]
    param([Parameter(ValueFromRemainingArguments = $true)] $Arguments)
    $cmd = Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1
    & $cmd.Source @Arguments
}

$fixtures = Join-Path $PSScriptRoot "wire-fixtures"
$failed = @()

function Step($name, [scriptblock] $body) {
    Write-Host ""
    Write-Host "== $name" -ForegroundColor Cyan
    & $body
    if ($LASTEXITCODE -ne 0) {
        $script:failed += $name
        Write-Host "   FAILED (exit $LASTEXITCODE)" -ForegroundColor Red
    }
}

if ($Write) {
    Write-Host "`n== rewriting the round-trip vectors from the resident emitter" -ForegroundColor Yellow
    Invoke-Node (Join-Path $fixtures "emit.mjs") "--write"
    Write-Host "Review the diff, then re-run without -Write." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

if (-not $SkipEmitter) {
    Step "resident emitter: byte comparison" { Invoke-Node (Join-Path $fixtures "emit.mjs") }
    Step "resident emitter: internal assertions" { Invoke-Node (Join-Path $fixtures "emit.mjs") "--self-test" }
}
if (-not $SkipManifest) {
    Step "manifest invariants" { Invoke-Node (Join-Path $fixtures "check-manifest.mjs") }
}
if (-not $SkipAgreement) {
    Step "cross-artefact agreement" { Invoke-Node (Join-Path $fixtures "check-cross-artefact.mjs") }
}
if (-not $SkipFacets) {
    Step "facet certification" { Invoke-Node (Join-Path $fixtures "check-facets.mjs") }
}

if (-not $SkipSelfTest) {
    # Each perturbation targets what its checker is FOR, so a self-test
    # passing means that checker's actual purpose is live — not merely
    # that it runs.
    #
    #   emitter          — a fixture's bytes change, so the reproduction diverges.
    #   manifest         — a fixture is removed from the tree while still enumerated.
    #   cross-artefact   — a placement's registry claims the kind of a vocabulary profile.
    #   ladder           — a REGISTERED rung's obligation set is emptied, so it
    #                      obliges nothing while reading perfectly; and a rung is
    #                      registered as data that no document names.
    #   facets           — the profile OVER-CLAIMS a runtime guarantee; a vector's
    #                      derived outcome is edited; a reject vector is made to no
    #                      longer exhibit the thing it exists to falsify; a lapsed
    #                      quote is moved back inside its own window, which breaks
    #                      both that vector and the pair its partner rests on; a
    #                      recompute vector records a result no evaluation produces,
    #                      or a footprint claiming work it did not do; and a
    #                      row-local vector is left with no re-addressed partner.
    #
    # Counts are deliberately not written above: a number in a comment
    # drifts from the list beside it, and the list cannot.
    #
    # They all work on a scratch copy of the whole home, because the
    # third and fourth checkers read the documents beside the corpus. A
    # self-test that edited the committed tree would be one interrupted
    # run away from leaving the repository broken.
    $selfTests = @(
        @{
            Name    = "emitter goes red on an altered fixture"
            Script  = "wire-fixtures/emit.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "wire-fixtures/document/minimal.json"
                $bytes = [IO.File]::ReadAllBytes($target)
                # Flip one byte INSIDE the document rather than appending:
                # an append could be mistaken for the trailing-newline check.
                $bytes[$bytes.Length - 3] = $bytes[$bytes.Length - 3] -bxor 0x01
                [IO.File]::WriteAllBytes($target, $bytes)
            }
        },
        @{
            Name    = "manifest check goes red on a vector missing from the tree"
            Script  = "wire-fixtures/check-manifest.mjs"
            Perturb = { param($dir) Remove-Item (Join-Path $dir "wire-fixtures/reject/citation-incomplete.json") -Force }
        },
        @{
            Name    = "agreement check goes red on a placement registry that disagrees with section 8.5's kind"
            Script  = "wire-fixtures/check-cross-artefact.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "profiles/edge-worker-host/registry.json"
                $text = [IO.File]::ReadAllText($target)
                $text = $text.Replace('"kind": "placement"', '"kind": "vocabulary"')
                [IO.File]::WriteAllText($target, $text)
            }
        },
        @{
            # MODULE_AUTHORING_WIRE.md — the module document's round-trip
            # vectors are triangulated by the same emitter, so an altered
            # module vector must diverge exactly as an altered composition does.
            Name    = "emitter goes red on an altered module vector"
            Script  = "wire-fixtures/emit.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "wire-fixtures/module-handler/crud-over-data-type.json"
                $bytes = [IO.File]::ReadAllBytes($target)
                $bytes[$bytes.Length - 3] = $bytes[$bytes.Length - 3] -bxor 0x01
                [IO.File]::WriteAllBytes($target, $bytes)
            }
        },
        @{
            # The handler vocabulary is CLOSED (section M6), so a case the
            # registry carries and the text does not specify is a claim
            # resting on nothing — the module rendering of the registry
            # probe above.
            Name    = "agreement check goes red on a handler case the module text does not specify"
            Script  = "wire-fixtures/check-cross-artefact.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "profiles/module-authoring/registry.json"
                $text = [IO.File]::ReadAllText($target)
                $text = $text.Replace('"logicTreeHandler"' + "`n" + '  ]', '"logicTreeHandler",' + "`n" + '    "jobHandler"' + "`n" + '  ]')
                [IO.File]::WriteAllText($target, $text)
            }
        },
        @{
            # THE COMMITTED BODY THAT MOVED (section M7). Edit the module
            # document a composition vector cites by content address and the
            # address must stop naming anything this corpus carries — the
            # agreement check recomputes it rather than reading it, which is
            # what makes the pair evidence and not two strings that agree.
            Name    = "agreement check goes red on a committed body address the cited module no longer hashes to"
            Script  = "wire-fixtures/check-cross-artefact.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "wire-fixtures/module-document/cited-view-composed-effect.json"
                $text = [IO.File]::ReadAllText($target)
                $text = $text.Replace('"clock+network"', '"clock+random+network"')
                [IO.File]::WriteAllText($target, $text)
            }
        },
        @{
            # THE OVER-CLAIM. A profile declares the strongest sentence on
            # the delivery axis, which nothing in the corpus demonstrates for
            # it — and which its own declaration says it may not claim. This is the failure the whole facet layer exists to produce,
            # and a green run here would mean a specification that accepts
            # runtime guarantees on assertion.
            Name    = "facet certification goes red on a declared value nothing demonstrates"
            Script  = "wire-fixtures/check-facets.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "wire-fixtures/manifest.json"
                $m = Get-Content $target -Raw | ConvertFrom-Json
                $m.facetDeclarations.'edge-worker-host'.delivery.honoured =
                    @($m.facetDeclarations.'edge-worker-host'.delivery.honoured) + "exactlyOnceEffective"
                $m | ConvertTo-Json -Depth 100 | Set-Content $target -NoNewline
            }
        },
        @{
            # THE SECOND PROFILE'S OVER-CLAIM. The probe above proves the rule
            # bites for `edge-worker-host`; it says nothing about a profile
            # registered later, and a demonstrability rule that had quietly
            # stopped quantifying over new profiles would look exactly like
            # this one. `convergentFold` is chosen deliberately: it IS
            # demonstrated in this corpus, for `core`, so the perturbation is
            # the realistic mistake — reading a passing vector as evidence for
            # whoever declares the value, rather than for the profile the
            # vector is scoped to.
            Name    = "facet certification goes red on a SECOND profile's undemonstrated value"
            Script  = "wire-fixtures/check-facets.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "wire-fixtures/manifest.json"
                $m = Get-Content $target -Raw | ConvertFrom-Json
                $m.facetDeclarations.'durable-session-host'.convergence.honoured =
                    @($m.facetDeclarations.'durable-session-host'.convergence.honoured) + "convergentFold"
                $m | ConvertTo-Json -Depth 100 | Set-Content $target -NoNewline
            }
        },
        @{
            # The family is RUN, not merely listed. The effect ledger is a
            # derived member, so editing it must be caught by the independent
            # recomputation — otherwise the certification is a presence check
            # wearing the clothes of a conformance run.
            Name    = "facet certification goes red on an edited effect ledger"
            Script  = "wire-fixtures/check-facets.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "wire-fixtures/kill-and-replay/lost-in-flight.json"
                $text = [IO.File]::ReadAllText($target)
                $text = $text.Replace('"invocations":1,"delivered":0', '"invocations":1,"delivered":1')
                [IO.File]::WriteAllText($target, $text)
            }
        },
        @{
            # A reject vector that no longer exhibits what it falsifies is the
            # worst kind of green: an implementation passes it by refusing a
            # scenario that was fine. Make the conflicting lanes agree and the
            # vector must stop being accepted as a conflict falsifier.
            Name    = "facet certification goes red on a conflict vector whose lanes no longer conflict"
            Script  = "wire-fixtures/check-facets.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "wire-fixtures/partition-and-fold/reject-conflicting-write.json"
                $text = [IO.File]::ReadAllText($target)
                $text = $text.Replace('"value":"WorkerOnly"', '"value":"WebOnly"')
                [IO.File]::WriteAllText($target, $text)
            }
        },
        @{
            # THE HALF-DEMONSTRATED VALUE. `convergentFold` is two claims in
            # one word (§11.1), and the per-vector discriminator is satisfied
            # by either half alone — so a profile carrying only folding
            # vectors would certify a holder that folds correctly and
            # resolves interference by taking the later stamp, which is
            # exactly what the second half exists to refuse. The
            # perturbation re-scopes the conflict vector to another profile
            # that already demonstrates the value, so nothing is malformed
            # and no other check has anything to say: the corpus still holds
            # a passing conflict vector, just not in the scope that needs
            # one. That is the realistic mistake rather than a mangled file.
            Name    = "facet certification goes red on a profile demonstrating only HALF of convergentFold"
            Script  = "wire-fixtures/check-facets.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "wire-fixtures/manifest.json"
                $m = Get-Content $target -Raw | ConvertFrom-Json
                ($m.vectors | Where-Object { $_.id -eq "partition-and-fold/local-first-reject-conflicting-write" }).profile =
                    "core"
                $m | ConvertTo-Json -Depth 100 | Set-Content $target -NoNewline
            }
        },
        @{
            # THE LAPSED WINDOW. Move the stale vector's observation back
            # inside the window it is supposed to be outside of, and it stops
            # exhibiting the fault it exists to falsify — an implementation
            # would then pass it by refusing a quote that was perfectly
            # current. It also breaks the pair the in-window vector depends
            # on, which is the point: a window nothing checks is a window
            # nobody has to honour.
            Name    = "facet certification goes red on a stale-quote vector that is no longer stale"
            Script  = "wire-fixtures/check-facets.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "wire-fixtures/attestation-quote/reject-stale-quote.json"
                $text = [IO.File]::ReadAllText($target)
                $text = $text.Replace('"observedAt":1787007200', '"observedAt":1787000000')
                [IO.File]::WriteAllText($target, $text)
            }
        },
        @{
            # THE UNDECLARED EGRESS THAT IS NO LONGER UNDECLARED. Give the
            # silent-egress vector the route it exists to lack and it stops
            # exhibiting the fault it falsifies — an implementation would
            # then pass it by refusing a crossing somebody had authorised.
            # It also breaks BOTH pairs at once, which is the point: that one
            # vector is the control for the routed vector (same placement,
            # route removed) and for the sealed vector (same flows, one site
            # moved across a border), so a corpus that let it heal would be
            # certifying two locality claims with nothing behind either.
            Name    = "facet certification goes red on an egress vector that is no longer undeclared"
            Script  = "wire-fixtures/check-facets.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "wire-fixtures/placement-locality/edge-reject-undeclared-egress.json"
                $text = [IO.File]::ReadAllText($target)
                $text = $text.Replace('"routes":[]',
                    '"routes":[{"id":"uk-to-eu-west","from":"uk","to":"eu-west","basis":"added by the self-test"}]')
                [IO.File]::WriteAllText($target, $text)
            }
        },
        @{
            # THE ROUTE THAT POINTS THE OTHER WAY. Reverse the admitted pair
            # in the ROUTED vector and the crossing it was carrying is no
            # longer admitted — so a checker that matched an unordered pair
            # would stay green here, and permission to receive would silently
            # become permission to send. This is the probe for the half of
            # `regionRouted` that §11.1 states as load-bearing.
            Name    = "facet certification goes red on a route admitting the reverse direction"
            Script  = "wire-fixtures/check-facets.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "wire-fixtures/placement-locality/edge-routed-across-boundary.json"
                $text = [IO.File]::ReadAllText($target)
                $text = $text.Replace('"from":"uk","to":"eu-west"', '"from":"eu-west","to":"uk"')
                [IO.File]::WriteAllText($target, $text)
            }
        },
        @{
            # THE SEALED CLAIM WITH NOTHING BEHIND IT. Move a site in the
            # SEALED vector's placement and its own content stops exhibiting
            # the value it declares, while the document still records
            # `sealed`. An evaluator that never resolves a region at all
            # answers sealed and is right every time it is asked; this is the
            # perturbation that separates it from one that resolves.
            Name    = "facet certification goes red on a sealed vector whose sites are not all in one region"
            Script  = "wire-fixtures/check-facets.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "wire-fixtures/placement-locality/edge-sealed-in-region.json"
                $text = [IO.File]::ReadAllText($target)
                $text = $text.Replace('{"site":"site-b","region":"eu-west"}', '{"site":"site-b","region":"uk"}')
                [IO.File]::WriteAllText($target, $text)
            }
        },
        @{
            # THE DELIBERATELY WRONG ANSWER. Section 12.7 makes the result a
            # pass criterion with no allowance, so the corpus has to be able to
            # tell that a recorded result is not the one a full evaluation
            # produces. Change one derived cell: an implementation graded
            # against a result nobody evaluated is graded against nothing.
            Name    = "facet certification goes red on a recompute vector recording a result no evaluation produces"
            Script  = "wire-fixtures/check-facets.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "wire-fixtures/incremental-recompute/point-edit-row-local.json"
                $text = [IO.File]::ReadAllText($target)
                $text = $text.Replace(
                    '{"string":"r4"},{"int":9},{"int":1},{"int":18}',
                    '{"string":"r4"},{"int":9},{"int":1},{"int":2}')
                [IO.File]::WriteAllText($target, $text)
            }
        },
        @{
            # THE FOOTPRINT THAT CLAIMS WORK IT DID NOT DO. The counts are the
            # comparative half of this family, so they are the half a corpus
            # could most easily record by typing rather than by evaluating.
            # Move the group count and the re-derivation must disagree with it.
            Name    = "facet certification goes red on a recompute vector whose footprint claims work it did not do"
            Script  = "wire-fixtures/check-facets.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "wire-fixtures/incremental-recompute/chain-edit-group-local.json"
                $text = [IO.File]::ReadAllText($target)
                $text = $text.Replace(
                    '"rowsEvaluated":2,"groupsRecomputed":2',
                    '"rowsEvaluated":2,"groupsRecomputed":3')
                [IO.File]::WriteAllText($target, $text)
            }
        },
        @{
            # THE ROW-LOCAL CLAIM WITH NO CONTROL BEHIND IT. Rename the
            # composition in the row-local vector and it is no longer a
            # perturbation of the ordinal one, so the pair section 12.7 states
            # over the profile's scope silently stops existing. Nothing else
            # moves — the composition is carried by these vectors and evaluated
            # by nothing — which is what makes this the probe for the pair rule
            # itself rather than for the evaluation beside it.
            Name    = "facet certification goes red on a row-local vector with no re-addressed partner"
            Script  = "wire-fixtures/check-facets.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "wire-fixtures/incremental-recompute/point-edit-row-local.json"
                $text = [IO.File]::ReadAllText($target)
                $text = $text.Replace(
                    '"id":"regional-order-rollup-analytics"',
                    '"id":"regional-order-rollup-analytics-two"')
                [IO.File]::WriteAllText($target, $text)
            }
        },
        @{
            # THE LADDER'S OWN RULE, not an agreement between renderings.
            # Empty a REGISTERED rung's obligation set and it becomes a claim
            # anybody can make for free — the shape section 11.3 refuses one
            # layer down. Both documents still read perfectly, which is why
            # this is the probe worth having.
            Name    = "ladder check goes red on a registered rung that obliges nothing"
            Script  = "wire-fixtures/check-cross-artefact.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "wire-fixtures/manifest.json"
                $m = Get-Content $target -Raw | ConvertFrom-Json
                $m.stackRungs.'composition+ui'.obligations = @()
                $m | ConvertTo-Json -Depth 100 | Set-Content $target -NoNewline
            }
        },
        @{
            # The agreement half: a rung registered as data and named in no
            # document. A ladder whose renderings could drift would let a
            # claim be discharged against obligations nobody published.
            Name    = "ladder check goes red on a rung the ladder document does not name"
            Script  = "wire-fixtures/check-cross-artefact.mjs"
            Perturb = {
                param($dir)
                $target = Join-Path $dir "wire-fixtures/manifest.json"
                $m = Get-Content $target -Raw | ConvertFrom-Json
                $added = [pscustomobject]@{
                    extends     = "composition"
                    status      = "registered"
                    obligations = @([pscustomobject]@{
                            citedSpecification = "some-other-wire"
                            version            = "1"
                            corpusFamilies     = "external: whatever that specification's own manifest scopes"
                        })
                }
                $m.stackRungs | Add-Member -NotePropertyName "composition+telemetry" -NotePropertyValue $added
                $m | ConvertTo-Json -Depth 100 | Set-Content $target -NoNewline
            }
        }
    )

    foreach ($t in $selfTests) {
        Write-Host ""
        Write-Host "== self-test: $($t.Name)" -ForegroundColor Cyan
        $scratch = Join-Path ([IO.Path]::GetTempPath()) ("appcompspec-selftest-" + [Guid]::NewGuid().ToString("N"))
        try {
            New-Item -ItemType Directory -Path $scratch -Force | Out-Null
            foreach ($item in Get-ChildItem $PSScriptRoot -Force | Where-Object { $_.Name -ne ".git" }) {
                Copy-Item $item.FullName (Join-Path $scratch $item.Name) -Recurse -Force
            }
            & $t.Perturb $scratch
            $out = Invoke-Node (Join-Path $scratch $t.Script) 2>&1
            $code = $LASTEXITCODE
            if ($code -eq 0) {
                $script:failed += "self-test: $($t.Name)"
                Write-Host "   the perturbed home PASSED — this checker cannot fail, so its green means nothing" -ForegroundColor Red
                $out | ForEach-Object { Write-Host "   | $_" }
            }
            else {
                Write-Host "   went red as required (exit $code)" -ForegroundColor Green
            }
        }
        finally {
            if (Test-Path $scratch) { Remove-Item $scratch -Recurse -Force -ErrorAction SilentlyContinue }
        }
    }
}

Write-Host ""
if ($failed.Count -gt 0) {
    Write-Host "FAILED: $($failed -join '; ')" -ForegroundColor Red
    exit 1
}
Write-Host "All checks passed." -ForegroundColor Green
exit 0
