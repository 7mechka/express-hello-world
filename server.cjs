const { MongoClient } = require('mongodb');
const express = require('express');
const cors = require('cors');
const CryptoJS = require('crypto-js');
const { format } = require('date-fns');

const port = process.env.PORT || 3000;

const uriPass = process.env.URLPASSWORD;
const app = express();

const uri = `mongodb+srv://7mechka:${uriPass}@rozetka-copy-claster.uq62j.mongodb.net/?retryWrites=true&w=majority&appName=Rozetka-copy-claster&tls=true`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  tls: true,
  tlsAllowInvalidCertificates: true,
  tlsInsecure: true,
});
client.connect();
const db = client.db('switch-store-bd');

app.use(cors());
app.use(express.json());

// Отримати всі товари без сортирування
app.get('/data/items', async (req, res) => {
  try {
    const collection = db.collection('items');
    const data = await collection.find({}).toArray();
    res.json(data);
  } catch (error) {
    res.status(500).send('Server Error');
    console.error(error);
  }
});

// Отримати товар по СКУ
app.get('/data/item/sku', async (req, res) => {
  try {
    const sku = req.query.sku;

    const collection = db.collection('items');
    const data = await collection.findOne({ sku: sku });
    res.json(data);
  } catch (error) {
    res.status(500).send('Server Error');
    console.error(error);
  }
});

// Отримати схожі товари по тегах і категоріях
app.get('/data/items/similar', async (req, res) => {
  try {
    const tags = req.query.tag;
    const category = req.query.category;

    const collection = db.collection('items');
    const data = await collection
      .find({ $or: [{ tags: { $in: tags } }, { category: category }] })
      .toArray();
    res.json(data);
  } catch (error) {
    res.status(500).send('Server Error');
    console.error(error);
  }
});

// Отримати товари по тегу
app.get('/data/items/tag', async (req, res) => {
  try {
    const tag = req.query.tag;

    const collection = db.collection('items');
    const data = await collection.find({ tags: { $in: tag } }).toArray();
    res.json(data);
  } catch (error) {
    res.status(500).send('Server Error');
    console.error(error);
  }
});

// Отримати товари по пошуку
app.get('/data/items/search', async (req, res) => {
  try {
    const { text, tags, category } = req.query;

    const query = {};
    if (text) query.name = { $regex: text, $options: 'i' };
    if (tags) query.tags = tags;
    if (category) query.category = category;

    const collection = db.collection('items');
    const data = await collection.find(query).toArray();
    res.json(data);
  } catch (error) {
    res.status(500).send('Server Error');
    console.error(error);
  }
});

// Отримати користувача для авторизації
app.get('/data/users/get', async (req, res) => {
  try {
    const { login, password } = req.query;

    const hashPassword = CryptoJS.SHA256(password).toString();

    const collection = db.collection('users');

    const user = await collection.findOne({ userName: login });

    if (!user) {
      res.json('!user');
    } else if (user.passwordHash !== hashPassword) {
      res.json('!password');
    } else if (user && user.passwordHash === hashPassword) {
      res.json(user);
    }
  } catch (error) {
    res.status(500).send('Server Error');
    console.error(error);
  }
});

// Внести користувача для реєстрації
app.post('/data/users/add', async (req, res) => {
  try {
    const { login, email, password } = req.body;

    const collection = db.collection('users');

    const isUser = await collection.findOne({ userName: login });
    if (isUser) {
      res.json('user');
    } else if (!isUser) {
      const hashPassword = CryptoJS.SHA256(password).toString();

      const token = CryptoJS.SHA256(login + hashPassword).toString();

      const formattedDate = format(new Date(), 'dd-MM-yyyy HH:mm:ss');

      const documentCount = await collection.countDocuments();

      const user = {
        userId: documentCount + 1,
        userName: login,
        email: email,
        passwordHash: hashPassword,
        token: token,
        createdAt: formattedDate,
        updatedAt: formattedDate,
        isActive: true,
        profile: {
          firstName: "Ім'я",
          lastName: 'Прізвище',
          phone: '+380123456789',
          address: {
            street: 'вул. Прикладна, 1',
            city: 'Київ',
            zipCode: '01001',
          },
        },
        wishList: [],
        cart: [],
      };

      await collection.insertOne(user);

      res.json(true);
    }
  } catch (error) {
    res.status(500).send('Server Error');
    console.error(error);
  }
});

// Перевірити токен авторизації
app.get('/data/users/checkToken', async (req, res) => {
  try {
    const { token } = req.query;

    const collection = db.collection('users');

    const user = await collection.findOne({ token: token });

    res.json(user);
  } catch (error) {
    res.status(500).send('Server Error');
    console.error(error);
  }
});

// Оновити корзину у користувача
app.put('/data/users/updateCartList', async (req, res) => {
  try {
    const { item, token } = req.body;

    const collection = db.collection('users');

    await collection.updateOne({ token: token }, { $set: { cart: item } });

    const user = await collection.findOne({ token: token });

    res.json(user);
  } catch (error) {
    res.status(500).send('Server Error');
    console.error(error);
  }
});

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});

app.keepAliveTimeout = 120 * 1000;
app.headersTimeout = 120 * 1000;
