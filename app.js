const express = require("express");
const crypto = require("crypto");
const http = require("http");
const socketIo = require("socket.io");
const dayjs = require("dayjs");
const relativeTime = require("dayjs/plugin/relativeTime");
const localizedFormat = require("dayjs/plugin/localizedFormat");
const cors = require("cors");
const { MongoClient, ServerApiVersion, BSON } = require("mongodb");

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

const uri =
  "mongodb+srv://qrattendancethesis:admin@thesis-cluster.rcibufr.mongodb.net/?retryWrites=true&w=majority&appName=thesis-cluster";

const app = express();
const PORT = 3000;

const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(cors());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const mongoClientRun = async () => {
  // Connect the client to the server	(optional starting in v4.7)
  await client.connect();
  // Send a ping to confirm a successful connection
  await client.db("admin").command({ ping: 1 });
  console.log("Pinged your deployment. You successfully connected to MongoDB!");
};

io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle incoming messages from the client
  socket.on("message", (data) => {
    console.log("Received message:", data);
    // You can emit messages back to the client if needed
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

app.get("/", (req, res) => {
  res.status(200);
  res.send("Welcome to root URL of Server");
});

app.post("/login", async (req, res) => {
  try {
    await mongoClientRun();

    const db = client.db("ThesisData");
    const table = db.collection("UsersTable");

    const { email, password } = req.body;

    //Find user based on email
    const user = await table.findOne({ email });

    //Return error if email doesn't exist or password didnt match
    if (!user || password !== user.password) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Return success if email and password matches
    await client.close();
    delete user.password;
    return res.status(200).json({
      message: "User is authorized",
      user,
    });
  } catch (error) {
    console.log("error: ", error);
    //Return error if can't connect db
    await client.close();
    return res.status(500).json({
      message: "Server Error ",
    });
  }
});

app.post("/create-event", async (req, res) => {
  try {
    await mongoClientRun();

    const db = client.db("ThesisData");
    const table = db.collection("Events");

    const { eventName, description, date, timeIn, timeOut } = req.body;

    if (
      eventName === "" ||
      description === "" ||
      date === null ||
      timeIn === "" ||
      timeOut === ""
    ) {
      return res.status(500).json({
        message: "Server Error ",
      });
    }

    const result = await table.insertOne({
      name: eventName,
      description,
      date,
      timeIn,
      timeOut,
    });

    if (!result) {
      return res.status(500).json({
        message: "Server Error ",
      });
    }

    // Return success if email and password matches
    await client.close();
    return res.status(200).json({
      message: "Event successfully created",
    });
  } catch (error) {
    console.log("error: ", error);
    //Return error if can't connect db
    await client.close();
    return res.status(500).json({
      message: "Server Error ",
    });
  }
});

app.get("/get-events", async (req, res) => {
  try {
    await mongoClientRun();

    const db = client.db("ThesisData");
    const table = db.collection("Events");

    const data = await table.find().toArray();
    await client.close();

    return res.status(200).json({
      message: "Events successfully fetched",
      data,
    });
  } catch (error) {
    console.log("error: ", error);
    //Return error if can't connect db
    await client.close();
    return res.status(500).json({
      message: "Server Error ",
    });
  }
});

app.get("/get-events-per-student", async (req, res) => {
  try {
    await mongoClientRun();

    const { studentId } = req.body;

    const db = client.db("ThesisData");
    const table = db.collection("Events");
    const attendanceTable = db.collection("Attendance");
    const usersTable = db.collection("UsersTable");

    //extract user by student id
    const student = await usersTable.findOne({ _id: studentId });

    console.log("student: ", student);

    const data = await table.find().toArray();

    //filter out inprogress events
    const formattedData = data.filter((event) => {
      return dayjs.unix(event.timeIn).isBefore(dayjs());
    });

    // formattedData.forEach(async (event) => {
    //   const attendance = await attendanceTable
    //     .findOne({
    //       eventId: event._id,
    //       email: student.email,
    //     })
    //     .toArray();

    //   console.log("data: ", attendance);
    // });

    await client.close();

    return res.status(200).json({
      message: "Events successfully fetched",
      formattedData,
    });
  } catch (error) {
    console.log("error: ", error);
    //Return error if can't connect db
    await client.close();
    return res.status(500).json({
      message: "Server Error ",
    });
  }
});

app.get("/get-students", async (req, res) => {
  try {
    await mongoClientRun();

    const db = client.db("ThesisData");
    const table = db.collection("UsersTable");

    //Find users based on email
    const users = await table.find().toArray();
    await client.close();

    if (!users) {
      return res.status(200).json({
        message: "Student users are empty",
        students: [],
      });
    }

    //remove unccessary fields
    const formattedStudents = users
      .filter((user) => user.role === "student")
      .map((student) => {
        if (student.loginCount > 0) {
          delete student.password;
        }
        delete student._createdAt;
        delete student._updatedAt;
        return student;
      });

    return res.status(200).json({
      message: "List of students.",
      students: formattedStudents,
    });
  } catch (error) {
    console.log("error: ", error);
    //Return error if can't connect db
    await client.close();
    return res.status(500).json({
      message: "Server Error ",
    });
  }
});

app.post("/create-student", async (req, res) => {
  try {
    await mongoClientRun();

    const db = client.db("ThesisData");
    const table = db.collection("UsersTable");

    const { email, name, department, course } = req.body;

    if (email === "" || name === "") {
      return res.status(500).json({
        message: "Server Error ",
      });
    }

    const generatedPassword = crypto
      .randomBytes(Math.ceil((50 * 3) / 4))
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "");
    console.log("generatedPassword: ", generatedPassword);

    const decodedPassword = Buffer.from(generatedPassword, "base64")
      .toString()
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 12);

    console.log("decodedPassword: ", decodedPassword);

    const encodedPassword = Buffer.from(decodedPassword).toString("base64");

    console.log("encodedPassword: ", encodedPassword);

    const result = await table.insertOne({
      email,
      password: encodedPassword,
      name,
      department,
      course,
      loginCount: 0,
      role: "student",
      _createdAt: new Date(),
      _updatedAt: new Date(),
    });

    if (!result) {
      return res.status(500).json({
        message: "Server Error ",
      });
    }

    // Return success if email and password matches
    await client.close();
    return res.status(200).json({
      message: "Student successfully created",
    });
  } catch (error) {
    console.log("error: ", error);
    //Return error if can't connect db
    await client.close();
    return res.status(500).json({
      message: "Server Error ",
    });
  }
});

