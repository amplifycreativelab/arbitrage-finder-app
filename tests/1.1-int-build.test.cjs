'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');

function readPackageJson() {
  const pkgPath = path.join(projectRoot, 'package.json');
  const raw = fs.readFileSync(pkgPath, 'utf8');
  return JSON.parse(raw);
}

test('[P0][1.1-INT-002] npm scripts defined for dev and build:win', () => {
  const pkg = readPackageJson();
  assert.ok(pkg.scripts, 'Expected scripts section in package.json');
  assert.strictEqual(
    pkg.scripts.dev,
    'electron-vite dev',
    'Expected "dev" script to run electron-vite dev',
  );

  assert.ok(pkg.scripts.build, 'Expected "build" script to be defined');
  assert.ok(
    pkg.scripts['build:win'],
    'Expected "build:win" script to be defined for Windows packaging',
  );
});

test(
  '[P0][1.1-INT-002] npm run build succeeds without errors',
  { timeout: 10 * 60 * 1000 },
  async () => {
    await new Promise((resolve, reject) => {
      const child = spawn('npm', ['run', 'build'], {
        cwd: projectRoot,
        shell: true,
        env: { ...process.env, CI: 'true' },
      });

      let stderr = '';

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (err) => {
        reject(err);
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `"npm run build" failed with exit code ${code}. Stderr:\n${stderr}`,
            ),
          );
        } else {
          resolve();
        }
      });
    });
  },
);
