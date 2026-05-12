const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const { createDatabase } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database configuration (MySQL required)
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const db = createDatabase();

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let invoiceTextWorkerPromise = null;

async function getInvoiceTextWorker() {
  if (!invoiceTextWorkerPromise) {
    invoiceTextWorkerPromise = createWorker('eng');
  }

  return invoiceTextWorkerPromise;
}

function parseCurrencyValue(rawValue) {
  if (!rawValue) {
    return null;
  }

  const normalized = String(rawValue).replace(/[, ]+/g, '').replace(/^[^\d.-]+/, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractAmountFromText(text) {
  if (!text) {
    return 0;
  }

  const normalizedText = text.replace(/\s+/g, ' ');
  const labeledPatterns = [
    /balance\s+due\s*[:\-]?\s*([$€£]?\s*[-+]?\d[\d,]*(?:\.\d{1,2})?)/i,
    /amount\s+due\s*[:\-]?\s*([$€£]?\s*[-+]?\d[\d,]*(?:\.\d{1,2})?)/i,
    /total\s+due\s*[:\-]?\s*([$€£]?\s*[-+]?\d[\d,]*(?:\.\d{1,2})?)/i,
    /grand\s+total\s*[:\-]?\s*([$€£]?\s*[-+]?\d[\d,]*(?:\.\d{1,2})?)/i,
    /total\s*[:\-]?\s*([$€£]?\s*[-+]?\d[\d,]*(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of labeledPatterns) {
    const match = normalizedText.match(pattern);
    const value = parseCurrencyValue(match && match[1]);
    if (value !== null) {
      return value;
    }
  }

  const fallbackMatches = [...normalizedText.matchAll(/[$€£]?\s*\d[\d,]*(?:\.\d{1,2})?/g)];
  if (fallbackMatches.length === 0) {
    return 0;
  }

  const fallbackValues = fallbackMatches
    .map((match) => parseCurrencyValue(match[0]))
    .filter((value) => value !== null);

  if (fallbackValues.length === 0) {
    return 0;
  }

  return Math.max(...fallbackValues);
}

async function extractAmountFromUploadedFile(filePath, mimeType = '', originalName = '') {
  try {
    if (/pdf/i.test(mimeType) || /\.pdf$/i.test(originalName)) {
      const pdfBuffer = fs.readFileSync(filePath);
      const pdfParser = new PDFParse({ data: pdfBuffer });
      const pdfData = await pdfParser.getText();
      return extractAmountFromText(pdfData.text);
    }

    if (/^image\//i.test(mimeType) || /\.(png|jpe?g|webp|gif|bmp)$/i.test(originalName)) {
      const worker = await getInvoiceTextWorker();
      const result = await worker.recognize(filePath);
      return extractAmountFromText(result.data.text);
    }
  } catch (error) {
    console.error('Invoice amount extraction failed:', error.message);
  }

  return 0;
}

// Middleware - Configure CORS for production
const corsOptions = {
  origin: function(origin, callback) {
    // Base allowed origins for development
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
    ];

    // In production, use ALLOWED_ORIGINS env var
    if (process.env.NODE_ENV === 'production') {
      if (process.env.ALLOWED_ORIGINS) {
        const productionOrigins = process.env.ALLOWED_ORIGINS
          .split(',')
          .map(o => o.trim())
          .filter(o => o);
        allowedOrigins.splice(0, allowedOrigins.length, ...productionOrigins);
      }
      // Always allow requests without origin header (same-origin, mobile, desktop apps)
      if (!origin) {
        callback(null, true);
        return;
      }
    }

    const isAllowedOrigin = allowedOrigins.some((allowedOrigin) => {
      if (allowedOrigin === '*') {
        return true;
      }

      if (allowedOrigin.includes('*')) {
        const escapedPattern = allowedOrigin
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\\\*/g, '.*');
        return new RegExp(`^${escapedPattern}$`, 'i').test(origin);
      }

      return allowedOrigin === origin;
    });

    // Check if origin is allowed
    if (isAllowedOrigin) {
      callback(null, true);
    } else {
      // Log rejection for debugging
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('CORS: Origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

db.ready
  .then(async () => {
    console.log('Connected to MySQL database');
    await initializeMySqlDatabase();
    startServer();
  })
  .catch((err) => {
    console.error('Error opening database:', err);
    process.exit(1);
  });

function runSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }

      resolve(this);
    });
  });
}

