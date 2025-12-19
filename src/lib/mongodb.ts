import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

function maskUri(uri: string) {
  try {
    const url = new URL(uri);
    return `${url.protocol}//${url.username}:***@${url.host}${url.pathname}`;
  } catch {
    return 'Invalid URI';
  }
}

async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  console.log('DB Connect: URI format -', maskUri(MONGODB_URI));

  if (cached.conn) {
    console.log('DB Connect: Using cached connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    console.log('DB Connect: Establishing new connection...');
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('DB Connect: Connection established successfully');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log('DB Connect: Connection promise resolved');
  } catch (e) {
    console.error('DB Connect: Connection failed with error:', e);
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;