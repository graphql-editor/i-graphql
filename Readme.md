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
    _id: () => new ObjectId().toHexString(),
    createdAt: () => new Date().toISOString(),
    updatedAt: () => new Date().toISOString(),
  });
};

export const MongOrb = await orm();
```

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
