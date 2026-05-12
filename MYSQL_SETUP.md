# MySQL Setup Guide

This guide shows how to set up MySQL for production use with your Project Tracker app. The app automatically handles all schema creation, so you only need to provision the database and user.

## Quick Start: How MySQL Support Works

When you set `MYSQL_HOST` (or `MYSQL_URL`), the backend automatically:
1. ✅ Connects to the MySQL database
2. ✅ Creates all tables (projects, subcontractors, inventory_items, purchases, accounting_entries, invoices)
3. ✅ Runs schema migrations if needed
4. ✅ Converts SQLite-specific queries (PRAGMA, RENAME TABLE) to MySQL equivalents
5. ✅ Falls back to SQLite locally if MySQL is not configured

No manual SQL or migrations required—it's all automatic!

## MySQL Hosting Providers

### 1. **PlanetScale** (Recommended for beginners)
- Free tier: 1 database, 3GB storage
- Connection URL format: `mysql://[user]:[password]@[host]/[database]`
- Setup: https://planetscale.com

**Steps:**
1. Create account at PlanetScale
2. Create a database (e.g., `project-tracker`)
3. Create a password for the user
4. Copy the connection URL
5. In your server `.env`, add: `MYSQL_URL=<connection-url>`

### 2. **Railway** (Full-stack friendly)
- MySQL + deployment together
- Pay-as-you-go: ~$5/month
- Connection via env vars: `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`

**Steps:**
1. Add MySQL plugin to your Railway project
2. Railway auto-generates connection env vars
3. Copy them to your `.env`:
```env
MYSQL_HOST=<railway-mysql-host>
MYSQL_PORT=3306
MYSQL_USER=<railway-mysql-user>
MYSQL_PASSWORD=<railway-mysql-password>
MYSQL_DATABASE=<railway-mysql-database>
```

### 3. **AWS RDS**
- Scalable, managed MySQL
- Free tier: 750 hours/month for 12 months
- Production-grade

**Steps:**
1. Create RDS instance (MySQL 8.0 or later)
2. In Security Groups, allow inbound on port 3306 from your server
3. Get the endpoint and credentials
4. Set env vars with RDS details

### 4. **cPanel Hosting** (Shared hosting)
- Most shared hosts include MySQL
- Access via control panel or command line

**Steps:**
1. Go to cPanel → MySQL Databases
2. Create a new database (e.g., `yourdomain_tracker`)
3. Create a user with all privileges
4. Get the hostname (usually `localhost` or provided by host)
5. Set env vars

### 5. **Google Cloud SQL**
- Managed MySQL in Google Cloud
- Free tier: 1 shared instance, 30GB storage

### 6. **Azure Database for MySQL**
- Microsoft's managed MySQL
- Flexible server pricing

## Manual MySQL Setup (Self-Hosted)

If you're running MySQL on your own server:

```bash
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE project_tracker;

# Create user (replace 'password' with your own)
CREATE USER 'project_tracker'@'%' IDENTIFIED BY 'password';

# Grant privileges
GRANT ALL PRIVILEGES ON project_tracker.* TO 'project_tracker'@'%';
FLUSH PRIVILEGES;

# Exit MySQL
EXIT;
```

Then set env vars:
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=project_tracker
MYSQL_PASSWORD=password
MYSQL_DATABASE=project_tracker
```

## Environment Variable Reference

### Option 1: Connection URL (PlanetScale, Railway, etc.)
```env
# MySQL URL format
MYSQL_URL=mysql://user:password@host:3306/database

# Or with SSL
MYSQL_URL=mysqlssl://user:password@host:3306/database
MYSQL_SSL=true
```

### Option 2: Individual variables (AWS RDS, cPanel, etc.)
```env
MYSQL_HOST=your-mysql-host.example.com
MYSQL_PORT=3306
MYSQL_USER=your_username
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=project_tracker
MYSQL_SSL=true          # Optional, for cloud hosts
```

## Database Specification

The app requires a MySQL database with these capabilities:
- **Version**: MySQL 5.7+ (MySQL 8.0 recommended)
- **Character Set**: utf8mb4 (auto-created)
- **Storage**: 100MB minimum (tables are small, mostly for data)
- **Backups**: Your hosting provider handles this

## Tables Automatically Created

The app automatically creates these tables on startup:

1. **projects** - Project contracts and details
2. **subcontractors** - Subcontractor information
3. **inventory_items** - Inventory tracking
4. **purchases** - Purchase records
5. **accounting_entries** - Accounting ledger
6. **invoices** - Invoice uploads and amounts

All tables include timestamps and proper indexes.

## Testing Your MySQL Connection

Once configured, the app logs the connection status:

```bash
# On startup, you should see:
# Connected to MySQL database
```

If you see errors:
- **"MYSQL_URL or MYSQL_HOST not set"** → Add env vars
- **"Access denied for user"** → Check credentials
- **"Unknown database"** → Database doesn't exist; create it
- **"Connection timeout"** → Check firewall/network access

## SSL/TLS for Cloud MySQL

If using PlanetScale or similar:
```env
MYSQL_SSL=true
# or in URL: mysqlssl://...
```

The app automatically handles SSL connections.

## Multi-Region Deployments

Deploy frontend and backend to different regions:
- Frontend: Netlify, Vercel, Railway (closest to users)
- Backend: Railway MySQL (same region as backend for latency)

Example:
```env
# Backend deployed to US-East
MYSQL_HOST=db.us-east.railway.app
```

## Backup & Recovery

Most managed MySQL providers include:
- ✅ Automatic daily backups
- ✅ Point-in-time recovery
- ✅ Read replicas for redundancy

Check your provider's backup docs for specifics.

## Migration from SQLite to MySQL

If you already have SQLite data and want to migrate:

1. **Export from SQLite:**
   ```bash
   sqlite3 projects.db ".mode csv" ".output projects_export.csv" "SELECT * FROM projects;"
   ```

2. **Import to MySQL:**
   ```bash
   mysql -u project_tracker -p project_tracker < projects_dump.sql
   ```

3. **Or use a tool:**
   - Adminer (web UI for MySQL)
   - MySQL Workbench (GUI)
   - DBeaver (multi-database tool)

## Performance Tuning

For high traffic (optional):

```env
# MySQL connection pooling
MYSQL_CONNECTION_LIMIT=20  # Default: 10

# Query timeout (seconds)
MYSQL_QUERY_TIMEOUT=30
```

## Monitoring

Check your MySQL provider's dashboard for:
- Query count and performance
- Storage usage
- Connection count
- Network throughput

## Troubleshooting

### Error: "PROTOCOL_CONNECTION_LOST"
- Likely due to idle timeout
- Solution: Your app already handles connection pooling

### Error: "ER_DUP_ENTRY"
- Duplicate records when creating projects
- Check your app logs for duplicate submissions

### Error: "ER_NO_REFERENCED_TABLE"
- Foreign key constraints
- The app doesn't use foreign keys, so this shouldn't happen

### Error: "Out of memory"
- MySQL instance too small
- Upgrade your hosting plan

## Next Steps

1. **Choose a MySQL provider** (PlanetScale recommended for start)
2. **Create database and user**
3. **Add `MYSQL_HOST` or `MYSQL_URL` to your `.env`**
4. **Deploy or restart your backend**
5. **Verify logs show "Connected to MySQL database"**
6. **Test by creating a project** 

The app will automatically create all tables and migrate data on first startup!
