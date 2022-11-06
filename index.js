const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3njemyu.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const varifyToken = (req, res, next) => {
    const auth_header = req.headers.authorization;
    if (!auth_header) {
        return res.status(401).send('Access Denied');
    }
    const token = auth_header.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOCKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send('Invalid Token');
        }
        req.decoded = decoded;
        next();
    });
};

async function run() {
    try {
        const service_Collection = client.db('genius_car').collection('services');
        const order_Collection = client.db('genius_car').collection('orders');

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOCKEN_SECRET, { expiresIn: '5s' });
            res.send({ token });
        });

        app.get('/services', async (req, res) => {
            const query = {};
            const cursor = service_Collection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });

        app.get('/services/:id', async (req, res) => {
            const query = { _id: ObjectId(req.params.id) };
            const service = await service_Collection.findOne(query);
            res.send(service);
        });

        app.get('/orders', varifyToken, async (req, res) => {
            const decoded = req.decoded;

            if (decoded.current_user.email !== req.query.email) {
                return res.status(401).send('Access Denied');
            }
            let query = {};
            if (req.query.email) {
                query = { email: req.query.email };
            }
            const cursor = order_Collection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        });

        app.delete('/orders/:id', async (req, res) => {
            const query = { _id: ObjectId(req.params.id) };
            const result = await order_Collection.deleteOne(query);
            res.send(result);
        });

        app.patch('/orders/:id', async (req, res) => {
            const query = { _id: ObjectId(req.params.id) };
            const updateDoc = { $set: { status: req.body.status } };

            const result = await order_Collection.updateOne(query, updateDoc);
            res.send(result);
        });

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await order_Collection.insertOne(order);
            res.json(result);
        });

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!')
});


app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
