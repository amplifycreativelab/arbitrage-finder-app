'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

const projectRoot = path.resolve(__dirname, '..');

if (typeof global.window === 'undefined') {
  global.window = {};
}

const DashboardLayout = require('../out-tests/src/renderer/src/features/dashboard/DashboardLayout.js').default;

function read(relativePath) {
  const fullPath = path.join(projectRoot, relativePath);
  return fs.readFileSync(fullPath, 'utf8');
}

function renderToHtml(element) {
  return ReactDOMServer.renderToString(element);
}

test('[P1][3.1-INT-001] dashboard layout exposes feed and signal preview panes at runtime', () => {
  const html = renderToHtml(React.createElement(DashboardLayout));

  assert.ok(
    html.includes('data-testid="feed-pane"'),
    'Expected left pane to have stable data-testid="feed-pane"',
  );

  assert.ok(
    html.includes('data-testid="signal-preview-pane"'),
    'Expected right pane to have stable data-testid="signal-preview-pane"',
  );
});

test('[P1][3.1-INT-002] dashboard left pane uses fixed-width split around 400px at runtime', () => {
  const html = renderToHtml(React.createElement(DashboardLayout));

  assert.ok(
    html.includes('w-[380px]'),
    'Expected left pane base width to be ~380px',
  );
  assert.ok(
    html.includes('min-w-[360px]'),
    'Expected left pane min width of 360px',
  );
  assert.ok(
    html.includes('max-w-[440px]'),
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
