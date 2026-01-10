---
description: Create a detailed PRD through guided questions - generates ralph/prd.json
---

# PRD Generation Skill

Generate a comprehensive Product Requirements Document through interactive Q&A.

## Usage
Prompt: "Load prd skill" or "/prd" followed by your feature description

Example: "Load prd skill for a clothing resale app"

## Process

### Step 1: Feature Overview
I'll ask you to describe your feature/product in 2-3 sentences.

### Step 2: Clarifying Questions
I'll ask targeted questions like:
- Who is the target user?
- What problem does this solve?
- What's the core user flow?
- What integrations are needed?
- What's the MVP vs nice-to-have?

### Step 3: Story Breakdown
For each major feature, I'll help you define:
- **Title**: Clear, actionable story name
- **Acceptance Criteria**: Specific, testable requirements
- **Priority**: 1 (highest) to N (lowest)

### Step 4: Generate prd.json
I'll create `ralph/prd.json` with your approved stories.

---

## Output Format

```json
{
  "name": "Feature Name",
  "branchName": "feature/name",
  "stories": [
    {
      "id": "1",
      "title": "Story title",
      "priority": 1,
      "acceptance": [
        "Criterion 1",
        "Criterion 2"
      ],
      "passes": false,
      "notes": ""
    }
  ]
}
```

---

## Tips for Good Stories

✅ **Right-sized** (completable in one session):
- "Add marketplace selector dropdown"
- "Implement price range filter"
- "Add image upload preview"

❌ **Too big** (split these):
- "Build the entire dashboard"
- "Add authentication"
- "Create the backend"

---

## Ready?
Describe your feature and I'll start asking questions!
