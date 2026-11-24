const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.createContext(context);
for (const name of ['packs-catalog', 'pack-previews', 'pack-inventory']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'scripts', name + '.js'), 'utf8'), context);
}

for (const pack of context.window.RAISEUP_PACKS) {
  test(pack.title + ': at least 20 existing, distinct audio previews and an audited file count', () => {
    const samples = context.window.RAISEUP_PACK_PREVIEWS[pack.id] || [];
    assert.ok(samples.length >= 20, 'Checkout needs at least 20 previews');
    assert.equal(new Set(samples.map(s => s.src)).size, samples.length, 'Duplicate preview URL');
    const hashes = samples.map(sample => {
      assert.match(sample.src, /^assets\/audio\/(?:pack-previews|hifi-previews)\/[a-z0-9-]+\/[a-z0-9-]+\.wav$/);
      const bytes = fs.readFileSync(path.join(root, sample.src));
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', 'Unreadable WAV');
      assert.equal(bytes.toString('ascii', 8, 12), 'WAVE', 'Unreadable WAV');
      for (let offset = 12; offset + 8 <= bytes.length;) {
        const size = bytes.readUInt32LE(offset + 4);
        if (bytes.toString('ascii', offset, offset + 4) === 'data') {
          assert.ok(size > 0 && offset + 8 + size <= bytes.length, 'Truncated audio');
          return crypto.createHash('sha256').update(bytes.subarray(offset + 8, offset + 8 + size)).digest('hex');
        }
        offset += 8 + size + (size & 1);
      }
      assert.fail('Missing WAV audio data');
    });
    assert.equal(new Set(hashes).size, samples.length, 'Duplicate audio data');
    const inventory = context.window.RAISEUP_PACK_INVENTORY[pack.id];
    assert.equal(inventory.folderInventoryVerified, true);
    assert.equal(inventory.deliveryFolderAudioCount, inventory.sourceAudioCount);
    if (pack.soundCount) assert.equal(pack.soundCount, inventory.deliveryFolderAudioCount);
  });
}
