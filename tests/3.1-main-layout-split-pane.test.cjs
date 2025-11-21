'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  const fullPath = path.join(projectRoot, relativePath);
  return fs.readFileSync(fullPath, 'utf8');
}

test('[P1][3.1-INT-001] dashboard layout exposes feed and signal preview panes', () => {
  const contents = read('src/renderer/src/features/dashboard/DashboardLayout.tsx');

  assert.ok(
    contents.includes('data-testid="feed-pane"'),
    'Expected left pane to have stable data-testid="feed-pane"',
  );

  assert.ok(
    contents.includes('data-testid="signal-preview-pane"'),
    'Expected right pane to have stable data-testid="signal-preview-pane"',
  );
});

test('[P1][3.1-INT-002] dashboard left pane uses fixed-width split around 400px', () => {
  const contents = read('src/renderer/src/features/dashboard/DashboardLayout.tsx');

  assert.ok(
    contents.includes('w-[380px]'),
    'Expected left pane base width to be ~380px',
  );
  assert.ok(
    contents.includes('min-w-[360px]'),
    'Expected left pane min width of 360px',
  );
  assert.ok(
    contents.includes('max-w-[440px]'),
    'Expected left pane max width of 440px',
  );
});

test('[P1][3.1-INT-003] dashboard applies Orange Terminal theme at root', () => {
  const appSource = read('src/renderer/src/App.tsx');

  assert.ok(
    appSource.includes('bg-ot-background') && appSource.includes('text-ot-foreground'),
    'Expected App root container to apply bg-ot-background and text-ot-foreground classes',
  );
});

test('[P1][3.1-INT-004] dashboard enforces 900px minimum width via Electron and root container', () => {
  const mainIndexSource = read('src/main/index.ts');

  assert.ok(
    mainIndexSource.includes('minWidth: 900'),
    'Expected BrowserWindow configuration to include minWidth: 900 for dashboard route',
  );

  const cssSource = read('src/renderer/src/index.css');

  assert.ok(
    cssSource.includes('min-w-[900px]'),
    'Expected #root to apply Tailwind min-w-[900px] for dashboard layout',
  );
});

