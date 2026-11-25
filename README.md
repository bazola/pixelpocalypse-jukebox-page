# pixelpocalypse-jukebox-page

The project site for **Pixelpocalypse Jukebox** ([pixelpocalypse-jukebox](https://github.com/bazola/pixelpocalypse-jukebox)):
type what you want and get a song played by real synth plugins, then edit every note in the browser.

Live at **https://bazola.github.io/pixelpocalypse-jukebox-page/**.

## What is here

| Path | Page | What |
|---|---|---|
| `index.html` | **Home** | What it is, how a song gets made, the six groups of features, what it needs |
| `features.html` | **Features** | Every part of the app, each with a screenshot of it at work |
| `manual.html` | **Manual** | How to use each panel, from the first prompt to the stems, and the shortcuts |
| `setup.html` | **Setup** | The README's install steps, updating, and what to do when something's wrong |
| `scripting.html` | **Scripting** | The command line, the HTTP API and the MCP server |
| `glossary.html` | **Glossary** | Audio, MIDI, plugin, mixing and AI terms in plain English, with a filter |
| `css/site.css` | — | The whole stylesheet. Dark only, on the app's own faceplate tokens |
| `img/` | — | Screenshots of the app, the favicon (the app's own icon), the social preview |
| `tools/site_server.py` | — | Serves the app on scratch copies of a few songs, for the screenshots |
| `tools/capture.cjs` | — | Re-takes the screenshots from that server |

Plain static HTML. No build step, no framework; the only scripts are the home page's level meter and the glossary's
filter, and both pages work without them. `.nojekyll` is present so GitHub Pages serves the files as they are.

The six pages share the navigation and footer by copy. Adding a page means adding one line to `.nav-links` in each.

## Keeping it true

The manual is the app's README "Using it" section, expanded and checked against the code. When a feature changes in
the app, change it here too: a page that describes a button the app no longer has is the one mistake a reader can't
catch.

## Re-taking the screenshots

From this repository, with the app's repository beside it (`../pixelpocalypse-jukebox`, or a clone from before the rename, `../super-music-sound`):

```sh
uv run --directory ../pixelpocalypse-jukebox python "$PWD/tools/site_server.py"   # the app on port 8002
node tools/capture.cjs                     # every shot
node tools/capture.cjs mixer piano         # only shots whose name contains one of these words
node tools/capture.cjs live                # generate.png and revise.png: asks your LLM, takes minutes
node tools/capture.cjs live revise         # only revise.png, of SMS_SONG (default: the newest song)
```

`site_server.py` copies the songs it names from the app's `songs/` folder into `renders/site/` in the app's repository
(the score, plan, critics' rounds, mix and stems, not the render cache) and serves those, so your own songs are only
read. Playwright comes from the app's `web/node_modules`, so this repository installs nothing. Override the paths with
`SMS_DIR` and `SMS_URL`.

**No one's own LLM setup goes on the site.** The capture answers the app's `/api/llm` with the README's Ollama example
(`qwen3:14b`), sends generate and revise requests to the server's own default model instead, and rewrites the
server's model names to the example in the jobs' progress stream. `site_server.py` does the same to the model names
recorded in the copied songs. Check a new shot for a server address or model name before committing it.

A revision can fail when the model keeps changing sections it wasn't asked to (the app rejects those answers). Set
`SMS_REVISION` to a more specific request and run `live revise` again.

## Checking the site locally

```sh
python -m http.server 8099 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8099/`. There is no build step, so what you see is what Pages serves.

## Licence

GPL-3.0, like the app — see `LICENSE`. The screenshots show third-party plugins by name; each keeps its own license,
listed in the app.
