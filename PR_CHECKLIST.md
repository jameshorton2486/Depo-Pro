# Pull Request Checklist

Use this checklist before submitting a PR to ensure code quality and design consistency.

---

## Pre-Submission Checklist

### Code Quality
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] ESLint passes (`npm run lint`)
- [ ] All tests pass (if applicable)
- [ ] Code follows project patterns and conventions

### Design System
- [ ] **Design audit passes** (`npm run audit:design`)
  - No hex colors
  - No inline styles
  - No raw HTML form elements
  - Uses semantic color tokens
  - Uses shadcn/ui components

- [ ] **Visual regression checklist completed** (see `VISUAL_REGRESSION_CHECKLIST.md`)
  - Page uses standard container
  - Typography follows scale
  - Spacing is consistent
  - Dark mode tested
  - Responsive design verified

### Functionality
- [ ] Feature works as described
- [ ] Edge cases handled
- [ ] Error states implemented
- [ ] Loading states implemented (if applicable)

### Accessibility
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Screen reader labels where needed
- [ ] Color contrast meets WCAG AA

### Security & Permissions
- [ ] Route permissions verified (`npm run check:permissions`)
- [ ] API endpoints protected
- [ ] No sensitive data exposed
- [ ] Input validation implemented

### Performance
- [ ] No console errors
- [ ] No layout shift
- [ ] Images optimized (if applicable)
- [ ] No unnecessary re-renders

### Documentation
- [ ] Code comments where needed
- [ ] README updated (if applicable)
- [ ] API changes documented (if applicable)
- [ ] Breaking changes documented

---

## Quick Commands

Before submitting, run:

```bash
# Full check suite
npm run check:all

# Design system audit
npm run audit:design

# Route permissions check
npm run check:permissions

# Type checking
npm run typecheck

# Linting
npm run lint
```

---

## If Checklist Items Fail

**DO NOT MERGE** if any critical item fails:

- ❌ TypeScript errors
- ❌ Design system violations (critical ones)
- ❌ Route permission mismatches
- ❌ Security issues

**CAN MERGE** with warnings for:

- ⚠️ Non-critical design system violations (document in PR)
- ⚠️ Minor accessibility improvements (document as follow-up)
- ⚠️ Performance optimizations (document as follow-up)

---

## PR Description Template

```markdown
## Changes
- [Brief description of changes]

## Type
- [ ] Bug fix
- [ ] Feature
- [ ] Refactor
- [ ] Documentation
- [ ] Design system update

## Testing
- [ ] Manual testing completed
- [ ] Design audit passed (`npm run audit:design`)
- [ ] Route permissions verified (`npm run check:permissions`)

## Screenshots
[Add screenshots if UI changes]

## Breaking Changes
[Document any breaking changes]

## Follow-up Tasks
[Document any known follow-up work]
```

---

**Remember**: It's better to fix issues before review than to delay the review process. Run the checks locally first!
