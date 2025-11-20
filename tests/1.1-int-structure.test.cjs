'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function assertPathExists(relativePath) {
  const fullPath = path.join(projectRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `Expected path to exist: ${relativePath}`);
}

test('[P0][1.1-INT-001] project structure matches architecture.md', () => {
  assertPathExists('src/main/index.ts');
  assertPathExists('src/main/store.ts');
  assertPathExists('src/main/adapters/base.ts');
  assertPathExists('src/main/adapters/odds-api-io.ts');
  assertPathExists('src/main/adapters/the-odds-api.ts');
  assertPathExists('src/main/services/poller.ts');
  assertPathExists('src/main/services/calculator.ts');
  assertPathExists('src/main/services/router.ts');

  assertPathExists('src/preload/index.ts');

  assertPathExists('src/renderer/index.html');
  assertPathExists('src/renderer/src/main.tsx');
  assertPathExists('src/renderer/src/App.tsx');
  assertPathExists('src/renderer/src/components/ui/button.tsx');

  assertPathExists('shared/types.ts');
  assertPathExists('shared/schemas.ts');
});

