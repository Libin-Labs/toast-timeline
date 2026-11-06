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
export function createToastTimeline(options: TimelineOptions): ToastTimeline {
  const capacity = options.capacity ?? 20;
  const gap = options.gap ?? 8;
  const clock = options.now;
  if (typeof clock !== 'function') throw new TypeError('Clock must be a function');
  if (
    !Number.isSafeInteger(capacity) ||
    capacity < 1 ||
    capacity > 10000 ||
    !Number.isFinite(gap) ||
    gap < 0 ||
    gap > 1e9
  )
    throw new RangeError('Invalid layout options');
  const items = new Map<string, ToastState>();
  let last: number | undefined;
  function tick(): string[] {
    const now = clock();
    if (!Number.isFinite(now) || (last !== undefined && now < last))
      throw new RangeError('Invalid clock');
    const elapsed = last === undefined ? 0 : now - last;
    last = now;
    const expired: string[] = [];
    for (const [id, item] of items) {
      if (!item.paused) item.remaining = Math.max(0, item.remaining - elapsed);
      if (item.remaining === 0) {
        items.delete(id);
        expired.push(id);
      }
    }
    return expired;
  }
  return {
    tick,
    add(toast) {
      if (
        typeof toast.id !== 'string' ||
        !toast.id ||
        !Number.isFinite(toast.duration) ||
        toast.duration <= 0 ||
        !Number.isFinite(toast.height) ||
        toast.height < 0 ||
        toast.height > 1e9
      )
        throw new TypeError('Invalid toast');
      tick();
      if (items.has(toast.id)) throw new TypeError('Duplicate toast');
      if (items.size >= capacity) throw new RangeError('Timeline full');
      items.set(toast.id, { ...toast, remaining: toast.duration, paused: false, offset: 0 });
    },
    pause(id) {
      tick();
      const item = items.get(id);
      if (!item) return false;
      item.paused = true;
      return true;
    },
    resume(id) {
      tick();
      const item = items.get(id);
      if (!item) return false;
      item.paused = false;
      return true;
    },
    dismiss(id) {
      tick();
      return items.delete(id);
    },
    layout() {
      tick();
      let offset = 0;
      return [...items.values()].map((item) => {
        const result = { ...item, offset };
        offset += item.height + gap;
        return result;
      });
    },
  };
}
