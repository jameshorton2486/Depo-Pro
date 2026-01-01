# 📄 Page-by-Page Redesign Plan

**Depo-Pro 2025 Award-Winning Redesign**  
**Complete Page Specifications**

---

## 🎯 REDESIGN PRINCIPLES

For every page:
1. **Define Emotional Goal** — What feeling should users have?
2. **Define Primary Intent** — What action should users take?
3. **Design Narrative Flow** — How does the story unfold?
4. **Specify Visual Hierarchy** — What draws attention first?
5. **Plan Motion Opportunities** — Where can motion enhance experience?

---

## 🌐 PUBLIC PAGES

### 1. Homepage (`/`)

**Emotional Goal:** Confidence, trust, and clarity  
**Primary Intent:** Start free trial or learn more  
**Narrative Flow:** Hero → Problem → Solution → Proof → Action

#### Structure

```
┌─────────────────────────────────────┐
│  Navbar (sticky, minimal)           │
├─────────────────────────────────────┤
│  HERO SECTION                       │
│  - Large serif headline             │
│  - Subtle gradient background       │
│  - Primary CTA (gradient button)    │
│  - Scroll indicator (subtle)        │
├─────────────────────────────────────┤
│  PROBLEM SECTION (alternate bg)     │
│  - "The challenge" headline         │
│  - Pain points (3 cards)            │
│  - Soft fade-in on scroll           │
├─────────────────────────────────────┤
│  SOLUTION SECTION                   │
│  - "Built for court reporters"      │
│  - How It Works (5 steps)           │
│  - Interactive flow diagram         │
├─────────────────────────────────────┤
│  PROOF SECTION                      │
│  - Trust badges (SOC 2, HIPAA)      │
│  - Testimonials (optional)          │
├─────────────────────────────────────┤
│  FINAL CTA                          │
│  - Gradient background              │
│  - Clear value proposition          │
│  - Primary + secondary CTAs         │
├─────────────────────────────────────┤
│  Footer (minimal)                   │
└─────────────────────────────────────┘
```

#### Design Specifications

**Hero Section:**
- **Background**: Soft gradient (`--gradient-aurora`) with subtle animated particles
- **Typography**: Serif headline (4xl-5xl), sans body (lg)
- **Spacing**: 96px top padding, 48px bottom
- **Animation**: Fade-in + subtle slide-up (400ms)
- **CTA**: Large gradient button, ghost secondary

**Problem Section:**
- **Background**: Alternate (`--bg-secondary`)
- **Cards**: White cards with subtle shadow, hover lift
- **Animation**: Staggered fade-in (200ms delay between cards)

**Solution Section:**
- **Flow Diagram**: Interactive timeline (SVG + animations)
- **Cards**: Icon + number + title + description
- **Animation**: Reveal on scroll

**Trust Section:**
- **Badges**: Minimal icons + text, horizontal layout
- **Background**: Subtle border-top separator

**Final CTA:**
- **Background**: Gradient (`--accent-primary`) with overlay pattern
- **Typography**: Large serif headline, sans body
- **Spacing**: 64px vertical padding

#### Motion Opportunities

- Hero headline: Word-by-word reveal (staggered)
- Problem cards: Fade-in + slide-up (staggered)
- Flow diagram: Progressive reveal on scroll
- CTA buttons: Gentle pulse on initial load

---

### 2. Login Page (`/login`)

**Emotional Goal:** Calm, secure, approachable  
**Primary Intent:** Authenticate user  
**Narrative Flow:** Welcome → Credentials → Action → Recovery

#### Structure

