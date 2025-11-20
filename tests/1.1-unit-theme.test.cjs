'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
// eslint-disable-next-line import/no-dynamic-require, global-require
const tailwindConfig = require(path.join(projectRoot, 'tailwind.config.cjs'));

test('[P1][1.1-UNIT-001] theme tokens match Orange Terminal palette', () => {
  const colors =
    tailwindConfig?.theme?.extend?.colors || {};

  assert.strictEqual(
    colors['ot-background'],
    '#0F172A',
    'Expected ot-background to be #0F172A',
  );
  assert.strictEqual(
    colors['ot-foreground'],
    '#F8FAFC',
    'Expected ot-foreground to be #F8FAFC',
  );
  assert.strictEqual(
    colors['ot-accent'],
    '#F97316',
    'Expected ot-accent to be #F97316',
  );
});

