const express = require("express");
const mongoose = require("mongoose");
const Admin = require('./Routes/Admin');
const UserRoute = require('./Routes/UserRoutes');
// const cors = require("cors");


const app = express();
const PORT = process.env.PORT || 3000;



app.use(express.json());
app.use('/', Admin, UserRoute);
// app.use(cors());

mongoose.connect(
  "mongodb+srv://ashutosh_shinde:fV6V3ySkK8bRJSCJ@cluster0.ffixaew.mongodb.net/Studentmanagementsystem?retryWrites=true&w=majority"
);

app.use(express.json());

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
