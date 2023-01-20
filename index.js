const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const app = express();
require('dotenv').config();
const stripe = require("stripe")(process.env.CARD_STRIPE_SECRET);
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
const cors = require('cors');
app.use(express.json());
app.use(cors());


const uri = `mongodb+srv://${process.env.DB_CAR_USER}:${process.env.DB_CAR_PASS}@lawyerservices.xcbpfac.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
  console.log('token inside VerifyJWT', req.headers.authorization);
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send('unauthorized access');
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'forbidden access' })
    }
    req.decoded = decoded;
    next();
  })
}


async function run() {
  try {
    const categoryCollection = client.db('Carusedmarket').collection('categories')
    const productsCollection = client.db('Carusedmarket').collection('products')
    const productsBuyCollection = client.db('Carusedmarket').collection('buyproducts')
    const allSellerCollection = client.db('Carusedmarket').collection('allSeller')
    // const addAdminCollection = client.db('Carusedmarket').collection('addAdmin')

    // This is verifyAdmin

    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await allSellerCollection.findOne(query);

      if (user?.rol1 !== 'admin') {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next();
    }

    const verifySeller = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await allSellerCollection.findOne(query);

      if (user?.rol !== 'verify') {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next();
    }


    // This is get area start

    // This is categories
    app.get('/categories', async (req, res) => {
      const query = {}
      const category = await categoryCollection.find(query).toArray()
      res.send(category)
    })

    // This is products name search
    app.get('/products', async (req, res) => {
      const companyName = req.query.companyName
      const query = { companyName: companyName }
      const result = await productsCollection.find(query).toArray()
      res.send(result)
    })

    app.get('/myorder', async (req, res) => {
      const email = req.query.email;      
      const query = { email: email };
      const result = await productsBuyCollection.find(query).toArray();
      res.send(result);
    })   

    app.get('/myorder/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) }
      const result = await productsBuyCollection.findOne(query)
      res.send(result)
    })


    app.get('/allbuyer', async (req, res) => {
      const query = {}
      const result = await productsBuyCollection.find(query).toArray()
      res.send(result)
    })

    app.get('/addproduct', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/allseller', async (req, res) => {
      const query = {}
      const result = await allSellerCollection.find(query).toArray();
      res.send(result)
    })

    app.get('/allseller/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await allSellerCollection.find(filter).toArray();
      res.send(result)
    })

    app.get('/jwt', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await allSellerCollection.findOne(query)
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: '' })
    })

    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email }
      const result = await allSellerCollection.findOne(query);
      res.send({ isAdmin: result?.rol1 === 'admin' })
    })

    app.get('/seller/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email }
      const result = await allSellerCollection.findOne(query);
      res.send({ isSeller: result?.rol === 'verify' })
    })

    app.get('/addproduct/:email', verifyJWT, verifySeller, async (req, res) => {
      const email = req.params.email;
      const query = { email }
      const result = await allSellerCollection.findOne(query);
      res.send({ isSeller: result?.rol === 'verify' })
    })


    // This is get area end



    // This is post area start

    // This is product buy section
    app.post('/productbuy', async (req, res) => {
      const productbuy = req.body;
      const query = {
        ProductResalePrice: productbuy.ProductResalePrice,
        email: productbuy.email
      }
      const alreadyProductBooking = await productsBuyCollection.find(query).toArray();
      if (alreadyProductBooking.length) {
        const message = `You already have a product booking ${productbuy.ProductResalePrice}`
        return res.send({ acknowledged: false, message })
      }
      const productResult = await productsBuyCollection.insertOne(productbuy)
      res.send(productResult);
    })

    app.post('/addproduct', async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result)
    })

    app.post('/allseller', async (req, res) => {
      const user = req.body;
      const result = await allSellerCollection.insertOne(user);
      res.send(result)
    })
   

    // This is post area end

    // This is puts area start

    app.put('/allseller/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          rol: "verify",
        }
      }
      const result = await allSellerCollection.updateOne(filter, updatedDoc, option);
      res.send(result)
    })

    app.put('/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          rol1: "admin"
        }
      }
      const result = await allSellerCollection.updateOne(filter, updatedDoc, option);
      res.send(result)
    })

    // This is patch area end

    // This is delete area start

    app.delete('/productbuy/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const productDelete = await productsBuyCollection.deleteOne(filter)
      res.send(productDelete)
    })
    app.delete('/addproduct/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const productDelete = await productsCollection.deleteOne(filter)
      res.send(productDelete)
    })
    
    app.delete('/allseller/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const productDelete = await allSellerCollection.deleteOne(filter)
      res.send(productDelete)
    })

    // This is delete area end

  } finally {

  }
}

run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})