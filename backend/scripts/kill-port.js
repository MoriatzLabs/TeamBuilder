const net = require('net');
const { execSync } = require('child_process');
const fs = require('fs');

const port = process.argv[2] || 3000;

function isPortInUse() {
  try {
    const server = net.createServer();
    return new Promise((resolve) => {
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      });
      server.once('listening', () => {
        server.close();
        resolve(false);
      });
      server.listen(port);
    });
  } catch (err) {
    return true;
  }
}

function killPort() {
  try {
    if (process.platform === 'win32') {
      // Windows
      try {
        const output = execSync(`netstat -ano | findstr :${port}`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });

        const lines = output.trim().split('\n');
        const pids = new Set();

        lines.forEach((line) => {
          const parts = line.trim().split(/\s+/);
          if (parts.length > 0) {
            const pid = parts[parts.length - 1];
            if (pid && !isNaN(pid) && pid !== 'PID') {
              pids.add(pid);
            }
          }
        });

        pids.forEach((pid) => {
          try {
            execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
            console.log(`Killed process ${pid}`);
          } catch (e) {
            // Process might have already been killed
          }
        });
      } catch (e) {
        // Port might not be in use
      }
    } else {
      // macOS/Linux
      try {
        execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`, {
          stdio: 'ignore',
        });
        console.log(`Killed process on port ${port}`);
      } catch (e) {
        // Port might not be in use
      }
    }
  } catch (err) {
    console.error(`Error killing port ${port}:`, err.message);
  }
}

async function waitForPortToBeAvailable(maxWaitTime = 5000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitTime) {
    const inUse = await isPortInUse();
    if (!inUse) {
      return true;
    }
    // Wait 200ms before checking again
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

(async () => {
  const inUse = await isPortInUse();

  if (inUse) {
    console.log(`Port ${port} is in use. Attempting to kill...`);
    killPort();

    // Wait for port to be available
    const available = await waitForPortToBeAvailable();

    if (available) {
      console.log(`Port ${port} is now available`);
      process.exit(0);
    } else {
      console.error(`Failed to free port ${port}. Please manually kill the process.`);
      process.exit(1);
    }
  } else {
    console.log(`Port ${port} is available`);
    process.exit(0);
  }
})();
