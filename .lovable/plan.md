

## Redesign: Fact vs Story Section

The current layout stacks Fact and Story vertically in a collapsible, which makes it feel like a list rather than a meaningful contrast. The goal is to make the **tension between what happened and what you told yourself** visually immediate.

### Approach: Side-by-Side Contrast Cards

Replace the vertical list with two side-by-side cards on desktop (stacked on mobile) that visually oppose each other using color, shape, and typography.

### Design

```text
┌─────────────────────────────────────────────┐
│  FACT VS STORY                          ▾   │
│                                             │
│  ┌── mint border ──────┐ ┌── purple border ─┐│
│  │  FACT               │ │  STORY           ││
│  │                     │ │                  ││
│  │  • You feel raw     │ │  People are      ││
│  │    and tired        │ │  pushing you     ││
│  │                     │ │  away            ││
│  │  • Social inter-    │ │                  ││
│  │    actions felt     │ │  You are "too    ││
│  │    different        │ │  much"           ││
│  └─────────────────────┘ └──────────────────┘│
└─────────────────────────────────────────────┘
```

- **Fact card**: Subtle mint/teal tinted background, solid mint left border, normal weight text
- **Story card**: Subtle purple/lavender tinted background, solid purple left border, italic text
- On mobile (<640px): stack vertically with a subtle "vs" divider between them
- Keep the collapsible accordion behavior (collapsed by default)

### Changes

**File: `src/components/ReflectionCard.tsx`**
- Replace the Fact vs Story content inside `CollapsibleSection` (lines 115-135)
- Use a `grid grid-cols-1 sm:grid-cols-2 gap-3` layout
- Fact card: `rounded-xl bg-mint/5 border border-mint/20 p-4` with mint dot bullets
- Story card: `rounded-xl bg-tertiary/5 border border-tertiary/20 p-4` with left-border accent on each item, italic text
- Remove the vertical stacking and add the two-panel layout

No backend or database changes needed. Single file edit.

