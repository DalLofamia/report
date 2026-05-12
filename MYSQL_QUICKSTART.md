# Quick Start: MySQL Setup

Your app is now configured for **MySQL only**. Here's how to set it up in 5 minutes:

## Option 1: Docker (Fastest - Recommended)

### Prerequisites
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop) for your OS

### Setup (Windows PowerShell)

```powershell
# 1. Start MySQL in Docker
docker run --name mysql -e MYSQL_ROOT_PASSWORD=password -p 3306:3306 -d mysql:8.0

# 2. Wait 10 seconds for MySQL to start, then create database
Start-Sleep -Seconds 10
docker exec mysql mysql -u root -ppassword -e "CREATE DATABASE project_tracker;"

# 3. Verify connection works
docker exec mysql mysql -u root -ppassword -e "SHOW DATABASES;"

# You should see: project_tracker in the list

# 4. Start your app
cd server
npm start

# The app should now be running on http://localhost:5000
```

### Stop MySQL when done
```powershell
docker stop mysql
```

### Restart MySQL later
```powershell
docker start mysql
```

---

## Option 2: Local MySQL Installation

### Windows
1. Download MySQL: https://dev.mysql.com/downloads/mysql/
2. Install with default settings
3. Open MySQL Command Line Client and run:
   ```sql
   CREATE DATABASE project_tracker;
   GRANT ALL PRIVILEGES ON project_tracker.* TO 'root'@'localhost';
   FLUSH PRIVILEGES;
   ```
4. Start your app: `npm start`

### macOS
```bash
# Install with Homebrew
brew install mysql

# Start MySQL
brew services start mysql

# Create database
mysql -u root -e "CREATE DATABASE project_tracker;"

# Start your app
npm start
```

### Linux (Ubuntu/Debian)
```bash
# Install MySQL
sudo apt-get install mysql-server

# Start MySQL
sudo service mysql start

# Create database
mysql -u root -e "CREATE DATABASE project_tracker;"

# Start your app
npm start
```

---

## Option 3: Cloud MySQL (PlanetScale - Free)

### Setup
1. Go to [planetscale.com](https://planetscale.com)
2. Create a free account
3. Create a new database
4. Click "Connect" and copy the connection string
5. Edit `.env` file in `server` folder:
   ```env
   # Comment out or remove these lines:
   # MYSQL_HOST=localhost
   # MYSQL_PORT=3306
   # MYSQL_USER=root
   # MYSQL_PASSWORD=password
   # MYSQL_DATABASE=project_tracker

   # Add this line instead:
   MYSQL_URL=<paste-your-connection-string-here>
   ```
6. Save and run: `npm start`

---

## Troubleshooting

### "Error: connect ECONNREFUSED"
- MySQL is not running
- Run: `docker start mysql` (if using Docker)
- Or start MySQL from System Preferences / Services (if installed locally)

### "Error: Access denied for user 'root'@'localhost'"
- Password is wrong
- Check `.env` file MYSQL_PASSWORD matches what you set

### "Error: Unknown database 'project_tracker'"
- Database wasn't created
- Run: `docker exec mysql mysql -u root -ppassword -e "CREATE DATABASE project_tracker;"`

### "Error: Cannot find module"
- Dependencies not installed
- Run: `npm install` in the `server` folder

---

## Testing

Once running, test the app:

```bash
# In another terminal, test the API:
curl http://localhost:5000/health

# Should return: {"status":"ok","message":"Server is running"}
```

---

## Next Steps

1. ✅ Database is running
2. ✅ Server is running on http://localhost:5000
3. Now start the React frontend: `npm start` in the main app folder
4. Frontend should be on http://localhost:3000

Done! Your app is ready to use.
