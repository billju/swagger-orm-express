const ORM = require('./orm');
const Swagger = require('./swagger');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, 'upload') });
const PORT = 3000;

class ApiResponse {
    code = 0;
    type = '';
    message = '';
}
class Category {
    id = 0;
    name = '';
}
class Tag {
    id = 0;
    name = '';
}
class Pet extends ORM {
    id = 0;
    category = new Category();
    name = '';
    photoUrls = Array.of('');
    tags = Array.of(new Tag());
    status = '';
}
class Order extends ORM {
    id = 0;
    petId = 0;
    quantity = 0;
    shipDate = '';
    status = '';
    complete = false;
}
class User extends ORM {
    id = 0;
    username = '';
    firstName = '';
    lastName = '';
    email = '';
    password = '';
    phone = '';
    userStatus = 0;
}

const app = new Swagger({ ApiResponse, Category, Tag, Pet, Order, User });
const db = new ORM.Client();
db.connect({ driver: 'better-sqlite3', database: 'ORM.sqlite' }).then(()=>{
    new Pet().createTableIfNotExists(db);
    new Order().createTableIfNotExists(db);
    new User().createTableIfNotExists(db);
});

//#region pet
app.post('/pet/:petId/uploadImage', upload.array(), async (req, res) => {
    const { petId } = req.params;
    const { additionalMetadata } = req.query;
    const file = req.body;
    res.json(new ApiResponse());
})
    .summary('uploads an image')
    .query('additionalMetadata')
    .body(File)
    .ok(ApiResponse)
    .tag('pet');
app.post('/pet', async (req, res) => {
    await new Pet(req.body).insert(db);
    res.json(new ApiResponse());
})
    .summary('Add a new pet to the store')
    .body(Pet)
    .ok(ApiResponse)
    .tag('pet');
app.put('/pet', async (req, res) => {
    await new Pet(req.body).update(db);
    res.json(new ApiResponse());
})
    .summary('Update an existing pet')
    .body(Pet)
    .ok(ApiResponse)
    .tag('pet');
app.get('/pet/findByStatus', async (req, res) => {
    const { status } = req.query;
    const pet = await new Pet().eq({ status }).find(db);
    res.json(pet);
})
    .summary('Finds Pets by status')
    .description('Multiple status values can be provided with comma separated strings')
    .query('status')
    .ok(Pet)
    .tag('pet');
app.get('/pet/:petId', async (req, res) => {
    const { petId } = req.params;
    const pet = await new Pet().eq({ id: petId }).find(db);
    res.json(pet);
})
    .summary('Deletes a pet')
    .tag('pet');
app.delete('/pet/:petId', async (req, res) => {
    const { petId } = req.params;
    await new Pet().eq({ id: petId }).delete(db);
})
    .summary('Find pet by ID')
    .description('Returns a single pet')
    .tag('pet');
//#endregion

//#region store
app.post('/store/order', async (req, res) => {
    await new Order(req.body).insert(db);
    res.json();
})
    .summary('Place an order for a pet')
    .body(Order)
    .ok(Order)
    .tag('store');
app.get('/store/order/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const order = await new Order().eq({ id: orderId }).find(db);
    res.json(order);
})
    .summary('Find purchase order by ID')
    .description('For valid response try integer IDs with value >= 1 and <= 10. Other values will generated exceptions')
    .ok(Order)
    .tag('store');
app.delete('/store/order/:orderId', async (req, res) => {
    const { orderId } = req.params;
    await new Order().eq({ id: orderId }).delete(db);
})
    .summary('Delete purchase order by ID')
    .description('For valid response try integer IDs with positive integer value. Negative or non-integer values will generate API errors')
    .tag('store');
app.get('/store/inventory', async (req, res) => {
    res.json({});
})
    .summary('Returns pet inventories by status')
    .description('Returns a map of status codes to quantities')
    .ok(Object)
    .tag('store');
//#endregion

//#region user
app.post('/user/createWithArray', async (req, res) => {
    const { users } = req.body;
    await db.batchInsert('User', users);
    res.json(new ApiResponse());
})
    .summary('Creates list of users with given input array')
    .body(Array.of(new User()))
    .ok(ApiResponse)
    .tag('user');
app.get('/user/:username', async (req, res) => {
    const { username } = req.params;
    const user = await new User().eq({ name: username }).find(db);
    res.json(user);
})
    .summary('Get user by user name')
    .ok(User)
    .tag('user');
app.put('/user/:username', async (req, res) => {
    const { username } = req.params;
    await new User().eq({ name: username }).set(req.body).update(db);
})
    .summary('Updated user')
    .description('This can only be done by the logged in user.')
    .body(User)
    .tag('user');
app.delete('/user/:username', async (req, res) => {
    const { username } = req.params;
    await new User().eq({ name: username }).set(req.body).delete(db);
})
    .summary('Delete user')
    .description('This can only be done by the logged in user.')
    .tag('user');
app.get('/user/login', async (req, res) => {
    const { username, password } = req.query;
})
    .summary('Logs user into the system')
    .query('username', 'password')
    .tag('user');
app.get('/user/logout', async (req, res) => {})
    .summary('Logs out current logged in user session')
    .tag('user');
app.post('/user', async (req, res) => {
    const user = req.body;
})
    .summary('Create user')
    .description('This can only be done by the logged in user.')
    .body(User)
    .tag('user');
//#endregion

app.doc.info.title = 'Swagger Petstore';
app.createApiDocs('/api-docs', '/swagger.json');
app.listen(PORT, () => console.log(`http://localhost:${PORT}/api-docs`));
