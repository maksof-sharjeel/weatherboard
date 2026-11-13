# Prompt history

**Agent / IDE:** Claude Code (Anthropic), running as the VS Code extension. Model: Claude Opus 5.5.

> Note for reviewers: the brief lists Cursor, Antigravity or OpenCode. I used Claude Code, which is an agentic coding tool of the same kind, and I'm recording that openly rather than hiding it.

Prompts are listed in order, verbatim. My original messages were in Roman Urdu, so an English gloss follows each one.

---

### 1. Kickoff

> *(attached: Edspire-Frontend-Technical-Challenge.pdf, plus the invitation email)*
> ye file read karu aik jaga frontend keliy apply kara tha, waha se ye file r neeche wala text aya h

*Gloss:* "Read this file. I applied for a frontend role and received it along with the email below."

The agent summarised the requirements and raised three points before writing any code:

1. The IDE requirement.
2. "Fires even when the tab is closed" can't be guaranteed client-only.
3. API keys will be visible in the bundle.

It proposed a separate repo and the stack Vite + React + TS + Tailwind + vite-plugin-pwa.

### 2. IDE question

> Vs code use nahi karsakta kya?

*Gloss:* "Can't I use VS Code?"

### 3. Go

> tm project banana start karu phr dekhte hein

*Gloss:* "You start building the project, then we'll see."

The agent then scaffolded the project and built it in this order:

1. API layer (normalised model + fallbacks)
2. Storage
3. Service worker
4. Hooks
5. Components
6. Tests
7. Visual check

For the visual check it drove headless Chrome at 375/768/1280, measured horizontal overflow and every touch target, and tested offline reload through the service worker.

**What it got wrong at first, and what was fixed after looking at the screenshots:**

- At 375 px the stat labels ("Feels like", "Humidity") were truncated. The icons are now hidden on mobile.
- The °C/°F toggle buttons measured 40 px, below the 44 px minimum, so they were enlarged.
- The search input showed a double focus ring (browser outline plus container border). The container now owns the focus style.
- The forecast condition text was hidden on desktop. It now has its own column.
- The favourites panel was rendered twice (mobile and desktop) and hidden with CSS, which duplicated DOM ids. It is now rendered once, placed with a media-query hook.

---

### 4. Gap check against the brief

> is pdf ke hisba se current project me kya kya kam remaining he

*Gloss:* "According to the PDF, what work is still remaining in the project?"

The agent ran the tests, build and lint (all passing), then listed what was left: API keys, a missing `npm test` script that README referred to, git/GitHub, deployment, README links, PROMPTS.md, and the submission email.

### 5–8. API keys

> ye phle se generate ki hui use hojagyi *(screenshot of the OpenWeatherMap API keys page)*

*Gloss:* "Will this already-generated key work?"

> key kha se milegi *(screenshot of RapidAPI)* · *(screenshots of the GeoDB Authorization/Headers tabs)*

*Gloss:* "Where do I get the key?"

The agent added both keys to `.env` (which is gitignored) and checked each one with a live request before relying on it, rather than assuming it worked.

> .env.example ye remove kardu extra he ye

*Gloss:* "Should I remove .env.example? It seems extra."

The agent advised keeping it: README's setup step depends on it, and it documents the required variables without holding secrets.

### 9–12. Local testing

> Ok next mujhe Url du kha kese test karunga me

*Gloss:* "Give me a URL. How do I test it?"

> service worker kese test karun *(then screenshots of an empty Service Workers panel)*

*Gloss:* "How do I test the service worker?"

**Debugging note:** no service worker was registered. The agent checked the registration code and confirmed `sw.js` was served, then spotted in the screenshot that the page was opened at `192.168.1.63:4173` (plain HTTP on a LAN IP). That isn't a secure context, so the browser refuses service workers there. Switching to `localhost:4173` fixed it, and no code change was needed.

> test kese karun notification wala kam

*Gloss:* "How do I test the notification feature?"

### 13–14. GitHub

> mujhe github per repo banae keliy description r nam wagerta likh kar du

*Gloss:* "Write the name, description and so on for creating the GitHub repo."

> https://github.com/maksof-sharjeel/weatherboard

The agent added the `test` script, initialised git, and pushed.

<!-- Append further prompts below, in order. -->