async function initializeMySqlDatabase() {
  await runSql(`
    CREATE TABLE IF NOT EXISTS projects (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      companyName TEXT,
      projectRequirements TEXT,
      businessNameLocation TEXT,
      purchasedOrderNumber TEXT,
      contractPerson TEXT,
      contactNumber TEXT,
      totalContractPrice DECIMAL(12,2) NOT NULL,
      downPayment DECIMAL(12,2) NOT NULL,
      progress1 DECIMAL(12,2) DEFAULT 0,
      progress2 DECIMAL(12,2) DEFAULT 0,
      progress3 DECIMAL(12,2) DEFAULT 0,
      progress4 DECIMAL(12,2) DEFAULT 0,
      progress5 DECIMAL(12,2) DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'Ongoing',
      year INT DEFAULT 2026,
      month INT DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS subcontractors (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      subcontractor TEXT NOT NULL,
      contactPerson TEXT,
      contactNumber TEXT,
      totalContractPrice DECIMAL(12,2) NOT NULL,
      downPayment DECIMAL(12,2) NOT NULL,
      progress1 DECIMAL(12,2) DEFAULT 0,
      progress2 DECIMAL(12,2) DEFAULT 0,
      progress3 DECIMAL(12,2) DEFAULT 0,
      progress4 DECIMAL(12,2) DEFAULT 0,
      progress5 DECIMAL(12,2) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      itemName VARCHAR(255) NOT NULL,
      unit VARCHAR(100),
      quantity DECIMAL(12,2) DEFAULT 0,
      location VARCHAR(255),
      remarks TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      purchaseName VARCHAR(255) NOT NULL,
      purchaseDate VARCHAR(50),
      amount DECIMAL(12,2) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS accounting_entries (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      entryName VARCHAR(255) NOT NULL,
      entryDate VARCHAR(50),
      particulars TEXT,
      debit DECIMAL(12,2) DEFAULT 0,
      credit DECIMAL(12,2) DEFAULT 0,
      payment DECIMAL(12,2) DEFAULT 0,
      paymentMethod VARCHAR(100) NOT NULL DEFAULT '',
      balance DECIMAL(12,2) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      invoiceName VARCHAR(255) NOT NULL,
      invoiceDate VARCHAR(50),
      amount DECIMAL(12,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'Draft',
      filePath TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  backfillInvoiceAmounts();
}



function backfillInvoiceAmounts() {
  db.all(
    `
      SELECT id, filePath, amount
      FROM invoices
      WHERE filePath IS NOT NULL
        AND TRIM(filePath) != ''
        AND COALESCE(amount, 0) = 0
    `,
    [],
    async (err, rows) => {
      if (err) {
        console.error('Error loading invoices for backfill:', err);
        return;
      }

      for (const row of rows || []) {
        const absolutePath = path.join(__dirname, row.filePath);
        if (!fs.existsSync(absolutePath)) {
          continue;
        }

        const fileName = path.basename(absolutePath);
        const extractedAmount = await extractAmountFromUploadedFile(absolutePath, '', fileName);

        if (extractedAmount > 0) {
          db.run(
            'UPDATE invoices SET amount = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
            [extractedAmount, row.id],
            (updateErr) => {
              if (updateErr) {
                console.error(`Error backfilling invoice ${row.id}:`, updateErr);
              }
            }
          );
        }
      }
    }
  );
}

// Start server after database initialization completes
function startServer() {
  console.log('Database initialization complete, starting server...');
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Routes

// GET all projects
app.get('/api/projects', (req, res) => {
  db.all('SELECT * FROM projects ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows || []);
  });
});

// GET single project
app.get('/api/projects/:id', (req, res) => {
  const { id } = req.params;

  // Validate ID is a positive integer
  const projectId = parseInt(id, 10);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }

  db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(row);
  });
});

// POST - Create new project
app.post('/api/projects', (req, res) => {
  const {
    companyName = '',
    projectRequirements = '',
    businessNameLocation = '',
    purchasedOrderNumber = '',
    contractPerson = '',
    contactNumber = '',
    totalContractPrice,
    downPayment,
    progress1 = 0,
    progress2 = 0,
    progress3 = 0,
    progress4 = 0,
    progress5 = 0,
    status = 'Ongoing',
    year = 2026,
    month = 1,
  } = req.body;

  // Validate and sanitize required numeric fields
  const totalPrice = parseFloat(totalContractPrice);
  const downPay = parseFloat(downPayment);
  const prog1 = parseFloat(progress1) || 0;
  const prog2 = parseFloat(progress2) || 0;
  const prog3 = parseFloat(progress3) || 0;
  const prog4 = parseFloat(progress4) || 0;
  const prog5 = parseFloat(progress5) || 0;
  const projectYear = parseInt(year, 10);
  const projectMonth = parseInt(month, 10);

  // Validation
  if (isNaN(totalPrice) || isNaN(downPay)) {
    res.status(400).json({ error: 'totalContractPrice and downPayment must be valid numbers' });
    return;
  }

  if (totalPrice < 0 || downPay < 0) {
    res.status(400).json({ error: 'Prices cannot be negative' });
    return;
  }

  if (downPay > totalPrice) {
    res.status(400).json({ error: 'Down payment cannot exceed total contract price' });
    return;
  }

  if (![prog1, prog2, prog3, prog4, prog5].every(p => !isNaN(p) && p >= 0)) {
    res.status(400).json({ error: 'Progress values must be non-negative numbers' });
    return;
  }

  if (isNaN(projectYear) || projectYear < 2026 || projectYear > 2035) {
    res.status(400).json({ error: 'Year must be between 2026 and 2035' });
    return;
  }

  if (isNaN(projectMonth) || projectMonth < 1 || projectMonth > 12) {
    res.status(400).json({ error: 'Month must be between 1 and 12' });
    return;
  }

  const validStatus = ['Ongoing', 'Complete'];
  if (!validStatus.includes(status)) {
    res.status(400).json({ error: 'Status must be Ongoing or Complete' });
    return;
  }

  // Sanitize text fields
  const sanitize = (str) => (str || '').toString().trim();
  const company = sanitize(companyName);
  const requirements = sanitize(projectRequirements);
  const location = sanitize(businessNameLocation);
  const poNumber = sanitize(purchasedOrderNumber);
  const person = sanitize(contractPerson);
  const phone = sanitize(contactNumber);

  // Check for duplicate exact match
  const checkDupSql = `
    SELECT id FROM projects
    WHERE companyName = ? AND projectRequirements = ? AND businessNameLocation = ?
    AND purchasedOrderNumber = ? AND contractPerson = ? AND contactNumber = ?
    AND totalContractPrice = ? AND downPayment = ? AND status = ?
    LIMIT 1
  `;

  db.get(
    checkDupSql,
    [company, requirements, location, poNumber, person, phone, totalPrice, downPay, status],
    (dupErr, dupRow) => {
      if (dupErr) {
        res.status(500).json({ error: 'Database error: ' + dupErr.message });
        return;
      }

      if (dupRow) {
        res.status(409).json({ error: 'Duplicate project already exists' });
        return;
      }

      const sql = `
        INSERT INTO projects 
        (companyName, projectRequirements, businessNameLocation, purchasedOrderNumber, contractPerson, contactNumber, totalContractPrice, downPayment, progress1, progress2, progress3, progress4, progress5, status, year, month)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(
        sql,
        [company, requirements, location, poNumber, person, phone, totalPrice, downPay, prog1, prog2, prog3, prog4, prog5, status, projectYear, projectMonth],
        function (err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ id: this.lastID, message: 'Project created successfully' });
        }
      );
    }
  );
});

