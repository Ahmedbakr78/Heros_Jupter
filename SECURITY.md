# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 1.1.x | ✅ |
| 1.0.x | ⚠️ upgrade recommended |
| < 1.0 | ❌ |

## Reporting a vulnerability

Please **do not** open a public issue for security bugs.

1. Contact the maintainer privately via [GitHub security advisories](https://github.com/Ahmedbakr78/Heros_Jupter/security/advisories/new) or [LinkedIn](https://www.linkedin.com/in/ahmed-abo-bakr-1b2466288/).
2. Include: description, steps to reproduce, affected version, impact.
3. Expect an acknowledgement within 7 days.

## Threat model summary

| Surface | Mitigation |
|---|---|
| Extension pages CSP | `script-src 'self'` — no remote or inline scripts |
| Python kernel | MV3 sandboxed iframe; no extension APIs, no storage, no DOM access to parent beyond `postMessage` |
| Notebook HTML outputs | Sanitized before render (scripts, event handlers, `javascript:` URLs stripped) |
| Network | Only Pyodide CDN boot fetch + explicit user-initiated `pip install` |
| Data | 100% local; no telemetry exists in the codebase |

Running a cell executes your (or the notebook author's) code inside the
sandbox — the same trust decision as running a script in a terminal.
