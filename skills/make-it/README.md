# make-it

The scaffolder skill. Generates a new skill or app from a brief.

## What it does

Takes a structured brief (gathered by the CLI) and emits a `ScaffoldSpec`: every file the user needs, fully populated. The CLI writes the files; this skill does no I/O.

For apps specifically, validates that the generated prompt body does not set tone, voice, colors, or copy. Those belong to the core (brand, workspace), not the app.

## Invoke

```
npx pectus make-it skill              # scaffold a new skill, CLI prompts for the brief
npx pectus make-it app                # scaffold a new app, CLI prompts for the brief
```

Both modes drop you into an interactive prompt that gathers what `make-it` needs, then runs the skill, then writes the files the skill returned.

## Why this exists

The whole point of Pectus is that skills and apps are extensible. Without an easy authoring path, only people who already know the SKILL.md and APP.md contracts contribute. `make-it` lowers the bar: anyone who can describe what they want builds it.

## Output

A `ScaffoldSpec` (see `./schema.ts`). The CLI receives this and:

1. Creates the target directory.
2. Writes every file in `files` with its content.
3. Prints `validation_notes` if any.
4. Prints `next_steps` for the user to follow.

## Notes

- The skill itself is upstream-managed. You don't author skills by editing this skill; you author skills by *using* it.
- For community contributions, the next-steps will include opening a PR to `github.com/pectusai/pectus` (for official) or publishing to your own GitHub repo (for community).
