import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

let dbConnection;

export const connectToDb = (cb) => {
  MongoClient.connect(process.env.MONGO_URI)
    .then((client) => {
      dbConnection = client.db("tasks"); // Specify the database name here
      return cb();
    })
    .catch((err) => {
      console.error("Failed to connect to the database", err); // Improved error logging
      return cb(err);
    });
};

export const getDb = () => dbConnection;
