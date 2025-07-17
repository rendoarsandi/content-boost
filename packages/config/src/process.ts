import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export interface ProcessConfig {
  timeouts: {
    devServer: number; // 30 seconds warning
    build: number; // 10 minutes max
    test: number; // 5 minutes per test file
    migration: number; // 2 minutes max
  };
  backgroundProcesses: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    logRotation: boolean;
    maxLogSize: string; // '100MB'
  };
}

export const defaultProcessConfig: ProcessConfig = {
  timeouts: {
    devServer: 30 * 1000, // 30 seconds
    build: 10 * 60 * 1000, // 10 minutes
    test: 5 * 60 * 1000, // 5 minutes
    migration: 2 * 60 * 1000, // 2 minutes
  },
  backgroundProcesses: {
    enabled: true,
    logLevel: 'info',
    logRotation: true,
    maxLogSize: '100MB',
  },
};

export interface ProcessOptions {
  killSignal?: NodeJS.Signals;
  showWarning?: boolean;
  allowContinue?: boolean;
  cwd?: string;
  env?: Record<string, string>;
}

export interface BackgroundProcessOptions {
  autoRestart?: boolean;
  maxRestarts?: number;
  logPath?: string;
}

export class ProcessManager {
  private static processes: Map<string, ChildProcess> = new Map();
  private static config: ProcessConfig = defaultProcessConfig;

  static setConfig(config: Partial<ProcessConfig>) {
    this.config = { ...this.config, ...config };
  }

  static async runWithTimeout<T>(
    command: string,
    args: string[],
    timeoutMs: number,
    options: ProcessOptions = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const {
        killSignal = 'SIGTERM',
        showWarning = true,
        allowContinue = true,
        cwd = process.cwd(),
        env = process.env as Record<string, string>,
      } = options;

      console.log(`🚀 Running: ${command} ${args.join(' ')}`);
      
      const child = spawn(command, args, {
        cwd,
        env: { ...process.env, ...env },
        stdio: 'inherit',
      });

      let isResolved = false;
      let warningShown = false;

      // Warning timeout
      const warningTimeout = setTimeout(() => {
        if (!isResolved && showWarning && !warningShown) {
          warningShown = true;
          console.warn(`⚠️  Process running longer than expected (${timeoutMs / 1000}s)`);
          
          if (allowContinue) {
            console.log('Press Ctrl+C to terminate or let it continue...');
          }
        }
      }, timeoutMs);

      // Kill timeout (if not allowing continue)
      const killTimeout = setTimeout(() => {
        if (!isResolved && !allowContinue) {
          console.error(`❌ Process timed out after ${timeoutMs / 1000}s, terminating...`);
          child.kill(killSignal);
        }
      }, timeoutMs * 2);

      child.on('close', (code) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(warningTimeout);
          clearTimeout(killTimeout);
          
          if (code === 0) {
            console.log('✅ Process completed successfully');
            resolve({} as T);
          } else {
            reject(new Error(`Process exited with code ${code}`));
          }
        }
      });

      child.on('error', (error) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(warningTimeout);
          clearTimeout(killTimeout);
          reject(error);
        }
      });

      // Handle process termination
      process.on('SIGINT', () => {
        if (!isResolved) {
          console.log('\n🛑 Received SIGINT, terminating process...');
          child.kill(killSignal);
        }
      });
    });
  }

  static async runBackground(
    id: string,
    command: string,
    args: string[],
    options: BackgroundProcessOptions = {}
  ): Promise<void> {
    const {
      autoRestart = false,
      maxRestarts = 3,
      logPath = path.join(process.cwd(), 'logs', 'app', `${id}.log`),
    } = options;

    // Ensure log directory exists
    await fs.mkdir(path.dirname(logPath), { recursive: true });

    let restartCount = 0;

    const startProcess = () => {
      console.log(`🔄 Starting background process: ${id}`);
      
      const child = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      // Log output to file
      const logStream = require('fs').createWriteStream(logPath, { flags: 'a' });
      child.stdout?.pipe(logStream);
      child.stderr?.pipe(logStream);

      child.on('close', (code) => {
        console.log(`📝 Background process ${id} exited with code ${code}`);
        
        if (autoRestart && restartCount < maxRestarts && code !== 0) {
          restartCount++;
          console.log(`🔄 Restarting ${id} (attempt ${restartCount}/${maxRestarts})`);
          setTimeout(startProcess, 5000); // Wait 5 seconds before restart
        }
      });

      child.on('error', (error) => {
        console.error(`❌ Background process ${id} error:`, error);
      });

      this.processes.set(id, child);
    };

    startProcess();
  }

  static killProcess(id: string): boolean {
    const process = this.processes.get(id);
    if (process) {
      process.kill('SIGTERM');
      this.processes.delete(id);
      console.log(`🛑 Killed process: ${id}`);
      return true;
    }
    return false;
  }

  static killAllProcesses(): void {
    console.log('🛑 Killing all background processes...');
    for (const [id, process] of this.processes) {
      process.kill('SIGTERM');
      console.log(`🛑 Killed process: ${id}`);
    }
    this.processes.clear();
  }

  static getRunningProcesses(): string[] {
    return Array.from(this.processes.keys());
  }
}

// Cleanup on exit
process.on('exit', () => {
  ProcessManager.killAllProcesses();
});

process.on('SIGINT', () => {
  ProcessManager.killAllProcesses();
  process.exit(0);
});

process.on('SIGTERM', () => {
  ProcessManager.killAllProcesses();
  process.exit(0);
});