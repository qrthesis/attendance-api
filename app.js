const express = require("express");
var cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri =
  "mongodb+srv://qrattendancethesis:admin@thesis-cluster.rcibufr.mongodb.net/?retryWrites=true&w=majority&appName=thesis-cluster";

const app = express();
const PORT = 3000;

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

    const { eventName, description, date } = req.body;

    if (eventName === "" || description === "" || date === null) {
      return res.status(500).json({
        message: "Server Error ",
      });
    }

    const result = await table.insertOne({
      name: eventName,
      description,
      date,
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

app.get("/get-students", async (req, res) => {
  try {
    await mongoClientRun();

    const db = client.db("ThesisData");
    const table = db.collection("UsersTable");

    //Find users based on email
    const users = await table.find().toArray();
    await client.close();

    //Return error if email doesn't exist or password didnt match
    if (!users) {
      return res.status(500).json({
        message: "Server error",
      });
    }
    // Return success if email and password matches
    await client.close();
    return res.status(200).json({
      message: "List of students.",
      students: users.filter((user) => user.role === "student"),
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

app.get("/get-admins", async (req, res) => {
  try {
    await mongoClientRun();

    const db = client.db("ThesisData");
    const table = db.collection("UsersTable");

    //Find users based on email
    const users = await table.find().toArray();
    await client.close();

    //Return error if email doesn't exist or password didnt match
    if (!users) {
      return res.status(500).json({
        message: "Server error",
      });
    }
    // Return success if email and password matches
    await client.close();
    return res.status(200).json({
      message: "List of admin users.",
      students: users.filter((user) => user.role === "admin"),
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

app.listen(PORT, (error) => {
  if (!error)
    console.log(
      "Server is Successfully Running, and App is listening on port " + PORT
    );
  else console.log("Error occurred, server can't start", error);
});
