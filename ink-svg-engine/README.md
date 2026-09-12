# INK SVG Fighting Animation Engine

INK is the experimental SVG animation layer for this repository's fighting game. It separates **rig → pose → deformation → SVG rendering** so character modeling and move choreography can evolve without mixing those concerns into combat rules.

## Open in GitHub Pages

- `dist/svg-fighter-engine-studio.html` — animation editor / studio
- `dist/street-fighter-6-ink.html` — combat preview with a reversible INK/legacy renderer toggle

The generated `dist/` files are rebuilt automatically by `.github/workflows/ink-build.yml` whenever the engine/editor sources change.

## Source layout

- `src/ink/core.js` — skeleton, two-bone IK, timeline sampling, event gating and path deformation helpers
- `src/ink/assets.js` — eight fighter body profiles, attachments and art binding
- `src/ink/renderer.js` — retained SVG scene, continuous limb contours, view layers and secondary motion
- `src/ink/clips.js` — authored move clips and signature choreography
- `src/ink/game-adapter.js` — bridge to the existing fighting-game runtime without changing hit/damage/input rules
- `src/ink/game-panel.js` — renderer comparison controls in the combat preview
- `engine-studio/` — editor UI, keyframe authoring, import/export and frame inspection
- `tools/` — deterministic builders and verification
- `docs/` — architecture/API/research notes

## Editor workflow

1. Choose a fighter and move.
2. Switch between character, skeleton overlay, silhouette and rig views.
3. Pause and enable bone dragging.
4. Drag wrists/ankles, adjust torso twist/body lean, then write a keyframe.
5. Export move JSON or the current SVG frame.

The editor is intentionally separate from hit detection and game balance. Authored root motion should be integrated into combat only after hit frames, attachment points and cancel windows are aligned.

## Scope

This is a fan-made SVG research implementation. It does not ship official 3D models or proprietary game assets. Iori is treated as a crossover guest rather than an SF6 roster claim.
