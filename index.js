const express=require('express')
const app=express()
const cors=require('cors')
require('dotenv').config()
const db =require('./confid/db')
const nodemailer = require('nodemailer');
db();
app.listen('3300',async(req,res)=>{
    console.log("server is running");
})
app.get('/',async(req,res)=>{
    res.send("helllo");
})
// const express = require('express');
// const router = express.Router();
const Booking = require('./model/booking');
const Book = require('./model/book');
const User = require('./model/user');
// const cors=require('cors')
app.use(express.json())
app.use(cors(
    {
        origin:["https://book-issue.vercel.app","http://localhost:3000","https://book-issue-nine.vercel.app"],
        methods:["POST","GET","PUT","DELETE","PATCH"]
    }
))
app.post('/users',async(req,res)=>{
    try{
        const {name,phone,email}=req.body;
        if(!name || !phone || !email){
            return res.status(400).json({error:"name ,email and phone are required"})
        }
        const newuser = await new User({
            name,
            phone,
            email
        })
      await newuser.save();
      return res.status(200).json({message:"success",data:newuser})
    }
    catch(err){
        console.log(err);
        return res.status(500).json({error:"Failed to save to user"})
    }
})
app.post('/book', async (req, res) => {
  try {
    const { userId, books } = req.body;
    const user= await User.findById(userId);
    const to = "abrd@hkmvizag.org";
    if (!userId || !Array.isArray(books) || books.length === 0) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const bookingsToInsert = [];

    for (const book of books) {
      const bookDoc = await Book.findById(book.bookId);
      if (!bookDoc) {
        return res.status(404).json({ message: `Book not found: ${book.bookId}` });
      }

      const quantity = book.quantity;
      const rate = bookDoc.rate;
      const totalPrice = quantity * rate;

      bookingsToInsert.push({
        userId,
        bookId: book.bookId,
        quantityBooked: quantity,
        rate,
        totalPrice
      });
    }

    const savedBookings = await Booking.insertMany(bookingsToInsert);
    const link= `https://book-issue.vercel.app/verify/${savedBookings[0]._id}`;
     console.log(process.env.BREVOUSER, process.env.PASSWORD, process.env.EMAIL);
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVOUSER,
      pass: process.env.PASSWORD,
    },
  });
const subject = 'Book Issue Confirmation';
  const mailOptions = {
    from: `"Book Distribution" <${process.env.EMAIL}>`,
    to,
    subject,
    html: `
      <h3>Hello!</h3>
      <p>Please click the link below:</p>
      <a href="${link}">${link}</a>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully!' });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }

    res.status(201).json({
      message: 'Books issued successfully',
      bookings: savedBookings
    });

  } catch (err) {
    console.error('Error booking books:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/verify/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not Found" });
    }

    // Get all pending bookings for this user
    const allBookings = await Booking.updateMany(
      { userId: booking.userId, status: { $ne: 'approved' } },
      { $set: { status: 'approved' } }
    );

    return res.status(200).json({
      message: `Booking(s) verified for user`,
      updatedCount: allBookings.modifiedCount
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error verifying the bookings" });
  }
});

app.get('/books' ,async(req,res)=>{
    try{
        const books= await Book.find({});
        if(!books){
            return res.status(400).json({error:"No Books Found"})
        }
        return res.status(200).json(books)
    }
    catch(err){
        console.log(err);
        return res.status(500).json({error:'fail to load books'})
    }
})
app.post('/books', async (req, res) => {
  try {
    const { name, rate } = req.body;

    // Validation
    if (!name || typeof rate !== 'number') {
      return res.status(400).json({ message: 'Name and rate are required.' });
    }

    const book = new Book({ name, rate });
    await book.save();

    res.status(201).json({
      message: 'Book added successfully',
      book
    });
  } catch (error) {
    console.error('Error adding book:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.post('/books12', async (req, res) => {
  try {
    const books = req.body; // expecting an array of books
    if (!Array.isArray(books)) {
      return res.status(400).json({ error: 'Request body must be an array of books.' });
    }

    const insertedBooks = await Book.insertMany(books);
    res.status(201).json(insertedBooks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to insert books.' });
  }
});
app.get('/users',async(req,res)=>{
    const users=await User.find({});
    return res.json(users);
})
app.get('/admin/booking/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not Found" });
    }

    const bookings = await Booking.find({ userId: booking.userId })
      .populate('bookId', 'name rate');

    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/booking', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId query parameter' });
    }

    const bookings = await Booking.find({ userId })
      .populate('bookId', 'name rate'); // <-- only fetch book name and rate fields

    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/bookings',async (req,res)=>{
    // const {userId}=req.query;
    const bookings=await Booking.find({});
    console.log(bookings);
    return res.json(bookings)
})
app.get('/q',async(req,res)=>{
  // const usersa=await User.deleteMany();
  const bookings=await Booking.deleteMany();
  return res.json(bookings);
})
app.patch('/booking/:id', async (req, res) => {
  try {
    const { quantityReturned } = req.body;

    const booking = await Booking.findById(req.params.id).populate('bookId', 'rate');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const rate = booking.rate || booking.bookId.rate;
    const quantitySold = booking.quantityBooked - quantityReturned;
    const totalPrice = rate * quantitySold;
    booking.quantityBooked=quantitySold;
    booking.quantityReturned = quantityReturned;
    booking.totalPrice = totalPrice;

    await booking.save();
    console.log(booking)
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// module.exports = router;

app.post('/send-email', async (req, res) => {
  const { to, subject, link } = req.body;

  if (!to || !subject || !link) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

});