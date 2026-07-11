// ===============================
// ABC PUBLIC SCHOOL SERVER
// Part 1
// ===============================

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();

// ===============================
// PORT
// ===============================

const PORT = process.env.PORT || 3000;

// ===============================
// CREATE FOLDERS
// ===============================

if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

if (!fs.existsSync("database")) {
    fs.mkdirSync("database");
}

// ===============================
// MIDDLEWARE
// ===============================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname)));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "school_secret_key",
        resave: false,
        saveUninitialized: false
    })
);

// ===============================
// SQLITE DATABASE
// ===============================

const db = new sqlite3.Database("./database/school.db", (err) => {

    if (err) {
        console.log(err.message);
    } else {
        console.log("SQLite Connected");
    }

});

// ===============================
// CREATE TABLE
// ===============================

db.serialize(() => {

    db.run(`
    CREATE TABLE IF NOT EXISTS admissions (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        studentName TEXT,

        parentName TEXT,

        email TEXT,

        phone TEXT,

        dob TEXT,

        gender TEXT,

        class TEXT,

        previousSchool TEXT,

        address TEXT,

        message TEXT,

        photo TEXT,

        certificate TEXT,

        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP

    )
    `);

});

// ===============================
// FILE UPLOAD
// ===============================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(null, "uploads/");

    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 100000) +
            path.extname(file.originalname);

        cb(null, uniqueName);

    }

});

const upload = multer({

    storage: storage,

    limits: {

        fileSize: 5 * 1024 * 1024

    }

});

// ===============================
// LOGIN CHECK
// ===============================

function checkLogin(req, res, next) {

    if (req.session.loggedIn) {

        next();

    } else {

        res.redirect("/admin/login.html");

    }

}

// ===============================
// ADMIN LOGIN
// ===============================

app.post("/login", (req, res) => {

    const username = req.body.username;

    const password = req.body.password;

    if (

        username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD

    ) {

        req.session.loggedIn = true;

        res.redirect("/admin/dashboard");

    } else {

        res.send(`
            <h2>Invalid Username or Password</h2>

            <a href="/admin/login.html">

            Try Again

            </a>
        `);

    }

});

// ===============================
// LOGOUT
// ===============================

app.get("/logout", (req, res) => {

    req.session.destroy(() => {

        res.redirect("/admin/login.html");

    });

});

// ===============================
// HOME ROUTE
// ===============================

app.get("/", (req, res) => {

    res.sendFile(path.join(__dirname, "index.html"));

});

// ===============================
// PART 2 STARTS BELOW
// DO NOT ADD app.listen() YET
// ===============================

// ===============================
// ADMISSION FORM SUBMISSION
// ===============================

app.post(
"/submit-admission",

upload.fields([
{ name: "photo", maxCount: 1 },
{ name: "certificate", maxCount: 1 }
]),

(req,res)=>{

try{

const body=req.body;

const photo=req.files.photo
? req.files.photo[0].filename
: "";

const certificate=req.files.certificate
? req.files.certificate[0].filename
: "";

db.run(

`
INSERT INTO admissions(

studentName,
parentName,
email,
phone,
dob,
gender,
class,
previousSchool,
address,
message,
photo,
certificate

)

VALUES(?,?,?,?,?,?,?,?,?,?,?,?)

`,

[

body.studentName,

body.parentName,

body.email,

body.phone,

body.dob,

body.gender,

body.class,

body.previousSchool,

body.address,

body.message,

photo,

certificate

],

function(err){

if(err){

console.log(err);

return res.send("Database Error");

}

res.send(`

<html>

<head>

<title>Admission Submitted</title>

<style>

body{

font-family:Arial;

text-align:center;

padding:100px;

background:#f5f5f5;

}

h1{

color:green;

}

a{

display:inline-block;

margin-top:30px;

padding:15px 35px;

background:#003366;

color:white;

text-decoration:none;

border-radius:8px;

}

</style>

</head>

<body>

<h1>

Admission Submitted Successfully

</h1>

<p>

Application ID : ${this.lastID}

</p>

<a href="/">

Back To Home

</a>

</body>

</html>

`);

}

);

}catch(e){

console.log(e);

res.send("Server Error");

}

}

);

// ===============================
// ADMIN DASHBOARD
// ===============================

app.get("/admin/dashboard", checkLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "admin", "dashboard.html"));
});

// 👇 ADD THE API HERE
app.get("/api/admissions", checkLogin, (req, res) => {

    db.all(
        "SELECT * FROM admissions ORDER BY id DESC",
        [],
        (err, rows) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            res.json(rows);

        }
    );

});

// 👇 ADD THE NEXT API HERE
app.get("/api/stats", checkLogin, (req, res) => {

    db.get(
        "SELECT COUNT(*) AS total FROM admissions",
        [],
        (err, row) => {

            if (err) {
                return res.status(500).json({
                    success: false
                });
            }

            res.json({
                total: row.total
            });

        }
    );

});

// more routes...

app.listen(PORT, () => {
    console.log("Server Started");
});

// ===============================
// VIEW SINGLE APPLICATION
// ===============================

