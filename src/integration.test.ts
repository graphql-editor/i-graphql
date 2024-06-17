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
  >(
    {
      Todo: '_id',
    },
    {
      autoFields: {
        _id: () => new ObjectId().toHexString(),
      },
      mongoClient: client,
    },
  );
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
    const resultFetch = await MongoOrb('Todo').oneByPk(result.insertedId);
    expect(resultFetch?._id).toEqual(result.insertedId);
    expect(resultFetch?.title).toEqual(title);
  });
  it('should have the same id in list and oneByPk method while calling the db only once', async () => {
    const MongoOrb = await iGraphQLClient();
    const resultInsert = await MongoOrb('Todo').createWithAutoFields('_id')({
      title: 'aaa',
    });
    await MongoOrb('Todo').list({});
    const resultPk = await MongoOrb('Todo').oneByPk(resultInsert.insertedId);
    expect(resultPk?._id).toEqual(resultInsert.insertedId);
  });
});
