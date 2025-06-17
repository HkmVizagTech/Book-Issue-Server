const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  bookId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Book' },
  quantityBooked: { type: Number, required: true },
  quantityReturned: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
  bookedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
