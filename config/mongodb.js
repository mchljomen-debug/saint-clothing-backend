import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const mongoURL = process.env.MONGODB_URI;

    if (!mongoURL) throw new Error("MONGODB_URI not found in .env");

    await mongoose.connect(mongoURL); 

    console.log("MongoDB connected successfully!");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1); 
  }
};

export default connectDB;
