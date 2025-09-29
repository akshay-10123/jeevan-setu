const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jeevan-setu', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn('⚠️ Database connection failed, using in-memory storage:', error.message);
    console.log('📝 Note: The application will work with in-memory data storage');
    // Don't exit the process, let the app continue with in-memory storage
  }
};

module.exports = connectDB;

