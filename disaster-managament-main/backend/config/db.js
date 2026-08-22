const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jeevan-setu', {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn('⚠️ Database connection failed, using in-memory storage:', error.message);
    console.log('📝 Note: The application will work with in-memory data storage');
    return null;
  }
};

module.exports = connectDB;

