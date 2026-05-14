const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');

// Helper to convert SQLite PRAGMA queries to MySQL INFORMATION_SCHEMA queries
function convertPragmaToMySQL(sql, database = 'project_tracker') {
  if (/PRAGMA\s+table_info\s*\(\s*(\w+)\s*\)/i.test(sql)) {
    const tableName = sql.match(/PRAGMA\s+table_info\s*\(\s*(\w+)\s*\)/i)[1];
    return `SELECT ORDINAL_POSITION as cid, COLUMN_NAME as name, COLUMN_TYPE as type, IS_NULLABLE = 'NO' as notnull, COLUMN_DEFAULT as dflt_value, COLUMN_KEY = 'PRI' as pk FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}' AND TABLE_SCHEMA = '${database}' ORDER BY ORDINAL_POSITION`;
  }

  return sql;
}

// Helper to convert SQLite ALTER TABLE RENAME TO MySQL RENAME TABLE
function convertAlterTableRenameToMySQL(sql) {
  const match = sql.match(/ALTER\s+TABLE\s+(\w+)\s+RENAME\s+TO\s+(\w+)/i);
  if (match) {
    return `RENAME TABLE ${match[1]} TO ${match[2]}`;
  }

  return sql;
}

// Helper to convert SQLite ALTER TABLE ADD COLUMN for MySQL compatibility
function convertAlterTableAddColumnToMySQL(sql) {
  const match = sql.match(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(.+)$/i);
  if (match) {
    const tableName = match[1];
    let columnDef = match[2];

    // Convert REAL to DECIMAL for MySQL if needed
    columnDef = columnDef.replace(/\bREAL\b/i, 'DECIMAL(12,2)');

    return `ALTER TABLE ${tableName} ADD COLUMN ${columnDef}`;
  }

  return sql;
}

function convertSQLiteToMySQL(sql) {
  let result = sql;

  // Convert PRAGMA queries
  result = convertPragmaToMySQL(result);

  // Convert ALTER TABLE RENAME
  result = convertAlterTableRenameToMySQL(result);

  // Convert ALTER TABLE ADD COLUMN
  result = convertAlterTableAddColumnToMySQL(result);

  return result;
}

function normalizeConnectionString(connectionString) {
  if (!connectionString) {
    return null;
  }

  try {
    const parsed = new URL(connectionString);
    if (!/^mysql(s)?$/i.test(parsed.protocol.replace(':', ''))) {
      return null;
    }

    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 3306,
      user: decodeURIComponent(parsed.username || ''),
      password: decodeURIComponent(parsed.password || ''),
      database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : '',
      ssl: /^(1|true|required)$/i.test(process.env.MYSQL_SSL || '') ? { rejectUnauthorized: false } : undefined,
    };
  } catch (error) {
    return null;
  }
}

function resolveMySqlConfig() {
  const fromUrl = normalizeConnectionString(process.env.MYSQL_URL || process.env.DATABASE_URL || '');
  if (fromUrl && fromUrl.database) {
    return fromUrl;
  }

  if (process.env.MYSQL_HOST) {
    return {
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || process.env.MYSQL_USERNAME || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'project_tracker',
      ssl: /^(1|true|required)$/i.test(process.env.MYSQL_SSL || '') ? { rejectUnauthorized: false } : undefined,
    };
  }

  return null;
}

function wrapCallbackResult(callback, result) {
  if (typeof callback === 'function') {
    callback.call(
      {
        lastID: result && typeof result.insertId === 'number' ? result.insertId : 0,
        changes: result && typeof result.affectedRows === 'number' ? result.affectedRows : 0,
      },
      null
    );
  }
}

function createSqliteDatabase(dbPath) {
  let resolveReady;
  let rejectReady;

  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  const sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      rejectReady(err);
      return;
    }

    console.log('📦 Using SQLite database (Local Development)');
    resolveReady();
  });

  return {
    isMySQL: false,
    ready,
    run(sql, params = [], callback) {
      sqliteDb.run(sql, params, function (err) {
        if (typeof callback === 'function') {
          if (err) {
            callback(err);
            return;
          }

          callback.call(this, null);
        }
      });
    },
    get(sql, params = [], callback) {
      sqliteDb.get(sql, params, callback);
    },
    all(sql, params = [], callback) {
      sqliteDb.all(sql, params, callback);
    },
    serialize(callback) {
      sqliteDb.serialize(callback);
    },
    close(callback) {
      sqliteDb.close(callback);
    },
  };
}

