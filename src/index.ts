import { Db, OptionalId } from "mongodb";
type AutoCreateFields = {
  [x: string]: () => any;
};

type SharedKeys<AutoTypes, MTypes> = {
  [P in keyof AutoTypes]: P extends keyof MTypes ? P : never;
}[keyof AutoTypes];

export const iGraphQL =
  <IGraphQL, CreateFields extends AutoCreateFields = {}>(
    db: Db,
    autoFields: CreateFields
  ) =>
  <T extends keyof IGraphQL>(k: T extends string ? T : never) => {
    type O = IGraphQL[T];
    const collection = db.collection<O>(k);
    const create = (params: OptionalId<O>) => {
      return db.collection<O>(k).insertOne(params);
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
      return (params: Omit<OptionalId<O>, Z>) => {
        return create({ ...params, ...createdFields } as OptionalId<O>);
      };
    };

    return {
      collection,
      create,
      createWithAutoFields,
    };
  };

type ToMongo<T> = T extends object[] ? string[] : T extends object ? string : T;
type Nullify<T> = T extends undefined ? undefined | null : T;
type NullifyObject<T> = {
  [P in keyof T]: Nullify<T[P]>;
};

export type MongoModel<T, Replace = {}> = NullifyObject<{
  [P in keyof Omit<T, keyof Replace>]: ToMongo<T[P]>;
}> &
  Replace;
