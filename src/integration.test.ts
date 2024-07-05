import { iGraphQL } from '@/index';
import { MongoClient, ObjectId } from 'mongodb';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { setup, teardown } from 'vitest-mongodb';

const iGraphQLClient = async () => {
  const client = new MongoClient((globalThis as any).__MONGO_URI__ + 'dino');
  const MongoOrb = await iGraphQL<
    {
      Todo: {
        _id: string;
        title: string;
        done?: boolean;
      };
    },
    {
      _id: () => string;
    }
  >({
    autoFields: {
      _id: () => new ObjectId().toHexString(),
    },
    mongoClient: client,
  });
  return MongoOrb;
};

beforeAll(async () => {
  await setup();
});

afterAll(async () => {
  await teardown();
});
describe('Testing i-graphql with mongodb in memory module', () => {
  it('Should create an object', async () => {
    const MongoOrb = await iGraphQLClient();
    const title = 'Reset worker';
    const result = await MongoOrb('Todo').createWithAutoFields('_id')({
      title,
    });
    expect(result.insertedId).toBeTruthy();
  });
});