// PUT - Update project
app.put('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const {
    companyName,
    projectRequirements,
    businessNameLocation,
    purchasedOrderNumber,
    contractPerson,
    contactNumber,
    totalContractPrice,
    downPayment,
    progress1,
    progress2,
    progress3,
    progress4,
    progress5,
    status,
    year,
    month,
  } = req.body;

  // Validate ID is a positive integer
  const projectId = parseInt(id, 10);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }

  // Validate and sanitize numeric fields
  const totalPrice = parseFloat(totalContractPrice);
  const downPay = parseFloat(downPayment);
  const prog1 = parseFloat(progress1) || 0;
  const prog2 = parseFloat(progress2) || 0;
  const prog3 = parseFloat(progress3) || 0;
  const prog4 = parseFloat(progress4) || 0;
  const prog5 = parseFloat(progress5) || 0;
  const projectYear = parseInt(year, 10);
  const projectMonth = parseInt(month, 10);

  // Validation
  if (isNaN(totalPrice) || isNaN(downPay)) {
    res.status(400).json({ error: 'totalContractPrice and downPayment must be valid numbers' });
    return;
  }

  if (totalPrice < 0 || downPay < 0) {
    res.status(400).json({ error: 'Prices cannot be negative' });
    return;
  }

  if (downPay > totalPrice) {
    res.status(400).json({ error: 'Down payment cannot exceed total contract price' });
    return;
  }

  if (![prog1, prog2, prog3, prog4, prog5].every(p => !isNaN(p) && p >= 0)) {
    res.status(400).json({ error: 'Progress values must be non-negative numbers' });
    return;
  }

  if (isNaN(projectYear) || projectYear < 2026 || projectYear > 2035) {
    res.status(400).json({ error: 'Year must be between 2026 and 2035' });
    return;
  }

  if (isNaN(projectMonth) || projectMonth < 1 || projectMonth > 12) {
    res.status(400).json({ error: 'Month must be between 1 and 12' });
    return;
  }

  const validStatus = ['Ongoing', 'Complete'];
  if (!validStatus.includes(status)) {
    res.status(400).json({ error: 'Status must be Ongoing or Complete' });
    return;
  }

  // Sanitize text fields
  const sanitize = (str) => (str || '').toString().trim();
  const company = sanitize(companyName);
  const requirements = sanitize(projectRequirements);
  const location = sanitize(businessNameLocation);
  const poNumber = sanitize(purchasedOrderNumber);
  const person = sanitize(contractPerson);
  const phone = sanitize(contactNumber);

  // Check if project exists
  db.get('SELECT id FROM projects WHERE id = ?', [projectId], (checkErr, checkRow) => {
    if (checkErr) {
      res.status(500).json({ error: 'Database error: ' + checkErr.message });
      return;
    }

    if (!checkRow) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const sql = `
      UPDATE projects
      SET companyName = ?,
          projectRequirements = ?,
          businessNameLocation = ?,
          purchasedOrderNumber = ?,
          contractPerson = ?,
          contactNumber = ?,
          totalContractPrice = ?, 
          downPayment = ?, 
          progress1 = ?, 
          progress2 = ?, 
          progress3 = ?, 
          progress4 = ?, 
          progress5 = ?,
          status = ?,
          year = ?,
          month = ?,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.run(
      sql,
      [company, requirements, location, poNumber, person, phone, totalPrice, downPay, prog1, prog2, prog3, prog4, prog5, status, projectYear, projectMonth, projectId],
      function (err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ message: 'Project updated successfully', changes: this.changes });
      }
    );
  });
});

// DELETE - Remove project
app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;

  // Validate ID is a positive integer
  const projectId = parseInt(id, 10);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }

  // Check if project exists first
  db.get('SELECT id FROM projects WHERE id = ?', [projectId], (checkErr, checkRow) => {
    if (checkErr) {
      res.status(500).json({ error: 'Database error: ' + checkErr.message });
      return;
    }

    if (!checkRow) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    db.run('DELETE FROM projects WHERE id = ?', [projectId], function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Project deleted successfully' });
    });
  });
});

// SUBCONTRACTOR ROUTES

// GET all subcontractors
app.get('/api/subcontractors', (req, res) => {
  db.all('SELECT * FROM subcontractors', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// GET single subcontractor
app.get('/api/subcontractors/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM subcontractors WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Subcontractor not found' });
      return;
    }
    res.json(row);
  });
});

// POST - Create new subcontractor
app.post('/api/subcontractors', (req, res) => {
  const {
    subcontractor,
    contactPerson = '',
    contactNumber = '',
    totalContractPrice,
    downPayment,
    progress1 = 0,
    progress2 = 0,
    progress3 = 0,
    progress4 = 0,
    progress5 = 0,
  } = req.body;

  const sql = `
    INSERT INTO subcontractors 
    (subcontractor, contactPerson, contactNumber, totalContractPrice, downPayment, progress1, progress2, progress3, progress4, progress5)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [subcontractor, contactPerson, contactNumber, totalContractPrice, downPayment, progress1, progress2, progress3, progress4, progress5],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, message: 'Subcontractor created successfully' });
    }
  );
});