app.post("/create-admin", async (req, res) => {
  try {
    await mongoClientRun();

    const db = client.db("ThesisData");
    const table = db.collection("UsersTable");

    const { email, password, name } = req.body;

    if (email === "" || password === "" || name === "") {
      return res.status(500).json({
        message: "Server Error ",
      });
    }

    const result = await table.insertOne({
      email,
      password,
      name,
      role: "admin",
      _createdAt: new Date(),
      _updatedAt: new Date(),
    });

    if (!result) {
      return res.status(500).json({
        message: "Server Error ",
      });
    }

    // Return success if email and password matches
    await client.close();
    return res.status(200).json({
      message: "Admin successfully created",
    });
  } catch (error) {
    console.log("error: ", error);
    //Return error if can't connect db
    await client.close();
    return res.status(500).json({
      message: "Server Error ",
    });
  }
});

app.get("/get-admins", async (req, res) => {
  try {
    await mongoClientRun();

    const db = client.db("ThesisData");
    const table = db.collection("UsersTable");

    //Find users based on email
    const users = await table.find().toArray();
    await client.close();

    if (!users) {
      return res.status(200).json({
        message: "Admin users are empty",
        admins: [],
      });
    }

    //remove unccessary fields
    const formattedAdmin = users
      .filter((user) => user.role === "admin")
      .map((admin) => {
        delete admin.password;
        delete admin._createdAt;
        delete admin._updatedAt;
        return admin;
      });

    // Return success if email and password matches
    return res.status(200).json({
      message: "List of admin users.",
      admins: formattedAdmin,
    });
  } catch (error) {
    console.log("error: ", error);
    //Return error if can't connect db
    await client.close();
    return res.status(500).json({
      message: "Server Error ",
    });
  }
});

