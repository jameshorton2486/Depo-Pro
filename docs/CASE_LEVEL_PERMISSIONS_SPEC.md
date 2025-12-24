# Case-Level Permissions Spec (Multi-Tenant Law Firm-Safe)

## 🎯 GOALS (NON-NEGOTIABLE)

This permissions system MUST:
- ✅ Support multiple law firms (tenants)
- ✅ Prevent any cross-case data leakage
- ✅ Allow multiple attorneys per case
- ✅ Allow court reporters access only to their own depositions
- ✅ Allow attorneys to see everything within a case
- ✅ Support future roles (paralegals, co-counsel, trial consultants)

---

## 🧱 CORE TENANCY MODEL

**Tenant = Law Firm**

Every object in the system belongs to a Firm.

```
Firm
 ├─ Users
 ├─ Cases
 │   ├─ Depositions
 │   │   ├─ Transcripts
 │   │   └─ Exhibits
 │   ├─ Attorney Uploads
 │   ├─ Issue Annotations
 │   └─ Reports
```

**Nothing exists outside a Firm.**

---

## 🧑‍💼 USER ROLES (AUTHORITATIVE)

```prisma
enum UserRole {
  ATTORNEY
  PARALEGAL        // future
  COURT_REPORTER
  AGENCY_ADMIN
  FIRM_ADMIN
}
```

**⚠️ Important:** Role ≠ Access. Access is granted per case, not globally.

---

## 📁 CASE-LEVEL ACCESS (THE HEART OF THIS)

### CaseMembership (JOIN TABLE)

```prisma
CaseMembership {
  id
  user_id
  case_id
  role_in_case   // ATTORNEY | PARALEGAL | REPORTER
  permissions    // JSONB (optional overrides)
  created_at
}
```

**Why this is critical:**
- Attorneys can belong to many cases
- Reporters belong to only their deposition's case
- Paralegals can be added later without schema changes

---

## 🔐 PERMISSION MATRIX (ENFORCED SERVER-SIDE)

### CASE VISIBILITY

| Role | Can See Case |
|------|--------------|
| Attorney | ✅ if CaseMember |
| Paralegal | ✅ if CaseMember |
| Reporter | ✅ if assigned deposition |
| Other Firm Users | ❌ |

### TRANSCRIPTS

| Role | Upload | View | Annotate |
|------|--------|------|----------|
| Court Reporter | ✅ own deposition | ✅ own | ❌ |
| Attorney | ✅ any | ✅ all | ✅ |
| Paralegal | ❌ | ✅ all | ✅ |

### EXHIBITS

| Role | Upload | View | Link |
|------|--------|------|------|
| Court Reporter | ✅ own deposition | ✅ own | ❌ |
| Attorney | ✅ any | ✅ all | ✅ |
| Paralegal | ❌ | ✅ all | ✅ |

### ISSUE CODES / ANNOTATIONS

| Role | Create | View | Edit |
|------|--------|------|------|
| Attorney | ✅ | ✅ | ✅ |
| Paralegal | ✅ | ✅ | ✅ |
| Reporter | ❌ | ❌ | ❌ |

---

## 🧠 ACCESS CHECK — REQUIRED FOR EVERY API ROUTE

Every API route must:

1. Resolve `user_id`
2. Resolve `firm_id`
3. Resolve `case_id`
4. Verify:
   - User belongs to firm
   - User has `CaseMembership` OR valid reporter deposition link
5. Enforce role-specific permissions

### Example (pseudo-logic)

```typescript
assert(user.firm_id === case.firm_id)

if (user.role === "COURT_REPORTER") {
  assert(deposition.reporter_id === user.id)
}

if (user.role === "ATTORNEY") {
  assert(caseMembership.exists)
}
```

---

## 🗃️ REQUIRED DATABASE TABLES

### Firm
```prisma
Firm {
  id
  name
  created_at
}
```

### User
```prisma
User {
  id
  firm_id
  role
}
```

### Case
```prisma
Case {
  id
  firm_id
}
```

### CaseMembership
```prisma
CaseMembership {
  user_id
  case_id
  role_in_case
}
```

### Deposition (Job)
```prisma
Deposition {
  id
  case_id
  reporter_id
}
```

### Exhibit
```prisma
Exhibit {
  id
  case_id
  deposition_id?   // nullable
}
```

---

## 🧠 SECURITY GUARANTEES

This provides:
- ✔ Prevents cross-firm leakage
- ✔ Prevents cross-case leakage
- ✔ Allows shared cases inside firms
- ✔ Allows mixed reporter sources
- ✔ Scales to enterprise firms later

**This is enterprise-grade.**

