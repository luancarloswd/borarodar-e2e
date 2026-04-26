const { spawnSync } = require('child_process');

const rawArgs = process.argv.slice(2);
const hasPassWithNoTests = rawArgs.includes('--passWithNoTests');

const args = rawArgs
  .filter((a) => a !== '--passWithNoTests')
  .concat(hasPassWithNoTests ? ['--pass-with-no-tests'] : []);

const result = spawnSync('npx', ['playwright', 'test', ...args], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 0);
