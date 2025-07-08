if (typeof global.MessagePort === 'undefined') {
  // Minimal stub, enough for undici to not throw
  // @ts-ignore
  global.MessagePort = class {};
} 