@AGENTS.md

## Claude Code

Skillsen står på ett ställe, `.agents/skills/<namn>/SKILL.md`, så att de är desamma i alla verktyg. I `.claude/skills/` finns pekare dit, så att de syns som `/planera`, `/bygga` och `/granska`.

Kör utvecklingsservern i bakgrunden och verifiera i webbläsaren. När förhandsvisningen är dold fryser webbläsaren tidtagare och övergångar; kör då granskningen headless med `presenter/scripts/granska-edge.mjs`.
