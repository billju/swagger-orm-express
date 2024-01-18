# swagger-orm-express
create api server and document with only orm definition.
thanks to swagger-ui & jsdoc.

## Install
`npm install swagger-orm-express`

## Getting started
define your class
```js
const { Swagger, ORM } = require('swagger-orm-express');
class Tag {
    id = 0;
    name = '';
}
class Pet extends ORM {
    id = 0;
    name = '';
    tags = Array.of(new Tag());
}
```

connect to your database and insert a record
```js
const db = await ORM.connect({ driver: 'better-sqlite3', database: 'ORM.sqlite' });
await new Pet().set({id:1,name:'cat'}).insert(db);
```

create your server
```js
const app = new Swagger({ Pet });
const PORT = 3000;

app.get('/pet/:petId', async (req,res)=>{
        const {petId} = req.params;
        const pet = await new Pet().eq({id:petId}).find(db);
        res.json(pet);
    }).ok(Pet).tag('pet')

app.createApiDocs('/api-docs', '/swagger.json');
app.listen(PORT, () => console.log(`http://localhost:${PORT}/api-docs`));
```

## CRUD raw query vs orm
```js
// schema
await new User().constraint({ userId: 'INTEGER PRIMARY KEY AUTOINCREMENT' }).migrate(db);
// create
await db.write(`INSERT INTO User(userNam, userAccount, creTime) VALUES('', 'admin', '"2023-02-21T09:18:49.736Z"')`);
await new User().set({ userAccount: 'admin' }).insert(db);
// read one
await new User().raw(`SELECT * FROM User WHERE userNam LIKE :userNam`, { userNam: 'ad%' }).find(db);
// read all
await db.read(`SELECT userId, userNam, userAccount, creTime FROM User WHERE userNam LIKE 'ad%' AND userId IN(0, 1, 2) ORDER BY userId ASC, userNam DESC LIMIT 5`);
await new User().like({ userAccount: 'ad%' }).in({ userId: [0, 1, 2] }).orderBy({ userId: 'ASC', userNam: 'DESC' }).limit(5).findAll(db).then(users => users[0].userId);
// read value
await new User().raw(`SELECT COUNT(*) FROM User`).findValue(db);
// update
await db.write(`UPDATE User SET userNam = 'admin' WHERE userAccount = 'admin'`);
await new User().set({ userNam: 'admin' }).eq({ userAccount: 'admin' }).update(db);
```

## Run with example
create a petscore with under 200 lines of code.
`node petstore.js`