app.post("/reset-password", async (req, res) => {
  try {
    await mongoClientRun();

    const { email, newPassword, oldPassword } = req.body;

    const db = client.db("ThesisData");
    const table = db.collection("UsersTable");

    //Find users based on email
    const user = await table.findOne({ email });

    if (user.password !== oldPassword) {
      return res.status(404).json({
        message: "Old password doesn't match",
      });
    }

    const filter = { email: email };
    const options = { upsert: true };
    const updateDoc = {
      $set: {
        password: newPassword,
        loginCount: user.loginCount + 1,
      },
    };

    const result = await table.updateOne(filter, updateDoc, options);

    if (!result) {
      return res.status(500).json({
        message: "Server Error ",
      });
    }

    return res.status(200).json({
      message: "Password successfully updated",
      user: {
        ...user,
        password: newPassword,
        loginCount: user.loginCount + 1,
      },
    });
  } catch (error) {
    console.log("error: ", error);
    //Return error if can't connect db
    await client.close();
    return res.status(500).json({
      message: "Server Error ",
    });
  }
});

app.get("/get-time-in-status", async (req, res) => {
  try {
    await mongoClientRun();

    const db = client.db("ThesisData");
    const table = db.collection("Attendance");
    const eventTable = db.collection("Events");

    const { eventId, email } = req.query;

    //Find users based on email
    const event = await eventTable.findOne({
      _id: BSON.ObjectId.createFromHexString(eventId),
    });

    const now = dayjs();
    const timeIn = dayjs.unix(event.timeIn);

    const diff = now.diff(timeIn, "minutes");

    if (diff < 0) {
      return res.status(200).json({
        message: "Event hasn't started yet",
      });
    }

    const studentAttendance = await table
      .findOne({
        eventId: eventId,
        email: email,
      })
      .toArray();

    if (!studentAttendance) {
      return res.status(200).json({
        message: "Student hasn't time in yet",
      });
    } else {
      return res.status(200).json({
        message: "Student has time in",
      });
    }
  } catch (error) {
    console.log("error: ", error);
    //Return error if can't connect db
    await client.close();
    return res.status(500).json({
      message: "Server Error ",
    });
  }
});

app.get("/check", async (req, res) => {
  try {
    console.log("Checking connection to backend server.");
    return res.status(200).json({
      message: "Connected to backend server.",
    });
  } catch (error) {
    console.log("error: ", error);
    return res.status(500).json({
      message: "Server Error ",
    });
  }
});

app.post("/save-attendance", async (req, res) => {
  try {
    console.log("Request body: ", req.body);

    await mongoClientRun();
    const now = new dayjs().unix();
    console.log(now);

    const db = client.db("ThesisData");
    const table = db.collection("Attendance");

    const { email, id: eventId } = req.body;

    if (email === "" || eventId === "") {
      return res.status(500).json({
        message: "Server Error ",
      });
    }

    const user = await table.findOne({ eventId, email });

    if (!user) {
      const result = await table.insertOne({
        email,
        eventId,
        timeIn: now,
        timeOut: null,
      });

      if (result) {
        return res.status(200).json({
          message: "Attendance successfully saved",
        });
      }
    }

    const filter = { email: email, eventId: eventId };
    const options = { upsert: true };
    const updateDoc = {
      $set: {
        timeOut: now,
      },
    };

    const result = await table.updateOne(filter, updateDoc, options);

    if (result) {
      return res.status(200).json({
        message: "Attendance successfully saved",
      });
    }

    return res.status(500).json({
      message: "Server Error ",
    });
  } catch (error) {
    console.log("error: ", error);
    return res.status(500).json({
      message: "Server Error ",
    });
  }
});

app.get("/get-attendance", async (req, res) => {
  try {
    await mongoClientRun();

    const db = client.db("ThesisData");
    const table = db.collection("Attendance");
    const usersTable = db.collection("UsersTable");

    const { eventId } = req.body;

    //Find users based on email
    const attendance = await table.find({ eventId }).toArray();
    const users = await usersTable.find().toArray();
    await client.close();

    if (!attendance) {
      return res.status(200).json({
        message: "Attendance for this event is empty",
        admins: [],
      });
    }

    //remove unccessary fields
    const formattedAttendance = attendance.map((attend) => {
      const user = users.find((user) => user.email === attend.email);
      return {
        ...attend,
        name: user.name,
        department: user.department,
        course: user.course,
      };
    });

    // Return success if email and password matches
    return res.status(200).json({
      message: "List of attendance for the event.",
      attendance: formattedAttendance,
    });
  } catch (error) {
    console.log("error: ", error);
    //Return error if can't connect db
    await client.close();
    return res.status(500).json({
      message: "Server Error ",
    });
  }
});

server.listen(PORT, (error) => {
  if (!error)
    console.log(
      "Server is Successfully Running, and App is listening on port " + PORT
    );
  else console.log("Error occurred, server can't start", error);
});