// PUT - Update subcontractor
app.put('/api/subcontractors/:id', (req, res) => {
  const { id } = req.params;
  const {
    subcontractor,
    contactPerson,
    contactNumber,
    totalContractPrice,
    downPayment,
    progress1,
    progress2,
    progress3,
    progress4,
    progress5,
  } = req.body;

  const sql = `
    UPDATE subcontractors
    SET subcontractor = ?, 
        contactPerson = ?, 
        contactNumber = ?, 
        totalContractPrice = ?, 
        downPayment = ?, 
        progress1 = ?, 
        progress2 = ?, 
        progress3 = ?, 
        progress4 = ?, 
        progress5 = ?,
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(
    sql,
    [subcontractor, contactPerson, contactNumber, totalContractPrice, downPayment, progress1, progress2, progress3, progress4, progress5, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Subcontractor not found' });
        return;
      }
      res.json({ message: 'Subcontractor updated successfully' });
    }
  );
});

// DELETE - Remove subcontractor
app.delete('/api/subcontractors/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM subcontractors WHERE id = ?', [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Subcontractor not found' });
      return;
    }
    res.json({ message: 'Subcontractor deleted successfully' });
  });
});

// INVENTORY ROUTES

// GET all inventory items
app.get('/api/inventory', (req, res) => {
  db.all('SELECT * FROM inventory_items', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// GET single inventory item
app.get('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM inventory_items WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Inventory item not found' });
      return;
    }
    res.json(row);
  });
});

// POST - Create inventory item
app.post('/api/inventory', (req, res) => {
  const {
    itemName,
    unit = '',
    quantity = 0,
    location = '',
    remarks = '',
  } = req.body;

  const sql = `
    INSERT INTO inventory_items
    (itemName, unit, quantity, location, remarks)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [itemName, unit, quantity, location, remarks],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, message: 'Inventory item created successfully' });
    }
  );
});

