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

<!-- Append further prompts below, in order. -->
