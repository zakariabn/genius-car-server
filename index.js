const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { decode } = require("jws");

// middle_ware
app.use(cors());
app.use(express.json());

// default root
app.get("/", (req, res) => {
  res.send("Server Running");
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if(!authHeader) {
    return res.status(401).send({message: 'Unauthorized access'})
  }
  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if(error) {
      return res.status(403).send({message: 'Forbidden access'})
    }
    req.decoded = decoded;
    next();
  })
}

// mongodb config file
const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@genius-car-cluster.f9pbu.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db("geniusCar").collection("service");
    const orderCollection = client.db("geniusCar").collection("order");

    // AUTH
    app.post("/login", async (req, res) => {
      const user = req.body;
      console.log(user);
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send({ accessToken: accessToken });
    });

    // get service
    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const service = await cursor.toArray();
      res.send(service);
    });

    // get specific service by id
    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };

      const service = await serviceCollection.findOne(query);
      res.send(service);
    });

    // post service
    app.post("/service", async (req, res) => {
      const { name, price, description, img } = req.body;
      const doc = {
        name: name,
        price: price,
        description: description,
        img: img,
      };
      const result = await serviceCollection.insertOne(doc);
      res.send(result);
    });

    // delete specific service by id
    app.delete("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const service = await serviceCollection.deleteOne(query);
      res.send(service);
    });

    // order collection api

    // get order by userEmail
    app.get("/order", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;

      if (email === decodedEmail) {
        const query = { email: email };
        const cursor = orderCollection.find(query);
        const order = await cursor.toArray();
        res.send(order);
      }
      else {
        res.status(403).send({message: 'Forbidden access'})
      }
    });

    // add order
    app.post("/order", async (req, res) => {
      const order = req.body;
      console.log(order);
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });
  } finally {
    // client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Running on: http://${process.env.HOST}:${process.env.PORT}`);
});
