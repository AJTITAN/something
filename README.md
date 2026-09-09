# Engineering Journey — 3-month training OS

A single-file, offline-capable planner for a 12-week full-stack + AI engineering push.
84 days of sequenced curriculum, dependency-aware rescheduling, holiday/backlog shifting,
spaced revision, two portfolio projects, weekly reviews and skill scoring.

## Put it on GitHub Pages

1. Create a repository (public or private — Pages works on public, or private with a paid plan).
2. Upload `index.html` to the root of the repo. Nothing else is required.
3. Settings → Pages → Source: **Deploy from a branch** → Branch `main`, folder `/ (root)` → Save.
4. Wait ~60 seconds. Your plan is live at `https://<username>.github.io/<repo>/`.

## Opening it

The page asks for a code. It is `1432`.

This is a lock on the front door, not real security: the page is static, so the code lives in the
file. Anyone who views source can read it. Keep the repo private if that matters, and never put
anything genuinely sensitive in the notes fields.

## Making progress follow you between devices

GitHub Pages only serves files — there is no server to write to. The planner works around that
with a small anonymous JSON store, set up from the **Sync** button in the toolbar.

**Option 1 — one click, no account.** Press Sync → *Turn on sync*. The app creates an anonymous
encrypted store on jsonblob.com and appends its id to the URL, e.g.
`https://you.github.io/plan/#jsonblob:abcd1234`. Bookmark that exact URL and open it on your phone
or laptop — same plan, same progress. Changes upload 1.5 seconds after you stop clicking, and the
page pulls on load, on window focus, and every 90 seconds.

**Option 2 — private GitHub gist (more reliable, your own data).** Create a token at
`github.com/settings/tokens` with only the **gist** scope, press Sync → paste it → *Connect gist*.
The token is stored in that browser only and never leaves it except to talk to GitHub. On a second
device, open the same URL and paste the same token plus the gist id shown in the sync panel.

Either way the payload is encrypted in the browser with AES-GCM, using a key derived from the
passcode, before it is uploaded. The store holds ciphertext, not your notes.

If both options are blocked by your network, everything still works — it simply stays local to that
browser, and **Export** / **Import** move a JSON snapshot by hand.

## Daily use

- **Today** jumps to today and opens it. Tick tasks off as you finish them.
- **Backlog** on a task pushes it forward; anything that depends on it moves too, and the 2-hour
  daily cap is respected.
- **Mark this day a holiday** empties the day and reflows the rest of the 12 weeks. Nothing is deleted.
- **Weekly review** summarises throughput, misses, interview practice, weak topics and next week's order.
- **Flag shaky** on a task drops that skill score by 4 and marks it for attention in the review.
- Revision blocks are generated automatically at +3, +7, +21 and +45 days from wherever a topic
  actually landed.

## Resetting

**Reset plan** clears completions, backlog, holidays and notes and restarts from today's date.
Export first if you want a copy. Reset does not disconnect sync — the cleared state uploads like any
other change, so it clears your other devices too.
