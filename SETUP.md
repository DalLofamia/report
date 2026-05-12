# Project Tracker - Setup Guide

## Quick Start (Local Development)

The easiest way to get started:

```bash
npm run start-all
```

This starts both the backend and frontend automatically.

## Manual Setup

### 1. Install Backend Dependencies

Navigate to the server folder and install dependencies:

```bash
cd app/server
npm install
```

### 2. Configure Environment Variables

The app now uses environment variables for database location and upload directory. This allows it to work in different deployment scenarios.

**Backend configuration** (`app/server/.env`):
```
PORT=5000
DB_PATH=./projects.db
UPLOADS_DIR=./uploads
```

**Frontend configuration** (`app/.env`):
```
REACT_APP_API_BASE_URL=http://localhost:5000
```

See `.env.example` files for all available options.

### 3. Start the Backend Server

In the `app/server` directory, run:

```bash
npm start
```

The server will run on `http://localhost:5000`

You should see:
```
Connected to SQLite database
Projects table initialized
Server running on http://localhost:5000
```

### 4. Start the React App (in a new terminal)

In the `app` directory, run:

```bash
npm start
```

The app will open at `http://localhost:3000`

## Database

- **Type:** SQLite (local development) or configurable for production
- **File:** Controlled by `DB_PATH` environment variable
- **Default:** `app/server/projects.db` (automatically created)
- **Tables:** projects, subcontractors, inventory_items, purchases, accounting_entries, invoices

### Database Schema (Projects Table)

```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyName TEXT,
  projectRequirements TEXT,
  businessNameLocation TEXT,
  purchasedOrderNumber TEXT,
  contractPerson TEXT,
  contactNumber TEXT,
  totalContractPrice REAL NOT NULL,
  downPayment REAL NOT NULL,
  progress1 REAL DEFAULT 0,
  progress2 REAL DEFAULT 0,
  progress3 REAL DEFAULT 0,
  progress4 REAL DEFAULT 0,
  progress5 REAL DEFAULT 0,
  status TEXT DEFAULT 'Ongoing',
  year INTEGER DEFAULT 2026,
  month INTEGER DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## API Endpoints

- **GET** `/api/projects` - Get all projects
- **GET** `/api/projects/:id` - Get single project
- **POST** `/api/projects` - Create new project
- **PUT** `/api/projects/:id` - Update project
- **DELETE** `/api/projects/:id` - Delete project

**Subcontractors:**
- **GET** `/api/subcontractors` - Get all
- **POST** `/api/subcontractors` - Create
- **PUT** `/api/subcontractors/:id` - Update
- **DELETE** `/api/subcontractors/:id` - Delete

**Inventory:**
- **GET** `/api/inventory` - Get all items
- **POST** `/api/inventory` - Create item
- **PUT** `/api/inventory/:id` - Update item
- **DELETE** `/api/inventory/:id` - Delete item

**Invoices:**
- **GET** `/api/invoices` - Get all invoices
- **POST** `/api/invoices` - Upload invoice (PDF/Image)
- **PUT** `/api/invoices/:id` - Update invoice
- **DELETE** `/api/invoices/:id` - Delete invoice

**Accounting:**
- **GET** `/api/accounting` - Get all entries
- **POST** `/api/accounting` - Create entry
- **PUT** `/api/accounting/:id` - Update entry
- **DELETE** `/api/accounting/:id` - Delete entry

**Purchases:**
- **GET** `/api/purchases` - Get all purchases
- **POST** `/api/purchases` - Create purchase
- **PUT** `/api/purchases/:id` - Update purchase
- **DELETE** `/api/purchases/:id` - Delete purchase

## Features

✅ Project management with progress tracking
✅ Subcontractor management
✅ Inventory tracking
✅ Invoice management with PDF/Image support
✅ Accounting entries with debit/credit
✅ Purchase tracking
✅ Automatic amount extraction from invoices (OCR)
✅ Automatic balance calculation
✅ Persistent storage in SQLite database
✅ **NEW:** Environment-based configuration for production deployment
✅ **NEW:** Uploadable files stored in configurable directory

## Production Deployment

**Important:** For deploying online or as an app, see [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on:
- Database configuration for production
- Uploading files to cloud servers
- Docker deployments
- Windows executable creation
- Heroku, AWS, Azure deployments
- And more...

## Troubleshooting

**Port 5000 already in use?**
Edit `server/.env` and change the PORT variable:
```
PORT=5001
```

**Database not connecting?**
Make sure you're running `npm start` in the server folder or use `npm run start-all` from the root

**Data not saving?**
Check browser console (F12) and server terminal for error messages

**Environment variables not loading?**
- Ensure `.env` file exists in the correct directory
- Backend: `app/server/.env`
- Frontend: `app/.env`
- Restart the servers after creating/editing `.env` files

**Uploads not working?**
- Ensure `UPLOADS_DIR` directory exists and is writable
- Check disk space available
- Verify the directory path is correct in `.env`

**Can't connect to API from frontend?**
- Check `REACT_APP_API_BASE_URL` in `app/.env`
- Ensure backend is running on the specified port
- Check CORS settings if deploying to different domains

## Environment Variables Reference

### Backend (server/.env)
| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5000 | Server port |
| DB_PATH | ./projects.db | Database file location |
| UPLOADS_DIR | ./uploads | Directory for uploaded files |

### Frontend (app/.env)
| Variable | Default | Description |
|----------|---------|-------------|
| REACT_APP_API_BASE_URL | http://localhost:5000 | Backend API URL |
| REACT_APP_ASSET_BASE_URL | (same as API_BASE_URL) | URL for uploaded assets |


