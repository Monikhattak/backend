const port = 4000;
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require("path");
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(cors()); // Fix: call cors as a function

// Database connection with options
mongoose.connect("mongodb+srv://mujtabaktk159:mujtaba1234@cluster0.c9rfrfd.mongodb.net/shopping", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// API connection
app.get('/', (req, res) => {
    res.send("Hello World!");
});

// Image storage configuration
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => { // Fix: use 'file' instead of 'req'
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });

// Creating upload endpoint
app.use('/images', express.static('upload/images'));
app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}` // Fix: use 'filename' instead of 'fieldname'
    });
});

// Schema for product 
const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true
    },
    category: {
        type: String,  // Assuming category is a string
        required: true
    },
    new_price: {
        type: Number,
        required: true
    },
    old_price: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
    },
    available: {
        type: Boolean,
        default: true
    },
});

app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id;

    if (products.length > 0) {
        let lastProduct = products[products.length - 1];
        id = lastProduct.id + 1;
    } else {
        id = 1;
    }

    try {
        const product = new Product({
            id: id, // Use the manually calculated ID
            name: req.body.name,
            image: req.body.image,
            category: req.body.category,
            new_price: req.body.new_price,
            old_price: req.body.old_price,
        });

        await product.save();

        console.log("Product saved:", product);
        res.json({
            success: true,
            name: req.body.name,
        });
    } catch (error) {
        console.error("Error saving product:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

app.post('/removeproduct', async (req, res) => {
    try {
        await Product.findOneAndDelete({ id: req.body.id });
        console.log("Removed");
        res.json({
            success: true,
            name: req.body.name
        });
    } catch (error) {
        console.error("Error removing product:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// Fetching all products 
app.get('/allproducts', async (req, res) => {
    try {
        let products = await Product.find({});
        console.log("All products fetched");
        res.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// Schema for user 
const User = mongoose.model('User', {
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true
    },
    password: {
        type: String,
    },
    cartData: {
        type: Object,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

// User signup 
app.post('/signup', async (req, res) => {
    try {
        let check = await User.findOne({ email: req.body.email });

        if (check) {
            return res.status(400).json({ success: false, error: "Email already exists!" });
        }

        let cart = {};
        for (let i = 0; i < 300; i++) {
            cart[i] = 0;
        }

        const user = new User({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            cartData: cart
        });

        await user.save();

        const data = {
            user: {
                id: user.id
            }
        };

        const token = jwt.sign(data, 'SECRET_ecom');
        res.json({ success: true, token });
    } catch (error) {
        console.error("Error in signup:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// User login 
app.post("/login", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.json({ success: false, error: "User not found" });
        }

        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data = {
                user: {
                    id: user.id,
                }
            };
            const token = jwt.sign(data, 'SECRET_ecom');
            res.json({ success: true, token });
        } else {
            res.json({ success: false, error: "Invalid Password" });
        }
    } catch (error) {
        console.error("Error in login:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// Fetching new collections 
app.get('/newcollections', async (req, res) => {
    try {
        let products = await Product.find({});
        let newCollection = products.slice(1).slice(-8);
        console.log("New collection fetched");
        res.json(newCollection);
    } catch (error) {
        console.error("Error fetching new collections:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

//// Creating the endpoint for fetching the products////
app.get('/popularinwomen', async (req, res) => {
    try {
        let products = await Product.find({ category: "women" });
        let popularInWomen = products.slice(0, 4);
        console.log("Popular in women fetched");
        res.json(popularInWomen);
    } catch (error) {
        console.error("Error fetching popular products:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

///// Creating the middleware ///
const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        return res.status(401).send('Please authenticate');
    }
    try {
        const data = jwt.verify(token, 'SECRET_ecom');
        req.user = data.user;
        next();
    } catch (error) {
        console.error("Error verifying token:", error);
        res.status(401).send('Invalid token. Please authenticate');
    }
};

///// Creating the endpoint for adding to cart ///
app.post('/addtocart', fetchUser, async (req, res) => {
    console.log("Add to Cart", req.body.itemId);
    try {
        const itemId = req.body.itemId;
        if (!itemId) {
            return res.status(400).json({ success: false, error: "Item ID is required" });
        }

        let user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        if (!user.cartData) {
            user.cartData = {};
        }

        if (user.cartData[itemId]) {
            user.cartData[itemId] += 1;
        } else {
            user.cartData[itemId] = 1;
        }

        await user.save();

        res.json({ success: true, message: "Added to cart", cartData: user.cartData });
    } catch (error) {
        console.error("Error updating cart:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

//// Creating the endpoint for removing from cart ///
app.post('/removefromcart', fetchUser, async (req, res) => {
    console.log("Remove from Cart", req.body.itemId);
    try {
        const itemId = req.body.itemId;
        if (!itemId) {
            return res.status(400).json({ success: false, error: "Item ID is required" });
        }

        let user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        if (user.cartData && user.cartData[itemId]) {
            user.cartData[itemId] -= 1;
            if (user.cartData[itemId] <= 0) {
                delete user.cartData[itemId];
            }
        } else {
            return res.status(400).json({ success: false, error: "Item not in cart" });
        }

        await user.save();

        res.json({ success: true, message: "Removed from cart", cartData: user.cartData });
    } catch (error) {
        console.error("Error updating cart:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

////creating the endpoint of the cart Data////// Assuming fetchUser middleware is properly defined and included before this route


app.listen(port, (error) => {
    if (!error) {
        console.log('Server is running on ' + port);
    } else {
        console.log('Error in server: ' + error);
    }
});
