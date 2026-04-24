// Polyfill encoding globals for Jest's VM context.
// Jest's node environment doesn't automatically expose all Node 22 built-ins.
const { TextEncoder, TextDecoder } = require('util');
if (typeof globalThis.TextEncoder === 'undefined') globalThis.TextEncoder = TextEncoder;
if (typeof globalThis.TextDecoder === 'undefined') globalThis.TextDecoder = TextDecoder;
