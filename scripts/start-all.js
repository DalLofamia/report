const { spawn } = require('child_process');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const serverDir = path.join(appRoot, 'server');

function startProcess(command, args, cwd, label) {
  const child = spawn(command, args, {
    cwd,
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (signal || code !== 0) {
      console.error(`${label} exited with ${signal || code}`);
      process.exit(code || 1);
    }
  });

  return child;
}

const server = startProcess('npm', ['start'], serverDir, 'Server');
const client = startProcess('npm', ['run', 'start:client'], appRoot, 'Client');

function stopChildren() {
  if (!server.killed) {
    server.kill();
  }
  if (!client.killed) {
    client.kill();
  }
}

process.on('SIGINT', () => {
  stopChildren();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopChildren();
  process.exit(0);
});