// PUT - Update inventory item
app.put('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const {
    itemName,
    unit,
    quantity,
    location,
    remarks,
  } = req.body;

  const sql = `
    UPDATE inventory_items
    SET itemName = ?,
        unit = ?,
        quantity = ?,
        location = ?,
        remarks = ?,
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(
    sql,
    [itemName, unit, quantity, location, remarks, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Inventory item not found' });
        return;
      }
      res.json({ message: 'Inventory item updated successfully' });
    }
  );
});

// DELETE - Remove inventory item
app.delete('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM inventory_items WHERE id = ?', [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Inventory item not found' });
      return;
    }
    res.json({ message: 'Inventory item deleted successfully' });
  });
});

// PURCHASES ROUTES

// GET all purchases
app.get('/api/purchases', (req, res) => {
  db.all('SELECT * FROM purchases', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// GET single purchase
app.get('/api/purchases/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM purchases WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }
    res.json(row);
  });
});

// POST - Create purchase
app.post('/api/purchases', (req, res) => {
  const {
    purchaseName,
    purchaseDate = '',
    amount = 0,
  } = req.body;

  const sql = `
    INSERT INTO purchases
    (purchaseName, purchaseDate, amount)
    VALUES (?, ?, ?)
  `;

  db.run(
    sql,
    [purchaseName, purchaseDate, amount],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, message: 'Purchase created successfully' });
    }
  );
});

// PUT - Update purchase
app.put('/api/purchases/:id', (req, res) => {
  const { id } = req.params;
  const {
    purchaseName,
    purchaseDate,
    amount,
  } = req.body;

  const sql = `
    UPDATE purchases
    SET purchaseName = ?,
        purchaseDate = ?,
        amount = ?,
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(
    sql,
    [purchaseName, purchaseDate, amount, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Purchase not found' });
        return;
      }
      res.json({ message: 'Purchase updated successfully' });
    }
  );
});

