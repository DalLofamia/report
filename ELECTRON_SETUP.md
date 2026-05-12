# Electron Desktop App Setup

Your Project Tracker app has been successfully converted to a desktop application using Electron!

## What Changed

1. **Electron Main Process** - Created at `electron/main.js` to manage the application window and lifecycle
2. **Preload Script** - Created at `electron/preload.js` for secure IPC communication
3. **Updated Scripts** - New npm commands for running the desktop app
4. **Build Configuration** - Added electron-builder for packaging the app as an installer

## How to Run

### Development Mode
```bash
npm run start:electron
```
This will:
- Start the React frontend on http://localhost:3000
- Start the Node.js backend on http://localhost:5000
- Open the Electron app window with DevTools enabled

### Production Build
```bash
npm run build:electron
```
This will:
1. Build the React app for production
2. Package it with electron-builder
3. Create installers in the `dist/` folder (Windows NSIS and portable executables)

## Available Scripts

- `npm start` - Original script (runs both client and server)
- `npm run start:client` - React development server only
- `npm run start:server` - Node.js backend only
- `npm run start:electron` - Full Electron app (recommended for development)
- `npm run build` - Build React app for production
- `npm run build:electron` - Build and package as desktop app
- `npm run test` - Run tests

## Installation Requirements

### Prerequisites
- Node.js 14+ (already installed)
- npm 6+ (comes with Node.js)

### Installed Dependencies
- **electron**: Desktop application framework
- **electron-builder**: For packaging and creating installers
- **concurrently**: Run multiple npm scripts simultaneously
- **wait-on**: Wait for server to be ready before launching Electron

## Package Details

The app is configured as:
- **Name**: Project Tracker
- **Windows Target**: NSIS installer + portable executable
- **Version**: 0.1.0

## Next Steps

1. Install all dependencies (done ✓)
2. Run `npm run start:electron` to test the development app
3. When ready, run `npm run build:electron` to create installers
4. Distribute the `.exe` files from the `dist/` folder

## Troubleshooting

If you encounter issues:
- Make sure ports 3000 and 5000 are not in use
- Clear node_modules and npm cache: `rm -r node_modules && npm cache clean --force && npm install`
- Check that both the React and backend services start successfully