```
┌─────────────────────────────────────┐
│  Centered Container (max 400px)     │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Logo (centered)              │ │
│  │  Headline: "Welcome back"     │ │
│  │  Subtitle (muted)             │ │
│  ├───────────────────────────────┤ │
│  │  Form:                        │ │
│  │  - Email (floating label)     │ │
│  │  - Password (floating label)  │ │
│  │  - Remember me (checkbox)     │ │
│  │  - Forgot password (link)     │ │
│  │  - Submit button (gradient)   │ │
│  ├───────────────────────────────┤ │
│  │  Divider: "or"                │ │
│  ├───────────────────────────────┤ │
│  │  Register link (muted)        │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### Design Specifications

- **Background**: Gradient (`--gradient-aurora`) with subtle pattern
- **Card**: White card, centered, max-width 400px, subtle shadow
- **Form Fields**: Floating labels, focus glow, error states (red)
- **Button**: Full-width gradient button, loading state (spinner)
- **Typography**: Serif headline (2xl), sans body

#### Motion Opportunities

- Form fields: Labels float up on focus
- Submit button: Loading spinner + disabled state
- Error messages: Slide-down + fade-in
- Success state: Checkmark animation

---

### 3. Register Page (`/register`)

**Emotional Goal:** Welcoming, clear, encouraging  
**Primary Intent:** Create account  
**Narrative Flow:** Invitation → Information → Agreement → Action

#### Structure

Similar to login, but:
- **Headline**: "Start your free trial"
- **Form Fields**: Name, email, password, confirm password, role selection
- **Progressive Disclosure**: Show password strength meter
- **Terms Checkbox**: Required, linked to terms page

#### Design Specifications

- **Password Strength**: Visual indicator (weak/medium/strong)
- **Role Selection**: Radio buttons or segmented control
- **Validation**: Real-time (inline errors)

#### Motion Opportunities

- Password strength: Animated bar + color change
- Validation errors: Gentle shake + fade-in
- Success state: Celebration animation (optional)

---

### 4. Features Page (`/features`)

**Emotional Goal:** Impressive, detailed, trustworthy  
**Primary Intent:** Learn about capabilities  
**Narrative Flow:** Overview → Categories → Details → Comparison

#### Structure

```
┌─────────────────────────────────────┐
│  Hero: "Everything you need"        │
├─────────────────────────────────────┤
│  Feature Categories (tabs):         │
│  - Transcription                    │
│  - Collaboration                    │
│  - Security                         │
│  - Analytics                        │
├─────────────────────────────────────┤
│  Feature Grid (3 columns)           │
│  - Icon + Title + Description       │
│  - Hover: Card lift + shadow        │
├─────────────────────────────────────┤
│  Comparison Table (optional)        │
└─────────────────────────────────────┘
```

#### Design Specifications

- **Tabs**: Clean, underline indicator, smooth transition
- **Cards**: Grid layout, hover lift, icon + gradient accent
- **Animation**: Reveal on scroll, staggered

---

### 5. Pricing Page (`/pricing`)

**Emotional Goal:** Transparent, fair, value-driven  
**Primary Intent:** Choose a plan  
**Narrative Flow:** Options → Comparison → Recommendation → Action

#### Structure

```
┌─────────────────────────────────────┐
│  Hero: "Simple, transparent pricing"│
├─────────────────────────────────────┤
│  Pricing Cards (3 columns)          │
│  - Feature list                     │
│  - Price (large)                    │
│  - CTA button                       │
│  - Popular badge (if applicable)    │
├─────────────────────────────────────┤
│  FAQ Section                        │
│  - Accordion-style                  │
└─────────────────────────────────────┘
```

#### Design Specifications

- **Cards**: Elevate "popular" plan (subtle border + shadow)
- **Pricing**: Large number + small "per month"
- **Features**: Checkmarks, organized by category
- **FAQ**: Smooth accordion, open/close animation

---

### 6. About Page (`/about`)

**Emotional Goal:** Human, authentic, trustworthy  
**Primary Intent:** Build connection  
**Narrative Flow:** Story → Team → Mission → Values

#### Structure

```
┌─────────────────────────────────────┐
│  Hero: "Built by court reporters"   │
├─────────────────────────────────────┤
│  Story Section                      │
│  - Timeline or narrative            │
├─────────────────────────────────────┤
│  Team Section (optional)            │
│  - Photos + bios                    │
├─────────────────────────────────────┤
│  Mission & Values                   │
│  - 3-4 value cards                  │
└─────────────────────────────────────┘
```

---

### 7. Security Page (`/security`)

**Emotional Goal:** Confidence, assurance, technical  
**Primary Intent:** Trust building  
**Narrative Flow:** Commitment → Details → Certifications → FAQ

#### Structure

- **Hero**: "Security is non-negotiable"
- **Sections**: Encryption, compliance, certifications
- **Visual**: Icons + technical details (accessible language)
- **FAQ**: Security-specific questions

---

### 8. Contact Page (`/contact`)

**Emotional Goal:** Approachable, helpful, responsive  
**Primary Intent:** Get in touch  
**Narrative Flow:** Options → Form → Expectations → Success

#### Structure

- **Multi-Channel**: Email, form, calendar booking (if available)
- **Form**: Progressive, conversational
- **Success State**: Clear confirmation + next steps

---

## 🏠 DASHBOARD PAGES

### 9. Reporter Dashboard (`/reporter`)

**Emotional Goal:** Control, clarity, productivity  
**Primary Intent:** Manage jobs efficiently  
**Narrative Flow:** Overview → Actions → Recent → Quick Actions

#### Structure

```
┌─────────────────────────────────────┐
│  Header:                            │
│  - Greeting + name                  │
│  - Quick stats (4 cards)            │
├─────────────────────────────────────┤
│  Action Bar:                        │
│  - "New Job" button (prominent)     │
│  - Filter/search                    │
├─────────────────────────────────────┤
│  Recent Jobs Table/Grid             │
│  - Status badges                    │
│  - Progress indicators              │
│  - Quick actions                    │
└─────────────────────────────────────┘
```

#### Design Specifications

- **Stats Cards**: Large numbers, trend indicators, subtle icons
- **Table**: Clean, sortable, alternating row colors
- **Status Badges**: Color-coded, accessible
- **Actions**: Hover states, loading indicators

---

### 10. Scopist Dashboard (`/scopist`)

**Emotional Goal:** Focus, clarity, efficiency  
**Primary Intent:** Review flagged words  
**Narrative Flow:** Queue → Priority → Progress → Actions

#### Structure

- **Queue View**: List of assigned jobs
- **Progress Indicators**: Visual progress bars
- **Priority Sorting**: Most urgent first
- **Quick Actions**: Start review, mark complete

---

### 11. Admin Dashboard (`/admin`)

**Emotional Goal:** Authority, overview, control  
**Primary Intent:** Monitor system health  
**Narrative Flow:** Metrics → Activity → Alerts → Actions

#### Structure

- **System Stats**: Large metric cards
- **Activity Feed**: Recent actions, users, jobs
- **Alerts**: Critical issues highlighted
- **Quick Actions**: Common admin tasks

---

## 📋 WORKFLOW PAGES

### 12. Job Detail Page (`/jobs/[id]`)

**Emotional Goal:** Comprehensive, organized, actionable  
**Primary Intent:** Complete job workflow  
**Narrative Flow:** Header → Tabs → Content → Actions

#### Structure

```
┌─────────────────────────────────────┐
│  Page Header:                       │
│  - Job title (serif)                │
│  - Status badge                     │
│  - Actions (export, edit, etc.)     │
├─────────────────────────────────────┤
│  Tabs:                              │
│  - Overview                         │
│  - Files                            │
│  - Transcript                       │
│  - Notes                            │
│  - Settings                         │
├─────────────────────────────────────┤
│  Tab Content (contextual)           │
└─────────────────────────────────────┘
```

#### Design Specifications

- **Tabs**: Clean, underline indicator
- **Content**: Organized sections, clear hierarchy
- **Actions**: Sticky action bar (on scroll)

---

### 13. Review Page (`/jobs/[id]/review`)

**Emotional Goal:** Focused, precise, efficient  
**Primary Intent:** Review and correct flagged words  
**Narrative Flow:** Audio → Transcript → Panel → Progress

#### Structure

- **Audio Player**: Waveform visualization, controls
- **Transcript**: Synchronized highlighting, word-level editing
- **Sidebar**: Flagged words panel, progress tracker
- **Actions**: Save, complete, keyboard shortcuts

#### Motion Opportunities

- Word highlighting: Smooth transition as audio plays
- Edit mode: Gentle focus ring + inline input
- Progress bar: Animated fill as words reviewed

---

### 14. Create Job Page (`/jobs/new`)

**Emotional Goal:** Clear, guided, confident  
**Primary Intent:** Create new deposition job  
**Narrative Flow:** Steps → Form → Validation → Submission

#### Structure

- **Progress Indicator**: Multi-step form (top)
- **Form Sections**: Collapsible, progressive disclosure
- **Validation**: Real-time, inline errors
- **Submit**: Loading state, success confirmation

---

## 🎨 COMPONENT RECOMMENDATIONS

### Reusable Components Needed

1. **StatCard** — Large number + label + trend
2. **FeatureCard** — Icon + title + description + hover
3. **TestimonialCard** — Quote + author + avatar
4. **ProgressBar** — Visual progress + percentage
5. **StatusBadge** — Color-coded status indicator
6. **DataTable** — Sortable, filterable table
7. **Timeline** — Step-by-step visualization
8. **Accordion** — Expandable content sections

---

## ♿ ACCESSIBILITY CONSIDERATIONS

### Every Page Must Have:

- ✅ Semantic HTML structure
- ✅ ARIA labels where needed
- ✅ Keyboard navigation support
- ✅ Focus indicators visible
- ✅ Color contrast (WCAG AAA)
- ✅ Alt text for images
- ✅ Screen reader testing

---

## 🚀 PERFORMANCE CONSIDERATIONS

### Optimization Strategies:

- **Images**: WebP format, lazy loading, responsive sizes
- **Fonts**: Variable fonts, subset loading, `font-display: swap`
- **JavaScript**: Code splitting, tree shaking, lazy loading
- **CSS**: Critical CSS inlined, unused CSS removed
- **Third-Party**: Load asynchronously, defer non-critical

---

## 📱 MOBILE CONSIDERATIONS

### Responsive Adaptations:

- **Navigation**: Hamburger menu on mobile
- **Tables**: Scrollable or card-based on mobile
- **Forms**: Full-width inputs, larger touch targets
- **Spacing**: Adjusted vertical rhythm for mobile
- **Typography**: Slightly smaller scale on mobile

---

**Next Steps:** Begin implementation with Phase 1 (Foundation), then proceed page-by-page through Phase 3.
