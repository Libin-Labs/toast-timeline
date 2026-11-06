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

// @ts-expect-error invalid public API input must be rejected
createToastTimeline({ now: () => 0 }).add({ id: 'a', duration: 'forever', height: 1 });
