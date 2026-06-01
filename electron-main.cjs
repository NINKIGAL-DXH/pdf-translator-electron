const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

process.env.NODE_ENV = 'production';
process.env.PORT = '5050';

let mainWindow;
let pythonProcess;

function findPython() {
  const candidates = ['python3.12', 'python3.13', 'python3.11', 'python3', 'python'];
  for (const cmd of candidates) {
    try {
      const { execSync } = require('child_process');
      const ver = execSync(`${cmd} --version 2>&1`).toString().trim();
      const match = ver.match(/(\d+)\.(\d+)/);
      if (match && match[1] === '3' && parseInt(match[2]) < 14) {
        return cmd;
      }
    } catch {}
  }
  return null;
}

function startPythonBackend() {
  const python = findPython();
  if (!python) {
    dialog.showErrorBox(
      'Python Not Found',
      'Python 3.11-3.13 is required.\n\nPlease install: brew install python@3.12'
    );
    app.quit();
    return;
  }

  const appDir = path.join(__dirname);
  pythonProcess = spawn(python, ['app.py'], {
    cwd: appDir,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  pythonProcess.stdout.on('data', (data) => console.log(`Python: ${data}`));
  pythonProcess.stderr.on('data', (data) => console.log(`Python: ${data}`));
  pythonProcess.on('close', (code) => console.log(`Python exited: ${code}`));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'PDF Translator',
    autoHideMenuBar: true,
    backgroundColor: '#0F0F0F',
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    const isCmd = input.control || input.meta;
    if (isCmd && input.key.toLowerCase() === 'r') {
      mainWindow.reload();
      event.preventDefault();
    }
    if (input.key === 'F12' || (isCmd && input.alt && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  startPythonBackend();

  setTimeout(() => {
    mainWindow.loadURL('http://127.0.0.1:5050').catch((err) => {
      setTimeout(() => {
        mainWindow.loadURL('http://127.0.0.1:5050').catch((e) => {
          dialog.showErrorBox('Connection Error', 'Cannot connect to backend on port 5050.\n\n' + e.message);
        });
      }, 2000);
    });
  }, 2000);

  mainWindow.on('closed', () => { mainWindow = null; });
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (pythonProcess) pythonProcess.kill();
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (mainWindow === null) createWindow();
  });

  app.on('before-quit', () => {
    if (pythonProcess) pythonProcess.kill();
  });
}
