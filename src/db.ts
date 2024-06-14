import { Db, MongoClient } from "mongodb";
let mongoConnection: { db: Db; client: MongoClient } | undefined = undefined;

export const mc = async (afterConnection?: (database: Db) => void) => {
  if (mongoConnection) {
    return Promise.resolve(mongoConnection);
  }
  const mongoURL = process.env.MONGO_URL;
  if (!mongoURL) {
    throw new Error("Please provide MONGO_URL environment variable");
  }
  const client = new MongoClient(mongoURL, {
    ignoreUndefined: true,
  });
  const c = await client.connect();
  const db = c.db();
  const dbName = db.databaseName;
  if (!dbName || dbName === "test") {
    throw new Error(
      "Provide database name inside MONGO_URL to work with iGraphQL. 'test' is also not accepted"
    );
  }
  mongoConnection = {
    client,
    db,
  };
  await afterConnection?.(db);
  return mongoConnection;
};
