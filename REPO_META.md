# REPO_META — GitHub About, topics, website, release setup for Heros NoteBook

Copy-paste source of truth. Nothing here is code; it configures the GitHub page.

## 1. Repository

| Field | Value |
|---|---|
| Owner | `Ahmedbakr78` |
| Name | `Heros_Jupter` |
| URL | `https://github.com/Ahmedbakr78/Heros_Jupter` |
| Visibility | Public |
| License | MIT (`LICENSE`) |
| Default branch | `main` |
| Website (Pages) | `https://ahmedbakr78.github.io/Heros_Jupter/` |
| Load-unpacked folder | repository root (contains `manifest.json`) |

## 2. About box (GitHub Settings page: description + website)

**Description (paste exactly, no emojis, 1 line):**

```text
Heros NoteBook — open, read, run, edit and export .ipynb notebooks in your browser. Real Python via Pyodide sandbox, builder studio, variable inspector. 100% local, free and unlimited.
```

**Website (paste exactly):**

```text
https://ahmedbakr78.github.io/Heros_Jupter/
```

Check: `Include in the home page` ON for the website.

## 3. Topics (paste, comma-separated — max 20)

```text
jupyter, ipynb, notebook, python, pyodide, chrome-extension, manifest-v3, offline-first, privacy, free, markdown, matplotlib, data-science, dark-mode, wasm, study-tools, open-source, side-panel, vscode-jupyter, javascript
```

Apply via CLI:

```bash
gh repo edit Ahmedbakr78/Heros_Jupter \
  --add-topic jupyter --add-topic ipynb --add-topic notebook \
  --add-topic python --add-topic pyodide --add-topic chrome-extension \
  --add-topic manifest-v3 --add-topic offline-first --add-topic privacy \
  --add-topic free --add-topic markdown --add-topic matplotlib \
  --add-topic data-science --add-topic dark-mode --add-topic wasm \
  --add-topic study-tools --add-topic open-source --add-topic side-panel \
  --add-topic vscode-jupyter --add-topic javascript
```

## 4. Website (GitHub Pages from `docs/`)

```bash
# Settings → Pages → Deploy from branch → main → /docs → Save
# Wait ~1 min → https://ahmedbakr78.github.io/Heros_Jupter/
```

## 5. Social preview

Upload `docs/assets/icons/logo.png` (128px) or render a banner from it:
**Settings → General → Social preview → Upload an image.**

## 6. Release v1.1.0

| Field | Value |
|---|---|
| Tag | `v1.1.0` |
| Title | `v1.1.0 — MAX update: 160 tools, builder studio, data power` |
| Asset | `heros-notebook-v1.1.0.zip` |

Release notes source: [`.github/RELEASE_v1.1.0.md`](./.github/RELEASE_v1.1.0.md).

```bash
gh release create v1.1.0 heros-notebook-v1.1.0.zip \
  --title "v1.1.0 — MAX update: 160 tools, builder studio, data power" \
  --notes-file .github/RELEASE_v1.1.0.md
```

## 7. Repo settings checklist

- [x] Description + website in About
- [x] 20 topics
- [x] Pages from `main` + `/docs`
- [x] Issues enabled (templates in `.github/ISSUE_TEMPLATE/`)
- [x] Discussions optional
- [x] MIT `LICENSE`
- [x] No secrets, no personal files in the tree
- [x] Release `v1.1.0` with zip asset
