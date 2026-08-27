const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure database directory exists
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Enable Foreign Keys in SQLite
db.run('PRAGMA foreign_keys = ON;');

// Role Normalization Helper
function normalizeRole(roleStr) {
  if (!roleStr) return '';
  const r = roleStr.toString().trim().toLowerCase();
  if (r.includes('admin')) return 'admin';
  if (r.includes('tester')) return 'tester';
  if (r.includes('design') || r.includes('dev')) return 'designer';
  return r;
}

// Initialize Tables and Default Seed Users
db.serialize(() => {
  // Users Table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    )
  `);

  // Projects Table
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Test Scenarios Table
  db.run(`
    CREATE TABLE IF NOT EXISTS scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      scenario_name TEXT NOT NULL,
      task_description TEXT,
      test_result TEXT NOT NULL,
      tester_notes TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // UX Issues Table
  db.run(`
    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Design Adjustments Table
  db.run(`
    CREATE TABLE IF NOT EXISTS adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL,
      adjustment_description TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'In Progress',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
    )
  `);

  // Seed Default Users if missing
  const defaultUsers = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'tester', password: 'tester123', role: 'tester' },
    { username: 'designer', password: 'designer123', role: 'designer' }
  ];

  defaultUsers.forEach(u => {
    db.get('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [u.username], (err, row) => {
      if (!err && !row) {
        db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [u.username, u.password, u.role], (err2) => {
          if (!err2) console.log(`Default user created: ${u.username} (${u.role})`);
        });
      }
    });
  });

  // Seed Sample Projects if none exist
  db.get('SELECT COUNT(*) as count FROM projects', (err, row) => {
    if (!err && (!row || row.count === 0)) {
      const stmt = db.prepare('INSERT INTO projects (name, description) VALUES (?, ?)');
      stmt.run('E-Commerce Mobile App', 'Usability evaluation of the checkout flow and user navigation.');
      stmt.run('Health & Fitness Dashboard', 'Testing desktop dashboard widgets, goal tracking, and accessibility.');
      stmt.finalize();
    }
  });
});


// --- API ROUTES ---

// Login Endpoint
app.post('/api/login', (req, res) => {
  const { username, password, role } = req.body;
  
  if (!username || !username.trim() || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const trimmedUsername = username.trim();
  const query = 'SELECT id, username, password, role FROM users WHERE LOWER(username) = LOWER(?)';

  db.get(query, [trimmedUsername], (err, user) => {
    if (err) {
      console.error('Login DB Error:', err);
      return res.status(500).json({ error: 'Internal database error' });
    }

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Role check with normalization
    if (role) {
      const dbRoleNorm = normalizeRole(user.role);
      const reqRoleNorm = normalizeRole(role);
      if (dbRoleNorm !== reqRoleNorm) {
        return res.status(401).json({ 
          error: `Selected role (${role}) does not match your account role (${user.role.charAt(0).toUpperCase() + user.role.slice(1)})` 
        });
      }
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  });
});


// --- PROJECTS ENDPOINTS ---
app.get('/api/projects', (req, res) => {
  const query = 'SELECT * FROM projects ORDER BY created_at DESC';
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/projects', (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Project name is required' });
  }
  const query = 'INSERT INTO projects (name, description) VALUES (?, ?)';
  db.run(query, [name.trim(), description ? description.trim() : ''], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name, description, created_at: new Date().toISOString() });
  });
});

app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM projects WHERE id = ?';
  db.run(query, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Project deleted successfully', deleted: this.changes });
  });
});

// --- SCENARIOS ENDPOINTS ---
app.get('/api/scenarios', (req, res) => {
  const query = `
    SELECT s.*, p.name as project_name 
    FROM scenarios s
    JOIN projects p ON s.project_id = p.id
    ORDER BY s.created_at DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/scenarios', (req, res) => {
  const { project_id, scenario_name, task_description, test_result, tester_notes, created_by } = req.body;
  if (!project_id || !scenario_name || !test_result) {
    return res.status(400).json({ error: 'Project, Scenario Name, and Test Result are required' });
  }

  const query = `
    INSERT INTO scenarios (project_id, scenario_name, task_description, test_result, tester_notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.run(
    query,
    [project_id, scenario_name.trim(), task_description || '', test_result, tester_notes || '', created_by || 'Tester'],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: 'Scenario recorded successfully' });
    }
  );
});

// --- UX ISSUES ENDPOINTS ---
app.get('/api/issues', (req, res) => {
  const query = `
    SELECT i.*, p.name as project_name 
    FROM issues i
    JOIN projects p ON i.project_id = p.id
    ORDER BY i.created_at DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/issues', (req, res) => {
  const { project_id, title, description, severity, status, created_by } = req.body;
  if (!project_id || !title || !severity) {
    return res.status(400).json({ error: 'Project, Title, and Severity are required' });
  }

  const issueStatus = status || 'Open';
  const query = `
    INSERT INTO issues (project_id, title, description, severity, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.run(
    query,
    [project_id, title.trim(), description || '', severity, issueStatus, created_by || 'Tester'],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: 'UX Issue created successfully' });
    }
  );
});

app.put('/api/issues/:id', (req, res) => {
  const { id } = req.params;
  const { status, severity, description, title } = req.body;

  let updates = [];
  let params = [];

  if (status) { updates.push('status = ?'); params.push(status); }
  if (severity) { updates.push('severity = ?'); params.push(severity); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (title) { updates.push('title = ?'); params.push(title); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields provided for update' });
  }

  params.push(id);
  const query = `UPDATE issues SET ${updates.join(', ')} WHERE id = ?`;

  db.run(query, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Issue updated successfully', updated: this.changes });
  });
});

app.delete('/api/issues/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM issues WHERE id = ?';
  db.run(query, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Issue deleted successfully' });
  });
});

// --- DESIGN ADJUSTMENTS ENDPOINTS ---
app.get('/api/adjustments', (req, res) => {
  const query = `
    SELECT a.*, i.title as issue_title, i.severity as issue_severity, i.status as issue_status, p.name as project_name
    FROM adjustments a
    JOIN issues i ON a.issue_id = i.id
    JOIN projects p ON i.project_id = p.id
    ORDER BY a.created_at DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/adjustments', (req, res) => {
  const { issue_id, adjustment_description, updated_by, mark_fixed } = req.body;
  if (!issue_id || !adjustment_description) {
    return res.status(400).json({ error: 'Issue and Adjustment Description are required' });
  }

  const adjStatus = mark_fixed ? 'Fixed' : 'In Progress';

  db.serialize(() => {
    const queryAdj = `
      INSERT INTO adjustments (issue_id, adjustment_description, updated_by, status)
      VALUES (?, ?, ?, ?)
    `;
    db.run(queryAdj, [issue_id, adjustment_description.trim(), updated_by || 'Designer', adjStatus], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const adjustmentId = this.lastID;

      // If mark_fixed is true or explicitly updating issue status
      if (mark_fixed) {
        db.run('UPDATE issues SET status = "Fixed" WHERE id = ?', [issue_id], (err2) => {
          if (err2) console.error('Failed to update issue status to Fixed:', err2);
        });
      } else {
        db.run('UPDATE issues SET status = "In Progress" WHERE id = ? AND status = "Open"', [issue_id]);
      }

      res.status(201).json({ id: adjustmentId, message: 'Design adjustment added successfully' });
    });
  });
});

