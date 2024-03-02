 
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://qrattendancethesis:admin@thesis-cluster.rcibufr.mongodb.net/?retryWrites=true&w=majority&appName=thesis-cluster";
  
const app = express(); 
const PORT = 3000;

app.use(express.json());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

const mongoClientRun = async () => {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    // try {
    //     // Connect the client to the server	(optional starting in v4.7)
    //     await client.connect();
    //     // Send a ping to confirm a successful connection
    //     await client.db("admin").command({ ping: 1 });
    //     console.log("Pinged your deployment. You successfully connected to MongoDB!");
    // } finally {
    //     // Ensures that the client will close when you finish/error
    //     await client.close();
    // }
}


app.get('/', (req, res)=>{ 
    res.status(200); 
    res.send("Welcome to root URL of Server"); 
});

app.post('/login', async(req, res)=>{
    try {
        await mongoClientRun();
        
        // const email = "qrthesisattendance@gmail.com"
        // const password = "QWRtaW5QYXNzd29yZA=="

        const db = client.db("ThesisData")
        const table = db.collection('UsersTable')

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
            user
        })
    } catch (error) {
        console.log("error: ", error)
        //Return error if can't connect db
        await client.close();
        return res.status(500).json({            
            message: "Server Error ",
        });
    }
});

app.listen(PORT, (error) =>{ 
    if(!error) 
        console.log("Server is Successfully Running, and App is listening on port "+ PORT) 
    else 
        console.log("Error occurred, server can't start", error); 
    } 
); 