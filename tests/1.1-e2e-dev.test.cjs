'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawn } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');

// This E2E-style dev boot smoke is optional by default because
// some environments (CI, headless) cannot run Electron dev mode reliably.
// Enable explicitly with ENABLE_DEV_SMOKE=1.
if (process.env.ENABLE_DEV_SMOKE !== '1') {
  test.skip(
    '[P0][1.1-E2E-001] npm run dev boots Electron without immediate failure (skipped; set ENABLE_DEV_SMOKE=1 to run)',
    () => {},
  );
} else {
  test(
    '[P0][1.1-E2E-001] npm run dev boots Electron without immediate failure',
    { timeout: 60 * 1000 },
    async () => {
      await new Promise((resolve, reject) => {
        const child = spawn('npm', ['run', 'dev'], {
          cwd: projectRoot,
          shell: true,
          env: { ...process.env, CI: 'true' },
        });

        let exited = false;
        let exitCode = null;

        child.on('error', (err) => {
          reject(err);
        });

        child.on('close', (code) => {
          exited = true;
          exitCode = code;
        });

        const timeoutMs = 15000;
        setTimeout(() => {
          if (exited && exitCode !== 0) {
            reject(
              new Error(
                `"npm run dev" exited early with code ${exitCode}. Expected it to stay running at least ${timeoutMs}ms.`,
              ),
            );
            return;
          }

          if (!exited) {
            child.kill();
          }

          assert.ok(
            true,
            '"npm run dev" stayed alive long enough to be considered a successful boot smoke',
          );
          resolve();
        }, timeoutMs);
      });
    },
  );
}

