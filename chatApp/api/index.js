const express = require('express');//#1
const mongoose =  require('mongoose');//#1
const cookieParser =require('cookie-parser')//#3
const bcrypt = require('bcryptjs')//#3
const dotenv = require('dotenv');//#1
const User = require('./models/User');//#2
const Message = require('./models/Message')//#2
const jwt = require('jsonwebtoken');//#1
const cors = require('cors');//#1
const ws = require('ws')//#1

dotenv.config(); 

const app = express();//!important
app.use(express.json());//!important
app.use(cookieParser());//!important
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
}));//!important

// Update your MongoDB connection code like this:
mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  });//!important

const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

app.get('/test', (req, res) => {
    res.json('test ok');
});

function getUserDataFromRequest(req){
    return new Promise((resolve,reject) =>{
        const token = req.cookies?.token;
        if (token) {
            jwt.verify(token, jwtSecret, {}, (err, userData) => {
                if (err) throw err;
                resolve(userData);
            });
        }else{
            reject('no token');
        }
    });
    
}

app.get('/messages/:userId', async(req,res)=>{
    const {userId} = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
        sender:{$in:[userId,ourUserId]},
        recipient:{$in:[userId,ourUserId]},
    }).sort({createdAt:-1}).exec();
    res.json(messages);
});

app.get('/profile', (req, res) => {
    const token = req.cookies?.token;
    if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
            if (err) {
                console.error(err);
                res.status(401).json('Invalid token');
            } else {
                res.json(userData);
            }
        });
    } else {
        res.status(401).json('No token');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const foundUser = await User.findOne({ username });

    if (foundUser) {
        const passOk = bcrypt.compareSync(password, foundUser.password);
        if (passOk) {
            jwt.sign({ userId: foundUser._id, username }, jwtSecret, {}, (err, token) => {
                if (err) throw err;
                res.cookie('token', token, { sameSite: 'none', secure: true }).json({
                    id: foundUser._id,
                });
            });
        } else {
            res.status(401).json('Invalid Password');
        }
    } else {
        res.status(401).json('User not found');
    }
});

// ...

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
        const createdUser = await User.create({
            username,
            password: hashedPassword,
        });
        jwt.sign({ userId: createdUser._id, username }, jwtSecret, {}, (err, token) => {
            if (err) throw err;
            res.cookie('token', token, { sameSite: 'none', secure: true }).status(201).json({
                id: createdUser._id,
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json('error');
    }
});


const server = app.listen(4000, () => {
    console.log('server running ....');
});

const wss = new ws.WebSocketServer({ server });

const activeUsers = new Set();

wss.on('connection', (connection, req) => {

    //read username and id form the cookies for this connection
    const cookies = req.headers.cookie;
    if (cookies) {
        const tokenCookieString = cookies.split(';').find(str => str.trim().startsWith('token='));
        if (tokenCookieString) {
            const token = tokenCookieString.split('=')[1];
            if (token) {
                jwt.verify(token, jwtSecret, {}, (err, userData) => {
                    if (err) throw err;
                    const { userId, username } = userData;
                    connection.userId = userId;
                    connection.username = username;

                    // Add user to activeUsers set
                    // activeUsers.add(username);

                    // console.log('Active Users:', [...activeUsers]);
                });
            }
        }
    }

    connection.on('message', async(message,isBinary)=>{
         messageData = JSON.parse(message.toString());
         console.log(messageData);
         const {recipient ,text} = messageData;
         if (recipient && text ){
            const messageDoc = await Message.create({
                sender:connection.userId,
                recipient,
                text,
            })
            Array.from(wss.clients)
            .filter(c => c.userId === recipient )
            .forEach(c => c.send(JSON.stringify({
                text,
                sender: connection.userId,
                recipient,
                id: messageDoc._id,
            }))) ;


        }
        // console.log({message,isBinary})
        // console.log(typeof message)
        // console.log(message.toString());
        // console.log(isBinary ? message.toString():message);
    })

    // Listen for disconnect event
    // connection.on('close', () => {
    //     // Remove user from activeUsers set
    //     activeUsers.delete(connection.username);

    //     console.log('Active Users:', [...activeUsers]);
    // });
    
    //notify everyone about online people (when someone connected)
    wss.clients.forEach(client=>{
        client.send(JSON.stringify({
            online:  [...wss.clients].map(c=>({userId:c.userId,username:c.username})),
        }));
    });
});
