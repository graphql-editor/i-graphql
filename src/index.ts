import { clearPromises } from '@/cacheFunctions';
import { mc } from '@/db';
import { Db, WithId, OptionalUnlessRequiredId, MongoClient } from 'mongodb';
type AutoCreateFields = {
  [x: string]: () => any;
};

type SharedKeys<AutoTypes, MTypes> = {
  [P in keyof AutoTypes]: P extends keyof MTypes ? P : never;
}[keyof AutoTypes];

export const iGraphQL = async <
  IGraphQL extends Record<string, Record<string, any>>,
  CreateFields extends AutoCreateFields = {},
>(props: {
  autoFields: CreateFields;
  afterConnection?: (database: Db) => void;
  // override the process.env.MONGO_URL variable
  mongoClient?: MongoClient;
  mongoUrl?: string;
}) => {
  const { autoFields, afterConnection, mongoClient, mongoUrl } = props;
  const { db } = await mc({ afterConnection, mongoClient, mongoUrl });
  clearPromises();
  return <T extends keyof IGraphQL>(k: T) => {
    type O = IGraphQL[T];
    const collection = db.collection<O>(k as string);
    const create = async (params: OptionalUnlessRequiredId<O>) => {
      const result = await collection.insertOne(params);
      return result;
    };
    const createWithAutoFields = <Z extends SharedKeys<CreateFields, O>>(...keys: Array<Z>) => {
      const createdFields = keys.reduce<{
        [P in keyof CreateFields]?: ReturnType<CreateFields[P]>;
      }>((a, b) => {
        a[b] = autoFields[b]();
        return a;
      }, {});
      return (params: Omit<OptionalUnlessRequiredId<O>, Z>) => {
        return create({
          ...params,
          ...createdFields,
        } as OptionalUnlessRequiredId<O>);
      };
    };

    const related = async <
      K extends keyof O,
      NewCollection extends keyof IGraphQL,
      NewCollectionKey extends keyof IGraphQL[NewCollection],
    >(
      objects: O[],
      k: K,
      relatedCollection: NewCollection,
      nK: NewCollectionKey,
    ) => {
      type RelatedO = IGraphQL[NewCollection];
      return db
        .collection<RelatedO>(relatedCollection as string)
        .find({
          [nK]: {
            $in: findPks(objects, k),
          },
        } as WithId<RelatedO>)
        .toArray();
    };
    const composeRelated = async <
      K extends keyof O,
      NewCollection extends keyof IGraphQL,
      NewCollectionKey extends keyof IGraphQL[NewCollection],
    >(
      objects: O[],
      k: K,
      relatedCollection: NewCollection,
      nK: NewCollectionKey,
    ) => {
      const relatedObjects = await related(objects, k, relatedCollection, nK);
      return objects.map((o) => {
        const value = o[k];
        if (Array.isArray(value)) {
          return {
            ...o,
            [k]: value.map((valueInArray: unknown) => {
              if (typeof valueInArray === 'string' || typeof valueInArray === 'number') {
                return relatedObjects.find((ro) => {
                  const relatedObjectKey = ro[nK as keyof typeof ro];
                  if (typeof relatedObjectKey === 'string' || typeof relatedObjectKey === 'number') {
                    return relatedObjectKey === valueInArray;
                  }
                });
              }
            }),
          };
        }
        if (typeof value === 'string' || typeof value === 'number') {
          return {
            ...o,
            [k]: relatedObjects.find((ro) => {
              const relatedObjectKey = ro[nK as keyof typeof ro];
              if (typeof relatedObjectKey === 'string' || typeof relatedObjectKey === 'number') {
                return relatedObjectKey === value;
              }
            }),
          };
        }
        return {
          ...o,
        };
      });
    };

    return {
      collection,
      create,
      createWithAutoFields,
      related,
      composeRelated,
    };
  };
};

type ToMongoString<T> = T extends object ? string : T;
type ToMongo<T> = T extends Array<infer R> ? ToMongoString<R>[] : ToMongoString<T>;
type Nullify<T> = T extends undefined ? undefined | null : T;
type NullifyObject<T> = {
  [P in keyof T]: Nullify<T[P]>;
};

export type MongoModel<T, Replace = {}> = NullifyObject<{
  [P in keyof Omit<T, keyof Replace>]: ToMongo<T[P]>;
}> &
  Replace;

// Extract pks relation binding from array of objects
export const findPks = <O, K extends keyof O>(objects: O[], k: K) => {
  type ReturnPks = O[K] extends Array<infer R> | undefined ? R : O[K];
  const neededPks = objects
    .map((o) => {
      const v = o[k];
      if (Array.isArray(v)) {
        return v;
      }
      return [v];
    })
    .reduce((a, b) => [...a, ...b], []);
  return neededPks as ReturnPks[];
};
