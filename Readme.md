# iGraphQL

ORM for dbs and GraphQL. The mission is to make [graphql zeus](https://github.com/graphql-editor/graphql-zeus) typings database friendly. This is an **alpha version** and supports mongodb only.

## Installation

```sh
npm i -D graphql-zeus
```

```sh
npm i i-graphql mongodb
```

## Generation

```
$ npx zeus https://example.com/graphql ./src
```

Now when you generated your types you can use them inside project

## Example

`src/orm.ts`

```ts
import { ModelTypes } from "./zeus";
import { iGraphQL } from "i-graphql";

export const orm = async () => {
  return iGraphQL<
    Pick<ModelTypes, "Operation" | "Invoice" | "Source">,
    {
      _id: () => string;
      createdAt: () => string;
      updatedAt: () => string;
    }
  >({
    Operation: '_id',
    Invoice: '_id',
    Source: '_id'
  },{
    autoFields:{
      _id: () => new ObjectId().toHexString(),
      createdAt: () => new Date().toISOString(),
      updatedAt: () => new Date().toISOString(),
    }
  });
};

export const MongOrb = await orm();
```

First we declared that we will use 3 types that are keys from ModelTypes type. Then We specified the type of autoFields generation functions that all of our models will use. 
Then our first function argument is a dictionary holding primary keys of our models, second parameter is options that hold `autoFields` generators that are used by the function `createWithAutoFields`

### How to use your orm

```ts
const resolver = () =>
  MongOrb("Source").createWithAutoFields(
    "_id",
    "createdAt"
  )({
    name: "My Source",
  });
```

## Experimental data loader

You can use experimental data loader for requests that can cause n+1 problem. It is still in experimental phase.


## List objects
```ts
const result = await MongoOrb("Source").list({})
```

This will return list of objects but also make resolved promise for each of _id contained inside list. So later during the same GraphQL query if you request some object:

```ts
const result = await MongoOrb("Source").oneByPk("892194hruh8hasd")
```

It will load the object from promise instead of calling the database