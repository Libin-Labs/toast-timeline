# @lp-labs/toast-timeline

Deterministic pausable toast lifetimes and stable height-aware stacking plans.

Standalone original implementation with zero runtime, peer or sibling dependencies.
Library ID 437. ES2022, strict TypeScript, NodeNext ESM and CommonJS with declarations.

## Install

```bash
npm install @lp-labs/toast-timeline
```

CommonJS: `const { createToastTimeline } = require('@lp-labs/toast-timeline')`.

## Quickstart

```js
import { createToastTimeline } from '@lp-labs/toast-timeline';

let now = 0;
const timeline = createToastTimeline({ now: () => now, gap: 4 });
timeline.add({ id: 'saved', duration: 100, height: 24 });
now = 40;
timeline.pause('saved');
now = 500;
if (timeline.layout()[0]?.remaining !== 60) throw new Error('Pause failed');
timeline.resume('saved');
now = 560;
if (timeline.tick()[0] !== 'saved') throw new Error('Expiry failed');
```

## API, customization and contracts

`createToastTimeline({ now, capacity?, gap? })` accepts a caller's finite monotonic clock.
Capacity defaults to 20, integer 1..10000; gap defaults to 8, finite 0..1e9.
All time values share caller units. No timers are installed: call tick or another public
method when your adapter's clock advances.

`add({ id, duration, height })` copies a unique nonempty ID, positive finite duration and
height in 0..1e9; it first settles older records at now, then starts the new toast at full
duration. Duplicate IDs throw TypeError; full capacity throws RangeError. Expired/dismissed
IDs can be reused as new lifecycles.
`tick()` subtracts elapsed clock time from all unpaused records, removes remaining <= 0
once, and returns expired IDs in insertion order. Other methods also settle time first;
expiration IDs are only returned by an explicit tick, not retained as an event backlog.
`pause(id)` and `resume(id)` return false for absent/expired IDs and otherwise set paused
state idempotently; pausing at the exact deadline cannot revive an expired toast.
`dismiss(id)` removes a live record and returns a boolean. `layout()` returns copied records
in insertion order with offsets: first 0, each next = previous offset + height + gap.
Dismissal/expiration reflows the stack without changing surviving IDs or remaining times.

Invalid duration/height/ID throw TypeError; invalid bounds or regressing/nonfinite clocks
throw RangeError. The clock callback is captured at construction. A regressing/nonfinite/
throwing clock does not settle time or mutate lifecycle state; arbitrary thrown values,
including undefined, propagate unchanged. Reads and writes are synchronous; there are no
asynchronous timer races.
Every operation is O(N), memory O(capacity). Adapters own ticks, rendering, placement
direction, transitions and interaction events; pausing is per ID, not global.

## Complete public declarations

```ts
export interface Toast {
  id: string;
  duration: number;
  height: number;
}
export interface ToastState extends Toast {
  remaining: number;
  paused: boolean;
  offset: number;
}
export interface TimelineOptions {
  now: () => number;
  capacity?: number;
  gap?: number;
}
export interface ToastTimeline {
  add(toast: Toast): void;
  pause(id: string): boolean;
  resume(id: string): boolean;
  dismiss(id: string): boolean;
  tick(): string[];
  layout(): ToastState[];
}
export declare function createToastTimeline(options: TimelineOptions): ToastTimeline;
```

## Scope and performance

Headless clock-driven toast lifecycle and offsets, not a notification queue, scheduler, DOM renderer or animation engine.

Complexities and bounds above assume ordinary JavaScript number arithmetic and Map/Set
average constant-time lookup. No runtime or peer dependencies, automatic browser adapters,
global registries or hidden services are included. Importing the module has no browser effects.

## Development

```bash
npm ci --offline --no-audit --no-fund
npm run build
npm run typecheck
npm test
npm run format:check
```

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