app.get(

"/admin/view/:id",

checkLogin,

(req,res)=>{

db.get(

"SELECT * FROM admissions WHERE id=?",

[req.params.id],

(err,row)=>{

if(err){

return res.send(err.message);

}

if(!row){

return res.send("Student Not Found");

}

let html=`

<html>

<head>

<title>Student Details</title>

<style>

body{

font-family:Arial;

padding:40px;

}

table{

width:700px;

border-collapse:collapse;

}

td{

padding:12px;

border:1px solid #ccc;

}

img{

width:180px;

}

</style>

</head>

<body>

<h1>

Admission Details

</h1>

<table>

<tr>

<td>Student Name</td>

<td>${row.studentName}</td>

</tr>

<tr>

<td>Parent Name</td>

<td>${row.parentName}</td>

</tr>

<tr>

<td>Email</td>

<td>${row.email}</td>

</tr>

<tr>

<td>Phone</td>

<td>${row.phone}</td>

</tr>

<tr>

<td>Date Of Birth</td>

<td>${row.dob}</td>

</tr>

<tr>

<td>Gender</td>

<td>${row.gender}</td>

</tr>

<tr>

<td>Class</td>

<td>${row.class}</td>

</tr>

<tr>

<td>Previous School</td>

<td>${row.previousSchool}</td>

</tr>

<tr>

<td>Address</td>

<td>${row.address}</td>

</tr>

<tr>

<td>Message</td>

<td>${row.message}</td>

</tr>

<tr>

<td>Student Photo</td>

<td>

<img src="/uploads/${row.photo}">

</td>

</tr>

<tr>

<td>Certificate</td>

<td>

<a href="/uploads/${row.certificate}" target="_blank">

Open Certificate

</a>

</td>

</tr>

</table>

<br>

<a href="/admin/dashboard">

Back

</a>

</body>

</html>

`;

res.send(html);

}

);

}

);

// ===============================
// PART 3 STARTS BELOW
// ===============================

// ===============================
// DELETE ADMISSION
// ===============================

app.get("/admin/delete/:id", checkLogin, (req, res) => {

    const id = req.params.id;

    db.get(
        "SELECT * FROM admissions WHERE id = ?",
        [id],
        (err, row) => {

            if (err) {
                return res.send("Database Error");
            }

            if (!row) {
                return res.send("Student Not Found");
            }

            // Delete uploaded photo
            if (row.photo) {

                const photoPath = path.join(__dirname, "uploads", row.photo);

                if (fs.existsSync(photoPath)) {
                    fs.unlinkSync(photoPath);
                }

            }

            // Delete uploaded certificate
            if (row.certificate) {

                const certificatePath = path.join(__dirname, "uploads", row.certificate);

                if (fs.existsSync(certificatePath)) {
                    fs.unlinkSync(certificatePath);
                }

            }

            db.run(
                "DELETE FROM admissions WHERE id=?",
                [id],
                (err) => {

                    if (err) {
                        return res.send("Delete Failed");
                    }

                    res.redirect("/admin/dashboard");

                }
            );

        }
    );

});

// ===============================
// SEARCH STUDENTS
// ===============================

app.get("/admin/search", checkLogin, (req, res) => {

    const keyword = "%" + (req.query.q || "") + "%";

    db.all(

        `SELECT * FROM admissions
        WHERE studentName LIKE ?
        OR parentName LIKE ?
        OR class LIKE ?
        ORDER BY id DESC`,

        [keyword, keyword, keyword],

        (err, rows) => {

            if (err) {
                return res.send(err.message);
            }

            res.json(rows);

        }

    );

});

// ===============================
// DASHBOARD STATISTICS
// ===============================

app.get("/admin/stats", checkLogin, (req, res) => {

    db.get(

        "SELECT COUNT(*) AS total FROM admissions",

        (err, row) => {

            if (err) {
                return res.send(err.message);
            }

            res.json({
                totalAdmissions: row.total
            });

        }

    );

});

// ===============================
// 404 PAGE
// ===============================

app.use((req, res) => {

    res.status(404).send(`

    <!DOCTYPE html>

    <html>

    <head>

    <title>404</title>

    <style>

    body{

        font-family:Arial;

        background:#f5f5f5;

        display:flex;

        justify-content:center;

        align-items:center;

        height:100vh;

        flex-direction:column;

    }

    h1{

        font-size:70px;

        color:#003366;

    }

    a{

        margin-top:20px;

        padding:15px 35px;

        background:#003366;

        color:white;

        text-decoration:none;

        border-radius:8px;

    }

    </style>

    </head>

    <body>

    <h1>404</h1>

    <p>Page Not Found</p>

    <a href="/">Go Home</a>

    </body>

    </html>

    `);

});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {

    console.log("");

    console.log("====================================");
    console.log(" ABC PUBLIC SCHOOL SERVER RUNNING");
    console.log("====================================");
    console.log("");

    console.log(`Website : http://localhost:${PORT}`);

    console.log(`Admin   : http://localhost:${PORT}/admin/login.html`);

    console.log("");

});