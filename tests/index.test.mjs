import test from 'node:test';
import assert from 'node:assert/strict';
import { createToastTimeline } from '../dist/esm/index.js';

test('fake clock lifetime expires once at exact boundary', () => {
  let now = 0;
  const t = createToastTimeline({ now: () => now });
  t.add({ id: 'a', duration: 10, height: 20 });
  now = 9;
  assert.equal(t.layout()[0].remaining, 1);
  now = 10;
  assert.deepEqual(t.tick(), ['a']);
  assert.deepEqual(t.tick(), []);
  assert.equal(t.dismiss('a'), false);
});
test('pause resume preserves remaining time across arbitrary ticks', () => {
  let now = 0;
  const t = createToastTimeline({ now: () => now });
  t.add({ id: 'a', duration: 10, height: 20 });
  now = 4;
  assert.equal(t.pause('a'), true);
  now = 50;
  assert.equal(t.layout()[0].remaining, 6);
  assert.equal(t.pause('a'), true);
  assert.equal(t.resume('a'), true);
  now = 55;
  assert.equal(t.layout()[0].remaining, 1);
  now = 56;
  assert.deepEqual(t.tick(), ['a']);
});
test('pause at deadline cannot resurrect a toast', () => {
  let now = 0;
  const t = createToastTimeline({ now: () => now });
  t.add({ id: 'a', duration: 5, height: 1 });
  now = 5;
  assert.equal(t.pause('a'), false);
  assert.equal(t.resume('a'), false);
  assert.deepEqual(t.layout(), []);
});
test('staggered additions have independent remaining durations', () => {
  let now = 0;
  const t = createToastTimeline({ now: () => now });
  t.add({ id: 'a', duration: 10, height: 1 });
  now = 4;
  t.add({ id: 'b', duration: 10, height: 1 });
  now = 10;
  assert.deepEqual(t.tick(), ['a']);
  assert.equal(t.layout()[0].remaining, 4);
});
test('layout stacks heights gaps and reflows after dismissal', () => {
  const t = createToastTimeline({ now: () => 0, gap: 3 });
  const a = { id: 'a', duration: 10, height: 20 };
  t.add(a);
  t.add({ id: 'b', duration: 10, height: 30 });
  a.height = 999;
  assert.deepEqual(
    t.layout().map((i) => i.offset),
    [0, 23],
  );
  t.layout()[0].height = 900;
  t.dismiss('a');
  assert.deepEqual(
    t.layout().map((i) => [i.id, i.offset]),
    [['b', 0]],
  );
});
test('duplicate and full checks do not replace lifecycle and IDs can be reused', () => {
  const t = createToastTimeline({ now: () => 0, capacity: 1 });
  t.add({ id: 'a', duration: 10, height: 1 });
  assert.throws(() => t.add({ id: 'a', duration: 99, height: 1 }), TypeError);
  assert.throws(() => t.add({ id: 'b', duration: 10, height: 1 }), RangeError);
  assert.equal(t.layout()[0].duration, 10);
  t.dismiss('a');
  t.add({ id: 'a', duration: 2, height: 1 });
  assert.equal(t.layout()[0].remaining, 2);
});
test('invalid bounds durations and regressing clock reject', () => {
  assert.throws(() => createToastTimeline({ now: () => 0, gap: -1 }), RangeError);
  assert.throws(() => createToastTimeline({ now: () => 0, capacity: 0 }), RangeError);
  let now = 3;
  const t = createToastTimeline({ now: () => now });
  for (const duration of [0, -1, Infinity, NaN])
    assert.throws(() => t.add({ id: 'a', duration, height: 1 }), TypeError);
  t.tick();
  now = 2;
  assert.throws(() => t.tick(), RangeError);
  now = NaN;
  assert.throws(() => t.tick(), RangeError);
});

test('clock failures roll back all lifetime settlement and preserve thrown undefined', () => {
  let now = 5,
    throwing = false;
  const options = {
    now: () => {
      if (throwing) throw undefined;
      return now;
    },
  };
  const timeline = createToastTimeline(options);
  timeline.add({ id: 'a', duration: 10, height: 1 });
  options.now = () => 1000;
  now = 4;
  assert.throws(() => timeline.dismiss('a'), RangeError);
  throwing = true;
  let caught = false;
  try {
    timeline.pause('a');
  } catch (error) {
    caught = true;
    assert.equal(error, undefined);
  }
  assert.equal(caught, true);
  throwing = false;
  now = 10;
  assert.equal(timeline.layout()[0].remaining, 5);
  now = 15;
  assert.deepEqual(timeline.tick(), ['a']);
});

test('settling expiry before add allows exact-deadline reuse without stale timers', () => {
  let now = 0;
  const timeline = createToastTimeline({ now: () => now, capacity: 1 });
  timeline.add({ id: 'a', duration: 5, height: 1 });
  now = 5;
  timeline.add({ id: 'a', duration: 10, height: 2 });
  now = 6;
  assert.deepEqual(
    timeline.layout().map((t) => [t.id, t.remaining, t.height]),
    [['a', 9, 2]],
  );
  now = 15;
  assert.deepEqual(timeline.tick(), ['a']);
});
