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
  const resolvedMongoUrl = mongoUrl || tryToCreateMongoUrl();
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

export const tryToCreateMongoUrl = () => {
  if (process.env.MONGO_URL) return process.env.MONGO_URL;
  if (
    !process.env.MONGO_PASSWORD ||
    !process.env.MONGO_USERNAME ||
    !process.env.MONGO_DATABASE ||
    !process.env.MONGO_HOSTNAME
  )
    return '';
  return `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOSTNAME}/${process.env.MONGO_DATABASE}?retryWrites=true&w=majority`;
};
