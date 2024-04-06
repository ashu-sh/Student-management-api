const express = require('express');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();
const Task = require("../SchemaModel/Tasks");
const User = require('../SchemaModel/Users'); 


const SECRET_KEY = "secretkey";


// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).send({ message: "Tu kon Ho Bhai ? Mujhe Tumhara GatePass Chahiye ! Access Denied !" });
  
    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) return res.status(403).send({ message: "Invalid token" });
      req.user = user;
      next();
    });
};


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
    console.log("Default Admin user created for testing");
  }
})();
  

router.post("/admin/login", async (req, res) => {
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
  
router.post("/admin/add-student", authenticateToken, async (req, res) => {
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
  
router.post("/admin/assign-task", authenticateToken, async (req, res) => {
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
  
router.get("/admin/students", authenticateToken, async (req, res) => {
    try {
      const students = await User.find({ role: "student" }, { password: 0 });
      res.json(students);
    } catch (error) {
      res.status(500).send({ message: "Error fetching students" });
    }
});
  
router.get("/admin/tasks", authenticateToken, async (req, res) => {
    try {
      const tasks = await Task.find().populate("assignedTo", "email");
      res.json(tasks);
    } catch (error) {
      res.status(500).send({ message: "Error fetching tasks" });
    }
});

module.exports = router;