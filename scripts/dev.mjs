import { spawn } from 'node:child_process';

const commands = [
  ['worker', ['--workspace', 'zeromalaria-worker', 'run', 'dev']],
  ['web', ['--workspace', 'zeromalaria-web', 'run', 'dev']],
];

const children = commands.map(([name, args]) => {
  const child = spawn('npm', args, { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`${name} exited with code ${code}`);
  });
  return child;
});

function stop() {
  for (const child of children) child.kill('SIGTERM');
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
await Promise.all(children.map((child) => new Promise((resolve) => child.on('exit', resolve))));
