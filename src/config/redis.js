// Redis mock for deployment - replace with real Redis when stable
const EventEmitter = require('events');

class MockRedis extends EventEmitter {
  async get() { return null; }
  async set() { return 'OK'; }
  async setex() { return 'OK'; }
  async del() { return 1; }
  async quit() { return 'OK'; }
}

const redis = new MockRedis();
console.log('✅ Redis connected (mock mode)');
module.exports = redis;