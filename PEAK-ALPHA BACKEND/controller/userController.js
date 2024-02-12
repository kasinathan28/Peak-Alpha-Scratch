const Users = require("../models/Users");
const Address = require("../models/Address"); 
const Product = require("../models/products")

const axios = require("axios");
const twilio = require("twilio");
const multer = require("multer");

// Twilio configuration
const accountSid = "ACe3e8a0c5012984c57f28389d766dc89d";
const authToken = "e18ea88a2125204d2dcb0e0dfedf16f3";
const twilioClient = twilio(accountSid, authToken);

const upload = require("../multerConfig/storageConfig");

exports.signup = async (req, res) => {
  const { username, password, phoneNumber, email, otp } = req.body;

  try {
    if (!otp || otp !== req.body.otp) {
      res.status(400).json({ error: 'Invalid OTP' });
      return;
    }

    delete req.body.otp;

    const existingUsername = await Users.findOne({ username });
    if (existingUsername) {
      res.status(400).json({ error: 'Username already exists' });
      return;
    }

    const existingPhoneNumber = await Users.findOne({ phoneNumber });
    if (existingPhoneNumber) {
      res.status(400).json({ error: 'Phone number already exists' });
      return;
    }

    const existingEmail = await Users.findOne({ email });
    if (existingEmail) {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }

    const newUser = new Users({
      username,
      password,
      phoneNumber,
      email,
    });

    await newUser.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'An error occurred during signup' });
  }
};


// Endpoint to send OTP to the provided phone number
exports.generateAndSendOtp = async (req, res) => {
  const { phoneNumber, otp } = req.body;

  try {
    if (!otp) {
      res.status(400).json({ error: "Invalid OTP" });
      return;
    }

    await twilioClient.messages.create({
      body: `Your OTP for signup: ${otp}`,
      to: `+91${phoneNumber}`, 
      from: "+18083536054",
    });

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error during OTP sending:", error);
    res.status(500).json({ error: "An error occurred during OTP sending" });
  }
};



// user login
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await Users.findOne({ username });

    if (!user || user.password !== password) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }
    res.status(200).json({ message: "Login successful",user });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "An error occurred during login" });
  }
};


/// fetching user data
exports.getUserData = async (req, res) => {
  const { username } = req.body; 

  try {
    console.log("Received username:", username);

    const user = await Users.findOne({ username });

    if (!user) {
      console.log("User not found for username:", username);
      res.status(404).json({ error: "User not found...!" });
      return;
    }

    const userData = {
      name: user.username,
      phoneNumber: user.phoneNumber,
      email: user.email,
      password: user.password,
      profilePicture: user.profilePicture,
    };

    console.log("User Data:", userData);
    res.status(200).json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "An error occurred while fetching user data" });
  }
};



// update profile
exports.updateprofile = async (req, res) => {
  const { username, name, phoneNumber, password, email } = req.body;
  const { filename, path } = req.file;

  try {
    const updateFields = {
      name,
      phoneNumber,
      password,
      email,
    };

    if (path) {
      updateFields.profilePicture = { path };
    }

    const updatedUser = await Users.findOneAndUpdate(
      { username },
      updateFields,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error during profile update:", error);
    res.status(500).json({ error: "An error occurred during profile update" });
  }
};





// Get user's address by username
exports.getUserAddress = async (req, res) => {
  const { username } = req.params;

  try {
    const user = await Users.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userAddress = await Address.findById(user.addressId);

    if (!userAddress) {
      return res.status(404).json({ error: "User address not found" });
    }

    res.status(200).json({ address: userAddress });
  } catch (error) {
    console.error("Error fetching user's address:", error);
    res.status(500).json({ error: "An error occurred fetching user's address" });
  }
};


// Router for updating the address
exports.updateAddress = async (req, res) => {
  const { username } = req.params;
  const { pincode, city, houseName, landmark } = req.body;

  try {
    const user = await Users.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userAddress = await Address.findOneAndUpdate(
      { pincode, city, houseName, landmark },
      { pincode, city, houseName, landmark },
      { new: true, upsert: true }
    );

    user.addressId = userAddress._id;
    await user.save();

    res.status(200).json({ message: "Address updated successfully", address: userAddress });
  } catch (error) {
    console.error("Error during address update:", error);
    res.status(500).json({ error: "An error occurred during address update" });
  }
};

// get all products
exports.getAllProducts1 = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'An error occurred while fetching products' });
  }
};


// Get the product details from the stripe.
exports.getAllProducts3 = async (req, res) => {
  try {
    const response = await axios.get('https://api.stripe.com/v1/products', {
      headers: {
        Authorization: `Bearer sk_test_51Od4KTSF48OWvv58UGojVhgsx9EAR0yoi4za3ocnGYtqNjXaA1PFuIYwFzkz9nyY1Y0CwWSJ3sh1hSDgWcsJFJ2Q003A3cQeTs`,
      },
    });
    
    const products = response.data.data;
    res.status(200).json({ products });
  } catch (error) {
    console.error('Error fetching products from Stripe API:', error);
    res.status(500).json({ error: 'An error occurred while fetching products from Stripe API' });
  }
};


// API for making the purchase.
exports.makePurchase = async (req, res) => {
  const { productId } = req.params;
  const { priceId, shippingDetails } = req.body;

  console.log("price ID", priceId);

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log(stripe);
  try {
    // Fetch product details from the database using productId
    const product = await Product.efindById(productId);
    console.log("Product found:", product);

    // Create a Checkout session on Stripe
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId, // Use the Stripe ID obtained from the product
          quantity: 1, // Assuming quantity is 1, modify as needed
        },
      ],
      // payment_method_types: ['card'],
      mode: 'payment',
      currency: 'inr',
      success_url: 'http://localhost:3000/success', 
      cancel_url: 'http://localhost:3000/cancel',
    });

    // Store session ID if needed
    const storedSessionId = session.id;
    console.log("Stored Session ID:", storedSessionId);
    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Error making purchase:", error);
    res.status(500).json({ error: "Failed to make purchase" });
  }
};