# Contributing to Heros NoteBook

Thanks for wanting to make Heros NoteBook better. It is a zero-dependency, vanilla-JS project — contributions stay that way.

## Ground rules

1. **Zero runtime dependencies.** No npm packages, no bundlers, no frameworks. Plain files the browser loads.
2. **Design system.** UI follows the Heros system: floating cards, pill toolbars, dark + light tokens, accent variables in CSS custom properties.
3. **Privacy first.** No telemetry, no remote code (except the kernel's own one-time Pyodide fetch), no accounts.
4. **Manual test everything.** There is no CI test suite yet — describe exactly what you ran.

## Workflow

```mermaid
flowchart LR
    F[Fork + clone] --> B[Branch]
    B --> C[Code]
    C --> T[Test manually]
    T --> D[Update CHANGELOG]
    D --> E[Bump manifest version]
    E --> P[Open PR]
    P --> R[Review + merge]
```

1. Fork and clone.
2. Branch: `feat/your-feature` or `fix/your-bug`.
3. Load the repo folder as an unpacked extension while you develop (`chrome://extensions` → Developer mode → Load unpacked).
4. Code — match the existing style (clear names, small functions, no clever obfuscation).
5. Test manually at minimum:
   - Open a real `.ipynb`, run 3 cells (code + markdown + error cell).
   - Search (`Ctrl+F`), export `.md` and `.ipynb`.
   - Toggle dark/light and one accent.
   - Popup + context-menu open paths.
6. Update `CHANGELOG.md` under an `Unreleased` heading.
7. User-facing changes: bump `version` in `manifest.json`.
8. Open a PR using the template. Screenshots/GIFs welcome for UI changes.

## What belongs here

- Bug fixes, performance, accessibility, docs, tests (when they arrive)
- Pyodide/kernel bridge improvements that keep the sandbox boundary intact
- Export format fidelity (`.ipynb` round-trip is sacred)

## What does not belong

- Telemetry, accounts, cloud sync services
- Binary blobs or vendored frameworks
- Changes that weaken MV3 CSP or the sandbox isolation

## Commits

- Conventional-ish: `feat:`, `fix:`, `docs:`, `perf:`, `refactor:`
- One logical change per commit

## Code of conduct

By participating you agree to the [Contributor Covenant](./CODE_OF_CONDUCT.md).
