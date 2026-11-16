# React Bits in TerraScope

Source: https://reactbits.dev/r/{Name}-JS-CSS.json.
The original license is preserved in `LICENSE.md`.

The JS/CSS source was copied directly from the official registry, as supported by React Bits, because this project uses Mantine and plain CSS rather than a shadcn/Tailwind setup. Existing React, Motion, GSAP and Hugeicons dependencies cover the components' actual imports. TargetCursor uses the React 18-compatible `createPortal` API; React was not upgraded solely for the registry's React DOM 19 version hint.

## Integration

- TrueFocus: the three verbs in the home hero. Its interval stops for reduced motion.
- TechText: the interactive TerraScope wordmark on the home page.
- TargetCursor: navigation, primary calls to action and choice cards; retains the system cursor and is disabled on touch and reduced motion.
- Particles: home hero and learning header.
- Galaxy: home decision band, exploration and project headers.
- GhostFibers: lab, lakes and decision headers.
- SplitFlapText: lake inventory metrics, single intro without a repeating loop.
- TextLoop: the source ribbon at the bottom of the home page.
- BranchedMenu: the expanded sidebar, restyled in `styles/experience.css`.

BranchedMenu has a controlled `activeValue` prop to track navigation originating elsewhere in the app, opens the matching group when that value changes, and exposes page semantics and collapsed content to assistive technology.

`Atmosphere` loads only the visible effect, limits pixel density, provides a static surface if rendering fails and removes decorative effects for reduced motion. The original effects also stop while the document is hidden.
