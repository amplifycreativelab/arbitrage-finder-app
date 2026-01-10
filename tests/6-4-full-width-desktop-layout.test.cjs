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

test('[Task 1] App.tsx should not constrain main layout width', () => {
    const appSource = read('src/renderer/src/App.tsx');
    
    // Check for removal of max-w-6xl
    assert.strictEqual(
        appSource.includes('max-w-6xl'), 
        false, 
        'Should remove max-w-6xl constraint from App.tsx'
    );
});

test('[Task 1] App.tsx should have full width container and adjusted padding', () => {
   const appSource = read('src/renderer/src/App.tsx');
   
   // Check for w-full
   assert.ok(
       appSource.includes('w-full'),
       'Should use w-full for main container'
   );

   // Check for adjusted padding
   assert.ok(
       appSource.includes('px-4') && appSource.includes('md:px-6') && appSource.includes('lg:px-8'),
       'Should use responsive horizontal padding'
   );
});

test('[Task 2] DashboardLayout should have fluid pane widths', () => {
    const layoutSource = read('src/renderer/src/features/dashboard/DashboardLayout.tsx');
    
    // Check removal of fixed width
    assert.strictEqual(
        layoutSource.includes('w-[380px]'),
        false,
        'Should remove fixed width w-[380px]'
    );
    assert.strictEqual(
        layoutSource.includes('max-w-[440px]'),
        false,
        'Should remove max width max-w-[440px]'
    );

    assert.ok(
        layoutSource.includes('min-w-[360px]'),
        'Should keep min-w constraint'
    );
});