function createMySqlDatabase() {
  const mysqlConfig = resolveMySqlConfig();
  if (!mysqlConfig) {
    throw new Error('MySQL configuration is missing. Set MYSQL_HOST or MYSQL_URL.');
  }

  const pool = mysql.createPool({
    ...mysqlConfig,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
    decimalNumbers: true,
    timezone: 'Z',
  });

  // Enhanced error handling for pool connection
  const ready = pool.query('SELECT 1').catch((err) => {
    const errorMsg = `
╔════════════════════════════════════════════════════════════════════════════╗
║                    MYSQL CONNECTION ERROR                                 ║
╠════════════════════════════════════════════════════════════════════════════╣
║ Could not connect to MySQL database                                       ║
║                                                                            ║
║ Error Details:                                                            ║
║   ${err.code}: ${err.message}                                             ║
║                                                                            ║
║ Check these settings in your .env file:                                   ║
║   MYSQL_HOST=${mysqlConfig.host}                                         ║
║   MYSQL_PORT=${mysqlConfig.port}                                         ║
║   MYSQL_USER=${mysqlConfig.user}                                         ║
║                                                                            ║
║ Common Solutions:                                                         ║
║   1. MySQL server is not running                                         ║
║   2. Host/Port is incorrect                                              ║
║   3. Username/Password is incorrect                                      ║
║   4. Database '${mysqlConfig.database}' doesn't exist                    ║
║                                                                            ║
║ To start MySQL locally with Docker:                                      ║
║   docker run --name mysql -e MYSQL_ROOT_PASSWORD=password \\             ║
║     -p 3306:3306 -d mysql:8.0                                           ║
║                                                                            ║
║ Then create the database:                                                ║
║   docker exec -it mysql mysql -u root -ppassword \\                     ║
║     -e "CREATE DATABASE project_tracker;"                               ║
║                                                                            ║
║ Configure MYSQL_HOST or MYSQL_URL in your server environment             ║
╚════════════════════════════════════════════════════════════════════════════╝
    `.trim();
    throw new Error(errorMsg);
  });

  return {
    isMySQL: true,
    ready,
    connection: pool,
    run(sql, params = [], callback) {
      const convertedSql = convertSQLiteToMySQL(sql);
      pool
        .execute(convertedSql, params)
        .then(([result]) => {
          wrapCallbackResult(callback, result);
        })
        .catch((err) => {
          if (typeof callback === 'function') {
            callback(err);
          }
        });
    },
    get(sql, params = [], callback) {
      const convertedSql = convertSQLiteToMySQL(sql);
      pool
        .execute(convertedSql, params)
        .then(([rows]) => {
          if (typeof callback === 'function') {
            callback(null, rows && rows.length > 0 ? rows[0] : undefined);
          }
        })
        .catch((err) => {
          if (typeof callback === 'function') {
            callback(err);
          }
        });
    },
    all(sql, params = [], callback) {
      const convertedSql = convertSQLiteToMySQL(sql);
      pool
        .execute(convertedSql, params)
        .then(([rows]) => {
          if (typeof callback === 'function') {
            callback(null, rows || []);
          }
        })
        .catch((err) => {
          if (typeof callback === 'function') {
            callback(err);
          }
        });
    },
    serialize(callback) {
      pool.getConnection().then((connection) => {
        if (typeof callback === 'function') {
          callback();
        }
        connection.release();
      }).catch((err) => {
        console.error('Error in serialize:', err);
        if (typeof callback === 'function') {
          callback();
        }
      });
    },
    close(callback) {
      pool
        .end()
        .then(() => {
          if (typeof callback === 'function') {
            callback();
          }
        })
        .catch((err) => {
          if (typeof callback === 'function') {
            callback(err);
          }
        });
    },
  };
}

function createDatabase(options = {}) {
  const mysqlConfig = resolveMySqlConfig();
  let currentDb = null;
  
  // Try MySQL first if configured
  if (mysqlConfig) {
    try {
      const mysqlDb = createMySqlDatabase();
      currentDb = mysqlDb;
      
      // Add MySQL fallback wrapper
      const ready = mysqlDb.ready.catch((err) => {
        console.warn('⚠️  MySQL connection failed:', err.code || 'Connection error');
        console.log('💡 Falling back to SQLite for local development');
        
        // Switch to SQLite on MySQL failure
        const sqlitePath = options.sqlitePath || path.join(__dirname, 'projects.db');
        const sqliteDb = createSqliteDatabase(sqlitePath);
        
        // Replace all db methods with SQLite methods
        currentDb.isMySQL = false;
        currentDb.ready = sqliteDb.ready;
        currentDb.run = sqliteDb.run;
        currentDb.get = sqliteDb.get;
        currentDb.all = sqliteDb.all;
        currentDb.serialize = sqliteDb.serialize;
        currentDb.close = sqliteDb.close;
        currentDb.connection = null;
        
        return sqliteDb.ready;
      });
      
      return Object.assign(currentDb, { ready });
    } catch (err) {
      console.warn('⚠️  MySQL error:', err.message);
    }
  }
  
  // Use SQLite for local development
  console.log('ℹ️  Using SQLite for local development');
  const sqlitePath = options.sqlitePath || path.join(__dirname, 'projects.db');
  return createSqliteDatabase(sqlitePath);
}

module.exports = {
  createDatabase,
};