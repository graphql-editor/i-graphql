import { Db, MongoClient } from 'mongodb';
let mongoConnection: { db: Db; client: MongoClient } | undefined = undefined;

export const mc = async (props: {
  afterConnection?: (database: Db) => void;
  mongoClient?: MongoClient;
  mongoUrl?: string;
}) => {
  const { afterConnection, mongoClient, mongoUrl } = props;
  if (mongoConnection) {
    return Promise.resolve(mongoConnection);
  }
  const resolvedMongoUrl = mongoUrl || process.env.MONGO_URL;
  let client: MongoClient | undefined = mongoClient;
  if (resolvedMongoUrl && !client) {
    client = new MongoClient(resolvedMongoUrl, {
      ignoreUndefined: true,
    });
  }
  if (!client) {
    throw new Error('Please provide MONGO_URL environment variable or pass mongoUrl as a prop');
  }
  const c = await client.connect();
  const db = c.db();
  const dbName = db.databaseName;
  if (!dbName || dbName === 'test') {
    throw new Error("Provide database name inside mongo url to work with iGraphQL. 'test' is also not accepted");
  }
  mongoConnection = {
    client,
    db,
  };
  await afterConnection?.(db);
  return mongoConnection;
};
