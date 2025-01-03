import mongoose from 'mongoose';

const connect = async () => {
  try {
    await mongoose.connect(process.env.DB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Internet connection lost!');
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

export default connect;