// DELETE - Remove purchase
app.delete('/api/purchases/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM purchases WHERE id = ?', [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }
    res.json({ message: 'Purchase deleted successfully' });
  });
});

// ACCOUNTING ROUTES

// GET all accounting entries
app.get('/api/accounting', (req, res) => {
  if (!db) {
    console.error('Database not initialized');
    return res.status(500).json({ error: 'Database not initialized' });
  }
  
  db.all('SELECT * FROM accounting_entries ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      console.error('Database error fetching accounting entries:', err);
      return res.status(500).json({ error: 'Failed to fetch accounting entries: ' + err.message });
    }
    res.json(rows || []);
  });
});

// GET single accounting entry
app.get('/api/accounting/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM accounting_entries WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Accounting entry not found' });
      return;
    }
    res.json(row);
  });
});

// POST - Create accounting entry
app.post('/api/accounting', (req, res) => {
  const {
    entryName,
    entryDate = '',
    particulars = '',
    debit = 0,
    credit = 0,
    payment = 0,
    paymentMethod = '',
    balance = 0,
  } = req.body;

  const normalizedDebit = Number(debit || 0);
  const normalizedPayment = Number(payment || 0);
  const normalizedCredit = Number(credit || normalizedPayment);
  const normalizedBalance = Number(balance || (normalizedDebit - normalizedCredit));

  const sql = `
    INSERT INTO accounting_entries
    (entryName, entryDate, particulars, debit, credit, payment, paymentMethod, balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [entryName, entryDate, particulars, normalizedDebit, normalizedCredit, normalizedPayment, paymentMethod, normalizedBalance], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, message: 'Accounting entry created successfully' });
  });
});

// PUT - Update accounting entry
app.put('/api/accounting/:id', (req, res) => {
  const { id } = req.params;
  const {
    entryName,
    entryDate,
    particulars,
    debit,
    credit,
    payment,
    paymentMethod = '',
    balance,
  } = req.body;

  const normalizedDebit = Number(debit || 0);
  const normalizedPayment = Number(payment || 0);
  const normalizedCredit = Number(credit || normalizedPayment);
  const normalizedBalance = Number(balance || (normalizedDebit - normalizedCredit));

  const sql = `
    UPDATE accounting_entries
    SET entryName = ?,
        entryDate = ?,
        particulars = ?,
        debit = ?,
        credit = ?,
        payment = ?,
        paymentMethod = ?,
        balance = ?,
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(sql, [entryName, entryDate, particulars, normalizedDebit, normalizedCredit, normalizedPayment, paymentMethod, normalizedBalance, id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Accounting entry not found' });
      return;
    }
    res.json({ message: 'Accounting entry updated successfully' });
  });
});

// DELETE - Remove accounting entry
app.delete('/api/accounting/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM accounting_entries WHERE id = ?', [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Accounting entry not found' });
      return;
    }
    res.json({ message: 'Accounting entry deleted successfully' });
  });
});

// Multer setup for invoice uploads
const invoicesUploadDir = path.join(UPLOADS_DIR, 'invoices');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, invoicesUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, uniqueSuffix + '-' + safeName);
  }
});
const allowedInvoiceMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
]);

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    const isAllowedMimeType = allowedInvoiceMimeTypes.has(file.mimetype);
    const hasAllowedExtension = /\.(pdf|jpe?g|png|webp|gif|bmp)$/i.test(file.originalname);

    if (isAllowedMimeType || hasAllowedExtension) {
      cb(null, true);
      return;
    }

    cb(new Error('Only PDF or image files are allowed for invoices'));
  },
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(UPLOADS_DIR)));

// INVOICES ROUTES

// GET all invoices
app.get('/api/invoices', (req, res) => {
  db.all('SELECT * FROM invoices ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// GET single invoice
app.get('/api/invoices/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM invoices WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    res.json(row);
  });
});

