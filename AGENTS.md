# ReserBUILD: agent workflow

The human makes strategic decisions. The agent makes tactical decisions and records them outside the code.

## The spine

`study → plan → execute → rendezvous → sync docs`

This spine is the only workflow. Skill suites (superpowers, claude-mem make-plan/do, issue-driven flows) supply tools for its stages; their own workflows do not run.

**Size gate.** Work that fits one Conventional Commit goes straight to execute. Larger work runs the full spine and stops after the plan for human approval. If the scope grows past one commit during execution, stop and ask.

**Mode.** For work past the size gate, start with one line naming the mode (technical, design, or mixed) and the skills from the table below that this work needs. Naming them per task keeps the skill check recurring with the work; a check done once per session falls behind by the third task. Mixed runs the technical part first, then the design pass, before rendezvous.

### Stages

- **study**: write `doc/study/{date +%s}_{topic}.md`. Get the timestamp with `date +%s`. Commit as `docs:`.
- **plan**: write `doc/plan/{date +%s}_{topic}.md` as the editable task board for another session: checkboxes, acceptance criteria, and a completion criterion per task. Mark each task `tests: first` (rules and server logic) or `tests: alongside` (behaviour found by a browser probe), so the plan promises only what execute will do. The plan is the only list of active work. Put an **OPEN QUESTIONS** section near the top when human input is needed. Commit as `docs:`, present the plan, and wait. "Fold the answers in" or "reconstitute the plan" means update the plan, then wait again.
- **execute**: make a feature branch. Write the tests before the code for `tests: first` tasks. Tick tasks in the plan doc as they finish. Continue until done or blocked.
- **rendezvous**: if code changed, run the tests and the review skills, then exercise the first thing the user will do with the change (a page behind sign-in, a write), not a page that works either way. A check counts only if it could fail for the reason the claim could be false. If only docs changed (study, plan, wiki), skip tests and review. Merge to main locally (see Git when a push to main deploys) and record the checks in the plan. The plan is frozen after this.
- **sync docs**: if behaviour changed, make `doc/wiki/` match the code. Delete stale text as well as adding new text.

### Skills per stage

Use a skill only when the task needs it. Skip it for small or clear work.

| Stage | Technical | Design (impeccable) |
|---|---|---|
| study | `grilling`, then `domain-modeling`, when scope or terms are unclear; `research` for primary sources; `prototype` to test logic before planning | `/impeccable shape [feature]`; `/impeccable init` once if PRODUCT.md is missing, `/impeccable document` once if DESIGN.md is missing |
| plan | `codebase-design` for structural changes; `grilling` on the plan before approval, for work past the size gate | list the surfaces and the shape brief's decisions as plan tasks |
| execute | `tdd`; `diagnosing-bugs` for failures; `wizard` for steps only the human can do | `/impeccable [feature]` (new work) or the matching refine command (`layout`, `typeset`, `colorize`, `animate`, `bolder`, `quieter`); `mobile-native` when the UI ships to phones |
| rendezvous | `code-review`; `simplify` when code changed (skip if not installed); `security-review` when auth, money, or user data change | `/impeccable critique` and `/impeccable audit`, then `/impeccable polish`; `break-ui` when the change shows lists, names, or user-entered data |
| sync docs | `writing-for-agents` when editing AGENTS.md, skills, or wiki | same |
| any | `claude-handoff` when a session gets long | same |

Use the mattpocock-skills versions of `code-review` and `prototype` when another skill or built-in has the same name.

**Harness fallbacks.** Say each fallback in one line at the start of the task.
- Design: impeccable is not installed in Codex. There, use taste-skill (`design-taste-frontend`) for the design pass, with `break-ui` at rendezvous.
- Memory: if claude-mem is not available in the current harness, read `doc/adr/`, the latest plans, and `git log` instead.
- Guardrails: Codex has no PreToolUse hook. There, the Git rules below are written rules only. Never run destructive git commands (force-push, `reset --hard`, branch deletion on main).

### Subagents

Spawn subagents only during execute, and only when the approved plan has 3 or more tasks in separate files or areas. Code-writing subagents use git worktrees. During study, read-only explore agents may run wide searches. Pass only the Git and Writing rules into a subagent prompt, not this whole file.

## Knowledge homes

Each kind of knowledge has one home. Look there first; write there only.

| Kind | Home |
|---|---|
| History of past work | claude-mem: search with `mem_search` before re-deriving past work. Do not write the harness's native memory files. |
| Code structure | graphify: run `graphify query "<question>"` before the first grep or source read; `graphify update .` after code changes. |
| Decisions | `doc/adr/` and `GLOSSARY.md`, written by `domain-modeling`. Write ADRs to `doc/adr/`, never `docs/adr/` |
| Current state | `doc/wiki/`: `spec.md`, `architecture.md`, `setup.md` |
| Frozen records | `doc/study/`, `doc/plan/` |

- **spec.md** is living. Update behaviour facts freely during sync docs. Changes to intent (product rules, scope, money or settlement logic) go into the plan's OPEN QUESTIONS; edit spec.md only after approval, and add an ADR.
- **architecture.md** holds the intent behind the structure, not the structure itself.
- `doc/canonical/`: human-vetted; read only; report conflicts to the human.
- `doc/roadmap/plan_queue/`: plans conceived as a batch; take one at a time and reconstitute it against the current code before approval.
- `doc/wiki/footguns/`: one file per unintuitive behaviour.
- Add a wiki page only when a sync finds content that fits none of the existing pages.

## Git

- One Conventional Commit per change (`feat:`, `fix:`, `docs:`, `chore:`, `build:`, `refactor:`, `test:`). State how you scoped the work.
- Work on a feature branch; rendezvous merges to main locally. If a push to main deploys, main holds only what production has or what is approved to ship next: keep other finished work on its own branch. Approval names a change, but a push ships a branch.
- Before any push, list the commits that will go out and name any the approval did not cover.
- Push only when the human says "ship" or "push"; then run the push yourself. Never force-push.
- The app runs on Vercel (doc/adr/0004-vercel-neon-hosting.md). A push to main deploys, and these rules apply:
  - Before a push, run the test suite once under the host's build environment variables. A build that fails safe also fails silently.
  - Before a push, record the previous main commit in the plan for rollback.
  - A release is finished only when a marker unique to the new version shows on the live site. It is not finished when the push returns.
  - Take the deploy, env, and rollback commands from `doc/wiki/setup.md`.

## Writing

Write docs and plans in ASD-STE100: short sentences, one instruction per sentence, approved vocabulary. Deviate only when critical nuance would otherwise be lost. Replies to the human stay short and plain.

## Project facts

- Test command: `npm test`
- Stack: Next.js 16 (TypeScript, App Router, server actions), Postgres 17 with Drizzle, Tailwind 4, Vitest. Local setup: `doc/wiki/setup.md`.
- Domain rules live in `src/server/` as plain functions `(db, actor, input, now)`; each checks the role first. Server actions in `src/app/actions/` are thin wrappers. See `doc/wiki/architecture.md`.
- Data model: [doc/canonical/erd.png](doc/canonical/erd.png). Summary in [doc/wiki/spec.md](doc/wiki/spec.md).
- Design sources: `PRODUCT.md` and `DESIGN.md` at the repo root, owned by impeccable, and the surface brief in `.impeccable/surfaces/`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
