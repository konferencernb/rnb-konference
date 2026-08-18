# Feature: Basic UI Implementation

## Summary

Implement the basic application UI, using `docs/concepts/ui` as design/reference inspiration.

## Requirements

### 1. UI Foundation

- Implement a basic UI based on the concepts and direction described in `docs/concepts/ui`.
- Treat `docs/concepts/ui` as the source of truth for layout, structure, and visual direction — review it before starting implementation.

### 2. Component Structure

- Break the UI down into reusable components wherever it makes sense, for example:
  - `Navbar`
  - `Footer`
  - Any other logical, reusable pieces identified while implementing the layout (e.g. page containers, sidebars, cards, sections)
- Each component should be self-contained and placed in the appropriate components directory following the project's existing conventions.

### 3. Component Library

- Use **shadcn/ui** components wherever possible instead of building custom elements from scratch.
- Limit raw/plain HTML elements — prefer shadcn (or existing project) components for buttons, inputs, layout primitives, navigation, etc.
- Only fall back to raw HTML when no suitable shadcn component exists or is practical for the use case.

## Acceptance Criteria

- [x] UI reflects the direction/inspiration in `docs/concepts/ui`
- [x] Navbar and Footer components exist and are used in the layout
- [x] Additional sensible components are extracted rather than inlined
- [x] shadcn components are used in place of raw HTML wherever reasonably possible
- [x] Raw HTML usage is minimized and justified where it remains
