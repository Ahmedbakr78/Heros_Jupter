# Support

## Get help

| Channel | Use for |
|---|---|
| [GitHub Issues](https://github.com/Ahmedbakr78/Heros_Jupter/issues) | Bugs, reproducible problems, feature requests |
| [Discussions](https://github.com/Ahmedbakr78/Heros_Jupter/discussions) | Questions, show-and-tell, tips |
| [`README.md` FAQ](./README.md#faq--30-questions) | 30 answered questions |
| [`SECURITY.md`](./SECURITY.md) | Vulnerability reports (private) |

## Before filing a bug

1. Reload the extension and confirm the version reads **1.1.0** (or newer).
2. Check the FAQ — kernel boot, pip and offline behavior are covered there.
3. Try a clean profile / incognito with only this extension enabled.
4. Collect: browser + version, OS, notebook sample (or a minimal cell), console log (`F12`).

## Common quick fixes

| Symptom | Fix |
|---|---|
| Kernel never boots | Check network once (Pyodide CDN); press retry; disable strict blocking extensions |
| `pip install` fails | Some wheels are not available in Pyodide — try a pure-Python alternative |
| Extension icon missing | Pin it from the puzzle menu |
| `file://` notebooks won't open | Details → **Allow access to file URLs** |
| Old UI after update | Reload ↻ on the extension card |

## Maintainer

[Ahmed ABOBAKR (Ahmedbakr78)](https://github.com/Ahmedbakr78) — free-time project, be patient and kind.
