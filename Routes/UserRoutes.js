const express = require('express')
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();
const Task = require("../SchemaModel/Tasks");
const User = require('../SchemaModel/Users'); 



const SECRET_KEY = "secretkey";


// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).send({ message: "Tu kon Ho Bhai ? Mujhe Tumhara GatePass Chahiye ! Access Denied !" });
  
    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) return res.status(403).send({ message: "Invalid token" });
      req.user = user;
      next();
    });
};


router.post("/student/login", async (req, res) => {
    const { email, password } = req.body;
  
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).send({ message: "Invalid email or password" });
    }
  
    const token = jwt.sign({ email: user.email, role: user.role }, SECRET_KEY);
    res.json({ token });
});

router.get("/student/tasks", authenticateToken, async (req, res) => {
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
  
router.patch(
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
});

module.exports = router;
