---
name: velmora-check
description: Pre-commit check for the Velmora project. Use when I say "run the velmora check".
---
# Velmora pre-commit check

Run each check and report pass or fail, with file and line for failures. Do not fix anything.

1. `npm test` passes (skip if package.json has no "test" script).
2. `npm run build` succeeds.
3. No "luxury", "stunning" or "must-have" in app/ or components/, and no exclamation marks in user-facing copy: JSX text, string literals and metadata (not operators such as `!==` or `!value`).
4. No product fact (price, fabric, lead time, date) typed as a literal in app/ or components/; all come from lib/.
5. No API key or "AIza" anywhere in the repository (excluding CLAUDE.md, .claude/, node_modules/, .next/ and .git/); GEMINI_API_KEY read only in server code.
6. No ratings, reviews or scarcity claims in pages or JSON-LD.