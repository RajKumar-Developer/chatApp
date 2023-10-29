const express = require('express');
const mongoose =  require('mongoose');
const cookieParser =require('cookie-parser')
const bcrypt = require('bcryptjs')
const dotenv = require('dotenv');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const ws = require('ws')

dotenv.config(); 

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
}));

// Update your MongoDB connection code like this:
mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  });

const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

app.get('/test', (req, res) => {
    res.json('test ok');
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
                    activeUsers.add(username);

                    console.log('Active Users:', [...activeUsers]);
                });
            }
        }
    }

    // Listen for disconnect event
    connection.on('close', () => {
        // Remove user from activeUsers set
        activeUsers.delete(connection.username);

        console.log('Active Users:', [...activeUsers]);
    });
});