// POST - Create invoice with optional file upload
app.post('/api/invoices', upload.single('file'), async (req, res) => {
  const { invoiceName, invoiceDate = '', amount = 0, status = 'Draft' } = req.body;
  const filePath = req.file ? `/uploads/invoices/${req.file.filename}` : null;
  const uploadedFilePath = req.file ? path.join(__dirname, 'uploads', 'invoices', req.file.filename) : null;

  const extractedAmount = uploadedFilePath
    ? await extractAmountFromUploadedFile(uploadedFilePath, req.file.mimetype, req.file.originalname)
    : 0;

  const numericAmount = Number.parseFloat(amount);
  const finalAmount = Number.isFinite(numericAmount) && numericAmount > 0 ? numericAmount : extractedAmount;

  const sql = `
    INSERT INTO invoices
    (invoiceName, invoiceDate, amount, status, filePath)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(sql, [invoiceName, invoiceDate, finalAmount, status, filePath], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, amount: finalAmount, message: 'Invoice created successfully' });
  });
});

// PUT - Update invoice (optionally replace file)
app.put('/api/invoices/:id', upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const { invoiceName, invoiceDate, amount, status } = req.body;
  const filePath = req.file ? `/uploads/invoices/${req.file.filename}` : null;
  const uploadedFilePath = req.file ? path.join(__dirname, 'uploads', 'invoices', req.file.filename) : null;

  const extractedAmount = uploadedFilePath
    ? await extractAmountFromUploadedFile(uploadedFilePath, req.file.mimetype, req.file.originalname)
    : 0;

  const numericAmount = Number.parseFloat(amount);
  const finalAmount = Number.isFinite(numericAmount) && numericAmount > 0 ? numericAmount : extractedAmount;

  // If replacing file, remove old file
  if (filePath) {
    db.get('SELECT filePath FROM invoices WHERE id = ?', [id], (err, row) => {
      if (!err && row && row.filePath) {
        const oldPath = path.join(__dirname, row.filePath);
        fs.unlink(oldPath, (e) => {});
      }
    });
  }

  const sql = `
    UPDATE invoices
    SET invoiceName = ?,
        invoiceDate = ?,
        amount = ?,
        status = ?,
        filePath = COALESCE(?, filePath),
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(sql, [invoiceName, invoiceDate, finalAmount, status, filePath, id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    res.json({ message: 'Invoice updated successfully', amount: finalAmount });
  });
});

// DELETE - Remove invoice and its file
app.delete('/api/invoices/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT filePath FROM invoices WHERE id = ?', [id], (err, row) => {
    if (row && row.filePath) {
      const fileOnDisk = path.join(__dirname, row.filePath);
      fs.unlink(fileOnDisk, (e) => {});
    }
    db.run('DELETE FROM invoices WHERE id = ?', [id], function (err2) {
      if (err2) {
        res.status(500).json({ error: err2.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }
      res.json({ message: 'Invoice deleted successfully' });
    });
  });
});

// POST - Post an invoice into accounting (create accounting entry and remove invoice)
app.post('/api/invoices/:id/post', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM invoices WHERE id = ?', [id], (err, invoice) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const entryName = invoice.invoiceName || `Invoice ${id}`;
    const entryDate = invoice.invoiceDate || '';
    const particulars = `Posted from invoice ${id}`;
    const debit = invoice.amount || 0;
    const credit = 0;
    const paymentMethod = '';
    const balance = debit - credit;

    db.serialize(() => {
      db.run(`
        INSERT INTO accounting_entries
        (entryName, entryDate, particulars, debit, credit, paymentMethod, balance)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [entryName, entryDate, particulars, debit, credit, paymentMethod, balance], function (insertErr) {
        if (insertErr) {
          res.status(500).json({ error: insertErr.message });
          return;
        }

        // delete invoice and its file
        if (invoice.filePath) {
          const fileOnDisk = path.join(__dirname, invoice.filePath);
          fs.unlink(fileOnDisk, (e) => {});
        }

        db.run('DELETE FROM invoices WHERE id = ?', [id], function (delErr) {
          if (delErr) {
            res.status(500).json({ error: delErr.message });
            return;
          }

          res.json({ message: 'Invoice posted to accounting', accountingId: this.lastID || null });
        });
      });
    });
  });
});


process.on('SIGINT', () => {
  if (invoiceTextWorkerPromise) {
    invoiceTextWorkerPromise.then((worker) => worker.terminate()).catch(() => {});
  }
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
