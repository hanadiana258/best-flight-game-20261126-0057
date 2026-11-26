// Keyboard and mouse: which controls are held this frame, plus one-shot key
// presses the game consumes for screens and view toggles.

export const AXIS_PITCH = 'pitch';
export const AXIS_ROLL = 'roll';
export const AXIS_YAW = 'yaw';
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_VIEW = 'view';
export const ACTION_UP = 'up';
export const ACTION_DOWN = 'down';

const HELD = {
  pitch: ['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'],
  roll: ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'],
  yaw: ['KeyQ', 'KeyE'],
  throttleUp: ['ShiftLeft', 'ShiftRight', 'KeyR'],
  throttleDown: ['ControlLeft', 'ControlRight', 'KeyF'],
};

export function createInput(canvas) {
  const down = new Set();
  const pressed = new Set();

  function onKeyDown(event) {
    if (event.repeat) return;
    if (HELD.pitch.includes(event.code) || HELD.roll.includes(event.code) ||
        HELD.yaw.includes(event.code) || event.code === 'Space') event.preventDefault();
    down.add(event.code);
    pressed.add(event.code);
  }
  function onKeyUp(event) {
    down.delete(event.code);
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return {
    // -1..1, where a negative pitch is nose-up (stick back) and negative roll is left.
    axis(name) {
      let v = 0;
      const codes = HELD[name];
      if (down.has(codes[0]) || down.has(codes[2])) v -= 1;
      if (down.has(codes[1]) || down.has(codes[3])) v += 1;
      return v;
    },
    throttle(dir) {
      if (dir > 0) return down.has(HELD.throttleUp[0]) || down.has(HELD.throttleUp[1]) ? 1 : 0;
      return down.has(HELD.throttleDown[0]) || down.has(HELD.throttleDown[1]) ? 1 : 0;
    },
    /** Consume one-shot presses; `code` is a KeyboardEvent.code. */
    take(code) {
      if (pressed.has(code)) { pressed.delete(code); return true; }
      return false;
    },
    action(name) {
      const map = {
        [ACTION_CONFIRM]: ['Space', 'Enter'],
        [ACTION_PAUSE]: ['KeyP', 'Escape'],
        [ACTION_VIEW]: ['KeyC'],
        [ACTION_UP]: ['ArrowUp', 'KeyW'],
        [ACTION_DOWN]: ['ArrowDown', 'KeyS'],
      };
      for (const code of map[name]) if (this.take(code)) return true;
      return false;
    },
    endFrame() {
      pressed.clear();
    },
    release() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
}
