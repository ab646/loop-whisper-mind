

## Make Fact vs Story More Visually Distinct

Right now both "known" (facts) and "assumed" (stories) items use the same bullet list with only a subtle color/italic difference. The screenshot confirms they blend together.

### Changes to `src/components/ReflectionCard.tsx`

Split the list into two labeled groups with clear visual separation:

1. **Add sub-headers** — a small "FACT" label (mint colored) before the known items and a "STORY" label (muted) before the assumed items
2. **Stronger visual differentiation for stories** — wrap assumed items in a subtle bordered/dimmed container or use a distinct left-border accent to set them apart from facts
3. **Keep facts as solid white text with mint bullet, keep stories italic + muted with a gray bullet** (already exists, just reinforce with grouping)

Layout would become:

```text
FACT VS STORY                              ^
┌─────────────────────────────────────────┐
│  FACT                                   │
│  • You feel physically raw and tired    │
│  • Specific social interactions felt... │
│                                         │
│  STORY                                  │
│  ┃ These small shifts mean people...    │
│  ┃ You are 'too much' or 'hard to...'  │
└─────────────────────────────────────────┘
```

Specifically:
- Add `<span className="label-uppercase text-mint text-[10px] mb-1">Fact</span>` before known items
- Add `<span className="label-uppercase text-on-surface-variant text-[10px] mb-1 mt-3">Story</span>` before assumed items
- Wrap story items in a container with `border-l-2 border-on-surface-variant/30 pl-3` to visually separate them as "less solid"
- Change story bullets from dots to no bullet (the left border serves as the marker)

This makes it immediately obvious which items are grounded facts and which are narratives/assumptions.

### Files
- `src/components/ReflectionCard.tsx` — update the Fact vs Story collapsible section