// --- DASHBOARD STATS ENDPOINT ---
app.get('/api/dashboard/stats', (req, res) => {
  const stats = {
    totalProjects: 0,
    totalScenarios: 0,
    openIssues: 0,
    fixedIssues: 0,
    recentIssues: []
  };

  db.get('SELECT COUNT(*) as count FROM projects', (err, row) => {
    if (!err && row) stats.totalProjects = row.count;

    db.get('SELECT COUNT(*) as count FROM scenarios', (err2, row2) => {
      if (!err2 && row2) stats.totalScenarios = row2.count;

      db.get('SELECT COUNT(*) as count FROM issues WHERE status = "Open" OR status = "In Progress"', (err3, row3) => {
        if (!err3 && row3) stats.openIssues = row3.count;

        db.get('SELECT COUNT(*) as count FROM issues WHERE status = "Fixed"', (err4, row4) => {
          if (!err4 && row4) stats.fixedIssues = row4.count;

          const recentQuery = `
            SELECT i.*, p.name as project_name 
            FROM issues i
            JOIN projects p ON i.project_id = p.id
            ORDER BY i.created_at DESC
            LIMIT 5
          `;
          db.all(recentQuery, [], (err5, rows) => {
            if (!err5 && rows) stats.recentIssues = rows;
            res.json(stats);
          });
        });
      });
    });
  });
});

// Fallback to index.html for SPA-like navigation or direct hits
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Software Usability Testing Recorder Server Running `);
  console.log(` Environment Port : ${process.env.PORT || PORT}     `);
  console.log(` Local URL        : http://localhost:${PORT}        `);
  console.log(`====================================================`);
});
