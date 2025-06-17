const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rate: { type: Number, required: true }
});

module.exports = mongoose.model('Book', bookSchema);
