const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const candidates = [
    path.join(root, '.venv', 'Scripts', 'python.exe'),
    path.join(root, 'backend', 'venv', 'Scripts', 'python.exe'),
    path.join(root, '.venv', 'bin', 'python'),
    path.join(root, 'backend', 'venv', 'bin', 'python'),
];

let pyExec = 'python';
for (const cand of candidates) {
    if (fs.existsSync(cand)) {
        pyExec = cand;
        break;
    }
}

console.log(`[RideMap Launcher] Using Python: ${pyExec}`);
const child = spawn(pyExec, ['ridemap_full_stack_all_in_one.py'], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
});

child.on('error', (err) => {
    console.error('[RideMap Launcher] Failed to start:', err.message);
});
