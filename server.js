const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

/* ========= CONFIG ========= */
const ADMIN_USER = "Admin";
const ADMIN_PASS = "12345";
const WHATSAPP = "9238587811";

const DATA_FILE = path.join(__dirname, "cars.json");
const UPLOAD_DIR = path.join(__dirname, "uploads");

/* ========= ENSURE STORAGE ========= */
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "[]");
}

/* ========= MIDDLEWARE ========= */
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

/* ========= MULTER ========= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

/* ========= HELPERS ========= */
const readCars = () =>
  JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

const saveCars = (cars) =>
  fs.writeFileSync(DATA_FILE, JSON.stringify(cars, null, 2));

/* ========= API ========= */
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  res.json({
    success: username === ADMIN_USER && password === ADMIN_PASS,
  });
});

app.get("/cars", (req, res) => {
  res.json(readCars());
});

app.post("/add-car", upload.array("images", 10), (req, res) => {
  const cars = readCars();

  const car = {
    id: Date.now(),
    model: req.body.model,
    year: req.body.year,
    price: req.body.price,
    km: req.body.km,
    condition: req.body.condition,
    images: req.files.map((f) => "/uploads/" + f.filename),
  };

  cars.push(car);
  saveCars(cars);

  res.json({ success: true });
});

/* ========= FRONTEND ========= */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>EXAMPLE DEALERSHIP</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{margin:0;font-family:Arial;background:#0b0b0b;color:#fff}
header{background:#111;padding:15px;text-align:center;font-size:22px}
#cars{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:15px;padding:15px}
.card{background:#1a1a1a;padding:10px;border-radius:10px;cursor:pointer;transition:.3s}
.card:hover{transform:scale(1.05)}
img{width:100%;border-radius:8px}
button{padding:10px;border:none;border-radius:6px;cursor:pointer}
#addBtn{position:fixed;bottom:20px;right:20px;font-size:30px}
.overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:#000c;overflow:auto;padding:20px}
input,select{width:100%;padding:10px;margin:6px 0}
</style>
</head>
<body>

<header>🚗 EXAMPLE DEALERSHIP</header>
<div id="cars"></div>

<button id="addBtn" onclick="openAdd()">＋</button>

<div id="login" class="overlay">
<h2>Admin Login</h2>
<input id="u" placeholder="Username">
<input id="p" type="password" placeholder="Password">
<button onclick="login()">Login</button>
</div>

<div id="addCar" class="overlay">
<h2>Add Car</h2>
<input id="model" placeholder="Model">
<input id="year" placeholder="Year">
<input id="price" placeholder="Price">
<input id="km" placeholder="Driven (km)">
<select id="condition">
<option>New</option>
<option>Used</option>
</select>
<input type="file" id="images" multiple accept="image/*" capture>
<button onclick="saveCar()">Save</button>
</div>

<div id="detail" class="overlay"></div>

<a href="https://wa.me/${WHATSAPP}" target="_blank"
style="position:fixed;bottom:20px;left:20px;color:#0f0">💬 WhatsApp</a>

<script>
let isAdmin=false;

fetch('/cars').then(r=>r.json()).then(showCars);

function showCars(cars){
  const c=document.getElementById("cars");
  c.innerHTML="";
  cars.forEach(car=>{
    const d=document.createElement("div");
    d.className="card";
    d.innerHTML=\`
      <img src="\${car.images[0]||''}">
      <h3>\${car.model}</h3>
      <p>₹\${car.price}</p>
    \`;
    d.onclick=()=>showDetail(car);
    c.appendChild(d);
  });
}

function showDetail(car){
  detail.style.display="block";
  detail.innerHTML=\`
    <h2>\${car.model}</h2>
    \${car.images.map(i=>'<img src="'+i+'">').join("")}
    <p>Year: \${car.year}</p>
    <p>Driven: \${car.km} km</p>
    <p>Condition: \${car.condition}</p>
    <p>Price: ₹\${car.price}</p>
    <button onclick="detail.style.display='none'">Close</button>
  \`;
}

function openAdd(){
  if(!isAdmin) login.style.display="block";
  else addCar.style.display="block";
}

function login(){
  fetch('/login',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username:u.value,password:p.value})
  }).then(r=>r.json()).then(d=>{
    if(d.success){
      isAdmin=true;
      login.style.display="none";
    } else alert("Wrong login");
  });
}

function saveCar(){
  const f=new FormData();
  ["model","year","price","km","condition"].forEach(id=>{
    f.append(id,document.getElementById(id).value);
  });
  [...images.files].forEach(img=>f.append("images",img));
  fetch('/add-car',{method:"POST",body:f})
  .then(()=>location.reload());
}
</script>
</body>
</html>
`);
});

/* ========= START ========= */
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
