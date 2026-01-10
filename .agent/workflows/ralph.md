---
description: Autonomous task execution using Ralph pattern - iterate through PRD until complete
---

# Ralph Workflow

Execute PRD tasks autonomously until all items are complete.

## Usage
Prompt: "Load ralph workflow" or "/ralph"

## Steps

// turbo-all

### 1. Load PRD
Read `ralph/prd.json` to understand current project state.

### 2. Check Progress  
Read `ralph/progress.md` for context from previous iterations.

### 3. Select Next Task
Find the first story in `prd.json` where `"passes": false`.
If all stories pass, output "✅ RALPH COMPLETE - All stories pass!" and stop.

### 4. Execute Task
Implement the selected story:
- Follow acceptance criteria exactly
- Make minimal changes
- Commit frequently

### 5. Verify
Run quality checks:
```bash
# TypeScript check
npm run typecheck || npx tsc --noEmit

# Run tests  
npm test

# For UI stories: verify in browser
```

### 6. Update PRD
If all checks pass, update `ralph/prd.json`:
- Set `"passes": true` for completed story
- Add any notes to the story

### 7. Log Learnings
Append to `ralph/progress.md`:
- What was done
- Any gotchas discovered
- Patterns to remember

### 8. Update Learnings
Add reusable patterns to `ralph/learnings.md`:
- Code patterns discovered
- Configuration gotchas
- Useful context for future iterations

### 9. Loop
Return to Step 3 and pick the next incomplete story.

---

## PRD Format

```json
{
  "name": "Feature Name",
  "branchName": "feature/name",
  "stories": [
    {
      "id": "1",
      "title": "Task title",
      "priority": 1,
      "acceptance": ["Criteria 1", "Criteria 2"],
      "passes": false,
      "notes": ""
    }
  ]
}
```

## Stop Condition
When all stories have `"passes": true`, the workflow is complete.
