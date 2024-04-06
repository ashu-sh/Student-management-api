const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Schema } = mongoose;

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = "secretkey";

const cors = require("cors");

app.use(express.json());
app.use(cors());

mongoose.connect(
  "mongodb+srv://ashutosh_shinde:fV6V3ySkK8bRJSCJ@cluster0.ffixaew.mongodb.net/Studentmanagementsystem?retryWrites=true&w=majority"
);
const UserSchema = new Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
});

const TaskSchema = new Schema({
  description: { type: String, required: true },
  dueTime: { type: Date, required: true },
  status: {
    type: String,
    enum: ["pending", "completed", "overdue"],
    default: "pending",
  },
  assignedTo: { type: String, ref: "User" },
});

const User = mongoose.model("User", UserSchema);
const Task = mongoose.model("Task", TaskSchema);

app.use(express.json());

(async () => {
  const adminExists = await User.exists({ email: "admin@admin.com" });

  if (!adminExists) {
    const hashedAdminPassword = await bcrypt.hash("admin", 10);
    const admin = new User({
      email: "admin@admin.com",
      password: hashedAdminPassword,
      role: "admin",
    });

    await admin.save();
    console.log("Admin user created for testing: admin@admin.com / admin");
  }
})();

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).send({ message: "Access denied" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).send({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

// Routes
app.post("/student/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).send({ message: "Invalid email or password" });
  }

  const token = jwt.sign({ email: user.email, role: user.role }, SECRET_KEY);
  res.json({ token });
});

// Admin panel endpoints
app.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;
  const admin = await User.findOne({ email, role: "admin" });

  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    return res
      .status(401)
      .send({ message: "Unauthorized: Invalid credentials" });
  }

  const token = jwt.sign({ email: admin.email, role: admin.role }, SECRET_KEY);
  res.json({ token });
});

app.post("/admin/add-student", authenticateToken, async (req, res) => {
  const { name, email, department, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const student = new User({
      name,
      email,
      department,
      password: hashedPassword,
      role: "student",
    });

    await student.save();
    res.status(201).json(student);
  } catch (error) {
    res.status(500).send({ message: "Error adding student" });
  }
});

app.post("/admin/assign-task", authenticateToken, async (req, res) => {
  const { description, dueTime, assignedTo } = req.body;

  try {
    const student = await User.findOne({ email: assignedTo, role: "student" });

    if (!student) {
      return res
        .status(404)
        .send({ message: "Student not found or not assigned as a student" });
    }

    const task = new Task({ description, dueTime, assignedTo: student._id });
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(500).send({ message: "Error assigning task" });
  }
});

app.get("/admin/students", authenticateToken, async (req, res) => {
  try {
    const students = await User.find({ role: "student" }, { password: 0 });
    res.json(students);
  } catch (error) {
    res.status(500).send({ message: "Error fetching students" });
  }
});

app.get("/admin/tasks", authenticateToken, async (req, res) => {
  try {
    const tasks = await Task.find().populate("assignedTo", "email");
    res.json(tasks);
  } catch (error) {
    res.status(500).send({ message: "Error fetching tasks" });
  }
});

// Student interface endpoints
// Student endpoint to get their tasks by email
app.get("/student/tasks", authenticateToken, async (req, res) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ message: "Permission denied" });
  }

  const { email } = req.user;

  try {
    const student = await User.findOne({ email, role: "student" });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const tasks = await Task.find({ assignedTo: student._id }).populate(
      "assignedTo",
      "email"
    );
    res.json(tasks);
    console.log(tasks);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

app.patch(
  "/student/update-task/:taskId",
  authenticateToken,
  async (req, res) => {
    const { status } = req.body;
    const { taskId } = req.params;

    try {
      const task = await Task.findById(taskId);
      if (!task) return res.status(404).send({ message: "Task not found" });

      task.status = status;
      await task.save();

      res.json(task);
    } catch (error) {
      res.status(500).send({ message: "Error updating task" });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
