# 📦 Commit Plan - Navigation System Implementation

This document outlines the organized commit structure for landing the navigation system and design improvements.

## ✅ Prerequisites (Already Complete)

- ✅ Unused symbols removed (NavigationSchema, SidebarContextValue, Stamp)
- ✅ Lint passes cleanly
- ✅ TypeScript compiles without errors

---

## 🔒 Commit 1: Navigation + Layout

**Purpose**: Core navigation system with centralized schema, sidebar, and breadcrumbs

```bash
git add lib/navigation.ts \
        components/layouts/app-sidebar.tsx \
        components/layouts/breadcrumbs.tsx \
        components/layouts/layout-with-sidebar.tsx \
        components/layouts/navbar.tsx \
        components/layouts/app-navbar.tsx \
        app/(dashboard)/layout.tsx \
        app/unauthorized/

git commit -m "feat(navigation): centralize role-based navigation, sidebar, and breadcrumbs"
```

---

## 🔐 Commit 2: Auth + Permissions

**Purpose**: Align API and page permissions with role-based access

```bash
git add lib/auth/require-role.ts \
        lib/breadcrumbs.ts \
        app/api/calendar/availability/route.ts \
        scripts/check-route-permissions.ts

git commit -m "fix(auth): align API and page permissions with role-based access"
```

---

## 🎨 Commit 3: Design Audit Tooling

**Purpose**: Add design system audit script and status color utilities

```bash
git add scripts/audit-design-system.ts \
        lib/status-colors.ts

git commit -m "chore(design): add design system audit tooling"
```

---

## 🧱 Commit 4: Page Layout Normalization

**Purpose**: Normalize dashboard page containers and spacing

```bash
git add app/(dashboard)/cases/new/page.tsx \
        app/(dashboard)/reporter/page.tsx

git commit -m "refactor(layout): normalize dashboard page containers and spacing"
```

---

## 📦 Commit 5: Dependencies

**Purpose**: Update dependencies (glob, @types/glob for audit script)

```bash
git add package.json package-lock.json

git commit -m "chore(deps): update dependencies"
```

---

## ✅ Final Verification

After all commits:

```bash
# Check status
git status
# Should show: nothing to commit, working tree clean

# Verify lint still passes
npm run lint

# Push to remote
git push
```

---

## 📝 Notes

- Commits are organized by logical grouping
- Each commit is self-contained and meaningful
- Husky will run lint checks on each commit
- All commits should pass cleanly since unused symbols are removed
