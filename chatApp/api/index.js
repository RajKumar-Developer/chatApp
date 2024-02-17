const express = require("express"); //#1
const mongoose = require("mongoose"); //#1
const cookieParser = require("cookie-parser"); //#3
const bcrypt = require("bcryptjs"); //#3
const dotenv = require("dotenv"); //#1
const User = require("./models/User"); //#2
const Message = require("./models/Message"); //#2
const jwt = require("jsonwebtoken"); //#1
const cors = require("cors"); //#1
const ws = require("ws"); //#1
const fs = require('fs')

dotenv.config();

const app = express(); //!important
app.use('/uploads',express.static(__dirname+'/uploads'))
app.use(express.json()); //!important
app.use(cookieParser()); //!important
app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
  })
); //!important

// Update your MongoDB connection code like this:
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  }); //!important

const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

app.get("/test", (req, res) => {
  res.json("test ok");
});

function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    } else {
      reject("no token");
    }
  });
}

app.get("/messages/:userId", async (req, res) => {
  const { userId } = req.params;
  const userData = await getUserDataFromRequest(req);
  const ourUserId = userData.userId;
  const messages = await Message.find({
    sender: { $in: [userId, ourUserId] },
    recipient: { $in: [userId, ourUserId] },
  }).sort({ createdAt: 1 });
  res.json(messages);
});

app.get("/people", async (req, res) => {
  const Users = await User.find({}, { _id: 1, username: 1 });
  res.json(Users);
});

app.get("/profile", (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) {
        console.error(err);
        res.status(401).json("Invalid token");
      } else {
        res.json(userData);
      }
    });
  } else {
    res.status(401).json("No token");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username });

  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password);
    if (passOk) {
      jwt.sign(
        { userId: foundUser._id, username },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err;
          res.cookie("token", token, { sameSite: "none", secure: true }).json({
            id: foundUser._id,
          });
        }
      );
    } else {
      res.status(401).json("Invalid Password");
    }
  } else {
    res.status(401).json("User not found");
  }
});

app.post("/logout", (req, res) => {
  res.cookie("token", '', { sameSite: "none", secure: true }).json('ok')
});

// ...

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({
      username,
      password: hashedPassword,
    });
    jwt.sign(
      { userId: createdUser._id, username },
      jwtSecret,
      {},
      (err, token) => {
        if (err) throw err;
        res
          .cookie("token", token, { sameSite: "none", secure: true })
          .status(201)
          .json({
            id: createdUser._id,
          });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json("error");
  }
});

const server = app.listen(4000, () => {
  console.log("server running ....");
});

const wss = new ws.WebSocketServer({ server });

const activeUsers = new Set();

wss.on("connection", (connection, req) => {
  //read username and id form the cookies for this connection

  function notifyAboutOnlinePeople(){
    wss.clients.forEach((client) => {
      client.send(
        JSON.stringify({
          online: [...wss.clients].map((c) => ({
            userId: c.userId,
            username: c.username,
          })),
        })
      );
    });
  }

  connection.isAlive = true;

  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyAboutOnlinePeople();
    },1000);
  },1000);

  connection.on("pong",()=>{
    clearTimeout(connection.deathTimer);
  });

  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.trim().startsWith("token="));
    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) throw err;
          const { userId, username } = userData;
          connection.userId = userId;
          connection.username = username;
        });
      }
    }
  }


  connection.on("message", async (message, isBinary) => {
    messageData = JSON.parse(message.toString());
    const { recipient, text ,file} = messageData;
    let filename = null;

    if(file){
      const parts = file.name.split('.')
      const ext =parts[parts.length-1]
      filename = Date.now()+'.'+ext;
      const path = __dirname+'/uploads/'+filename;
      const bufferData = Buffer.from(file.data.split(',')[1],'base64');
      fs.writeFile(path,bufferData,()=>{
      })
    }
    
    if (recipient && (text || file)) {
      const messageDoc = await Message.create({
        sender: connection.userId,
        recipient,
        text,
        file: file ? filename : null,
      });
      Array.from(wss.clients)
        .filter((c) => c.userId === recipient)
        .forEach((c) =>
          c.send(
            JSON.stringify({
              text,
              sender: connection.userId,
              recipient,
              file: file ? filename : null,
              _id: messageDoc._id,
            })
          )
        );
    }
  });




  //notify everyone about online people (when someone connected)
  notifyAboutOnlinePeople()
});
