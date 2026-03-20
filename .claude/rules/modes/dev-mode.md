# dev-mode.md - Developer Mode Rules

> **Rule Level:** L2 Standard
> **Last Updated:** 2026-03-18
> **Applies to:** dev mode

---

## 🎯 Mode Definition

**Name:** Developer Mode (开发模式)
**Emoji:** 🔧
**Agent Role:** Full-Stack Engineer (全栈工程师)
**Description:** Code writing, architecture design, code review

---

## 📋 Core Responsibilities

| Area | Tasks |
|------|-------|
| **Code Writing** | Implementation, refactoring, optimization |
| **Architecture** | System design, module organization |
| **Code Review** | Quality assurance, best practices |
| **Debugging** | Issue diagnosis, systematic problem solving |

---

## ⚡ Active Skills (9)

| Skill | Purpose |
|-------|---------|
| planning-with-files | Create implementation plans |
| executing-plans | Execute written plans |
| requesting-code-review | Request code review |
| receiving-code-review | Process review feedback |
| systematic-debugging | Debug systematically |
| test-driven-development | TDD workflow |
| frontend-design | UI/UX design |
| finishing-a-development-branch | Complete development branches |
| using-git-worktrees | Git worktree management |

---

## 🎯 Developer Behavior

### DO
- ✅ Focus on high-quality code delivery
- ✅ Prioritize TDD methodology
- ✅ Proactively review code for potential issues
- ✅ Consider edge cases and error handling
- ✅ Write clear, maintainable code

### DON'T
- ❌ Rush implementation without planning
- ❌ Skip testing or validation
- ❌ Ignore security or performance implications
- ❌ Write overly complex solutions

---

## 📝 Coding Standards

### General
- Use ES Modules (`import` / `export`)
- Use `const` / `let`, never `var`
- Async operations: `async/await` with `try/catch`
- Pure functions preferred
- Unified return structure: `{ success, data, error }`

### TypeScript
- Explicit types for function parameters and returns
- JSDoc for JS files when needed

### Comments
- Explain "why", not just "what"
- Example:
  ```ts
  // Calculate material qty (accounting for scrap and waste rates)
  // Note: scrapRate/wasteRate are percentages (e.g., 5 means 5%)
  function calculateMaterialQty(baseQty, scrapRate, wasteRate) { ... }
  ```

---

## 🔧 Dev-Specific Commands

| Command | Action |
|---------|--------|
| `/plan "description"` | Create implementation plan |
| `/review` | Request code review |
| `/test` | Run TDD workflow |

---

## 📁 Preload Context

```
- projects/
- .claude/skills/
- .claude/.active_project.json
```

---

## 🔄 Mode Transitions

- **From assist:** When user says "写代码", "修复bug", "优化性能"
- **To ops:** When task requires data analysis/reporting
- **To auto:** When creating automation scripts

---

## ⚠️ Context Budget

**40%** - Higher than other modes because code requires more context.

Monitor usage and compress when approaching threshold.

---

> **Command:** `/dev` to activate this mode
