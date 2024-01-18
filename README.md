# swagger-orm-express
create api server and document with only orm definition.

thanks to swagger-ui-express & jsdoc.

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

connect to your database and insert a record (remember to install better-sqlite3 first)
```js
var db;
ORM.connect({ driver: 'better-sqlite3', database: 'ORM.sqlite' }).then(con=>db=con);
new Pet().set({id:1,name:'cat'}).insert(db);
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
class User { id; name; account; createdAt=new Date(); }
await new User().constraint({ id: 'INTEGER PRIMARY KEY AUTOINCREMENT' }).migrate(db);
// create
await db.write(`INSERT INTO User(name, account, createdAt) VALUES('', 'admin', '"2023-02-21T09:18:49.736Z"')`);
await new User().set({ account: 'admin' }).insert(db);
// read one
await new User().raw(`SELECT * FROM User WHERE name LIKE :name`, { name: 'ad%' }).find(db);
// read all
await db.read(`SELECT id, name, account, createdAt FROM User WHERE name LIKE 'ad%' AND id IN(0, 1, 2) ORDER BY id ASC, name DESC LIMIT 5`);
await new User().like({ account: 'ad%' }).in({ id: [0, 1, 2] }).orderBy({ id: 'ASC', name: 'DESC' }).limit(5).findAll(db).then(users => users[0].id);
// read value
await new User().raw(`SELECT COUNT(*) FROM User`).findValue(db);
// update
await db.write(`UPDATE User SET name = 'admin' WHERE account = 'admin'`);
await new User().set({ name: 'admin' }).eq({ account: 'admin' }).update(db);
```

## Run with example
create a petscore with under 200 lines of code.

```bash
node petstore.js
```
