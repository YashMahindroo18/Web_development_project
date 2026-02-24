const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// 🔗 MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "student"
});

db.connect(err => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ Connected to MySQL database");
  }
});

// 🧪 Test Route
app.get("/", (req, res) => {
  res.send("Server is running");
});

// 🔐 Login API
app.post("/login", (req, res) => {
  const { student_id, password } = req.body;

  const sql = `
    SELECT student_id, name, course, year
    FROM students
    WHERE student_id = ? AND password = ?
  `;

  db.query(sql, [student_id, password], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false });
    }

    if (result.length > 0) {
      res.json({
        success: true,
        student: result[0]
      });
    } else {
      res.json({ success: false });
    }
  });
});
// 📊 Get Marksheet
// 📊 Get Marksheet (with semester filter)
// 📊 Get Marksheet (with subject details)
app.get("/marks/:student_id", (req, res) => {
  const studentId = req.params.student_id;
  const semester = req.query.semester;

  let sql = `
    SELECT 
      s.subject_name,
      s.type,
      s.credits,
      m.semester,
      m.marks,
      m.grade
    FROM marks m
    JOIN subjects s ON m.subject_id = s.subject_id
    WHERE m.student_id = ?
  `;

  const params = [studentId];

  if (semester) {
    sql += " AND m.semester = ?";
    params.push(semester);
  }

  sql += " ORDER BY m.semester, s.type";

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json([]);
    }
    res.json(results);
  });
});


// 🎓 SGPA API
app.get("/sgpa/:student_id/:semester", (req, res) => {
  const { student_id, semester } = req.params;

  const sql = `
    SELECT s.credits, m.grade
    FROM marks m
    JOIN subjects s ON m.subject_id = s.subject_id
    WHERE m.student_id = ? AND m.semester = ?
  `;

  db.query(sql, [student_id, semester], (err, results) => {
    if (err) return res.status(500).json({ sgpa: 0 });

    const gradePoints = {
      'A+': 10, 'A': 9, 'B+': 8,
      'B': 7, 'C': 6, 'D': 5, 'F': 0
    };

    let totalCredits = 0;
    let weightedSum = 0;

    results.forEach(row => {
      const gp = gradePoints[row.grade] || 0;
      weightedSum += gp * row.credits;
      totalCredits += row.credits;
    });

    const sgpa = totalCredits ? (weightedSum / totalCredits).toFixed(2) : 0;
    res.json({ sgpa });
  });
});
// 🎓 Auto Year Detection API
app.get("/year/:student_id", (req, res) => {
  const studentId = req.params.student_id;

  const sql = `
    SELECT MAX(semester) AS maxSemester
    FROM marks
    WHERE student_id = ?
  `;

  db.query(sql, [studentId], (err, results) => {
    if (err) return res.status(500).json({ year: "Unknown" });

    const maxSem = results[0].maxSemester || 1;

    let year;
    if (maxSem <= 2) year = "1st Year";
    else if (maxSem <= 4) year = "2nd Year";
    else if (maxSem <= 6) year = "3rd Year";
    else year = "4th Year";

    res.json({ year, maxSemester: maxSem });
  });
});

// 🚀 Start Server
app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});
