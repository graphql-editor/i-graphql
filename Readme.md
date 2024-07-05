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
Consider the following schema
```graphql
type Person{
  id: String!
  username:String!
  friends: [Person!]!
}

type Query{
  person(_id:String!): Person!
}
```

And the following query:

```gql
query GetPersonWithFriends{
  person(id:"38u198rh89h"){
    username
    id
    friends{
      username
      id
      friends{
        username
        id
      }
    }
  }
}
```

Here is how you can implement to limit db calls and avoid n+1 problem

```ts
const peopleLoader = dataLoader<{[id:string]: PersonModel}>({})

export const QueryPeople = async (_,args) => {
  const person = await MongoOrb("Person").collection.findOne({_id:args._id})
  const friends = await MongoOrb("Person").collection.find({
    _id:{
      $in: person.friends
    }
  }).toArray()
  const friendsOfFriends = await MongoOrb("Person").collection.find({
    _id:{
      $in: friends.flatMap(f => f.friends)
    }
  })
  const allPeople = Object.fromEntries([person,...friends,friendsOfFriends].map(p => ([p.id,p])))
  return peopleLoader.withData(person,allPeople) 
}

export const PersonFriends = (src,args) =>{
  const source = peopleLoader.fromSrc(src)
  return {
    ...src,
    friends: src.friends.map(f => source.__dataLoader[f])
  }
}
```
