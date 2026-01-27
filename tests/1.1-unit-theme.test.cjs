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

  const expectOneOf = (actual, allowed, label) => {
    assert.ok(
      allowed.includes(actual),
      `Expected ${label} to be one of: ${allowed.join(', ')} (got ${actual})`,
    );
  };

  expectOneOf(colors['ot-background'], ['#0F172A', 'var(--ot-background)'], 'ot-background');
  expectOneOf(colors['ot-foreground'], ['#F8FAFC', 'var(--ot-foreground)'], 'ot-foreground');
  expectOneOf(colors['ot-accent'], ['#F97316', 'var(--ot-accent)'], 'ot-accent');
});
