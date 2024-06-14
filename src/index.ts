import { getFromCache, setToCache } from "@/cacheFunctions";
import { mc } from "@/db";
import { Db, WithId, OptionalUnlessRequiredId } from "mongodb";
type AutoCreateFields = {
  [x: string]: () => any;
};

type SharedKeys<AutoTypes, MTypes> = {
  [P in keyof AutoTypes]: P extends keyof MTypes ? P : never;
}[keyof AutoTypes];

export const iGraphQL = async <
  IGraphQL extends Record<string, any>,
  CreateFields extends AutoCreateFields = {}
>(
  autoFields: CreateFields,
  afterConnection?: (database: Db) => void
) => {
  const { db } = await mc(afterConnection);
  return <T extends keyof IGraphQL>(
    k: T extends string ? T : never,
    cache?: {
      //custom ttl for caching this object in database for functions: list, oneByID - default is 3000ms
      ttl?: number;
      //setting this allows to use list responses project the individual object cache.
      listPrimaryKey?: string;
    }
  ) => {
    type O = IGraphQL[T];
    const collection = db.collection<O>(k);
    const create = (params: OptionalUnlessRequiredId<O>) => {
      return collection.insertOne(params);
    };
    const createWithAutoFields = <Z extends SharedKeys<CreateFields, O>>(
      ...keys: Array<Z>
    ) => {
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
      NewCollectionKey extends keyof IGraphQL[NewCollection]
    >(
      objects: O[],
      k: K,
      relatedCollection: NewCollection,
      nK: NewCollectionKey
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
      NewCollectionKey extends keyof IGraphQL[NewCollection]
    >(
      objects: O[],
      k: K,
      relatedCollection: NewCollection,
      nK: NewCollectionKey
    ) => {
      const relatedObjects = await related(objects, k, relatedCollection, nK);
      return objects.map((o) => {
        const value = o[k];
        if (Array.isArray(value)) {
          return {
            ...o,
            [k]: value.map((valueInArray: unknown) => {
              if (
                typeof valueInArray === "string" ||
                typeof valueInArray === "number"
              ) {
                return relatedObjects.find((ro) => {
                  const relatedObjectKey = ro[nK as keyof typeof ro];
                  if (
                    typeof relatedObjectKey === "string" ||
                    typeof relatedObjectKey === "number"
                  ) {
                    return relatedObjectKey === valueInArray;
                  }
                });
              }
            }),
          };
        }
        if (typeof value === "string" || typeof value === "number") {
          return {
            ...o,
            [k]: relatedObjects.find((ro) => {
              const relatedObjectKey = ro[nK as keyof typeof ro];
              if (
                typeof relatedObjectKey === "string" ||
                typeof relatedObjectKey === "number"
              ) {
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

    //method to get one object by Id using data loader cache
    const oneById = async (
      ...params: Parameters<typeof collection["findOne"]>
    ) => {
      // if we have the list primary key we need to check the cache only by using this key
      if (cache?.listPrimaryKey) {
        let fetchingFromCacheAllowed = true;
        const valueFromCache = getFromCache(
          JSON.stringify({
            [cache.listPrimaryKey]: params[0][cache.listPrimaryKey],
          })
        );
        if (valueFromCache) {
          Object.entries(params[0]).forEach(([entryKey, entryValue]) => {
            if (valueFromCache[entryKey] !== entryValue) {
              fetchingFromCacheAllowed = false;
            }
          });
          if (fetchingFromCacheAllowed) {
            return valueFromCache;
          }
        }
      } else {
        const paramKey = JSON.stringify(params[0]);
        const valueFromCache = getFromCache(paramKey);
        if (valueFromCache) return valueFromCache;
        const result = await collection.findOne(...params);
        collection.findOne({});
        setToCache(paramKey, result, cache?.ttl);
        return result;
      }
    };

    //method to get list of objects - working with inner cache. Calls toArray at the end so you don't have to.
    const list = async (...params: Parameters<typeof collection["find"]>) => {
      const paramKey = JSON.stringify(params[0]);
      const valueFromCache = getFromCache(paramKey);
      if (valueFromCache) return valueFromCache;
      const result = await collection.find(...params).toArray();
      setToCache(paramKey, result, cache?.ttl);
      if (cache?.listPrimaryKey) {
        for (const individual of result) {
          if (individual[cache.listPrimaryKey]) {
            setToCache(
              JSON.stringify({
                [cache.listPrimaryKey]: individual[cache.listPrimaryKey],
              }),
              individual,
              cache.ttl
            );
          }
        }
      }
      return result;
    };

    return {
      collection,
      create,
      createWithAutoFields,
      list,
      oneById,
      related,
      composeRelated,
    };
  };
};

type ToMongoString<T> = T extends object ? string : T;
type ToMongo<T> = T extends Array<infer R>
  ? ToMongoString<R>[]
  : ToMongoString<T>;
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
