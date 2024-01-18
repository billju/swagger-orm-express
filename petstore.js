const ORM = require('./orm');
const Swagger = require('./swagger');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, 'upload') });

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
const PORT = 3000;

//#region pet
app.post('/pet/:petId/uploadImage', upload.array(), async (req, res) => {
    const { petId } = req.params;
    const { additionalMetadata } = req.query;
    const file = req.body;
})
    .query('additionalMetadata')
    .ok(ApiResponse)
    .tag('pet');
app.post('/pet', async (req, res) => {
    await new Pet(req.body).insert(db);
    res.json(new ApiResponse());
})
    .body(Pet)
    .ok(ApiResponse)
    .tag('pet');
app.put('/pet', async (req, res) => {
    await new Pet(req.body).update(db);
    res.json(new ApiResponse());
})
    .body(Pet)
    .ok(ApiResponse)
    .tag('pet');
app.get('/pet/:petId', async (req, res) => {
    const { petId } = req.params;
    const pet = await new Pet().eq({ id: petId }).find(db);
    res.json(pet);
})
    .ok(Pet)
    .tag('pet');
//#endregion

//#region store
app.post('/store/order', async (req, res) => {
    await new Order(req.body).insert(db);
    res.json();
})
    .body(Order)
    .ok(Order)
    .tag('store');
app.get('/store/order/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const order = await new Order().eq({ id: orderId }).find(db);
    res.json(order);
})
    .ok(Order)
    .tag('store');
app.delete('/store/order/:orderId', async (req, res) => {
    const { orderId } = req.params;
    await new Order(req.body).delete(db);
}).tag('store');
app.get('/store/inventory', async (req, res) => {
    res.json({});
})
    .ok(Object)
    .tag('store');
//#endregion

//#region user
app.post('/user/createWithArray', async (req, res) => {})
    .body(Array.of(new User()))
    .tag('user');
app.get('/user/:username', async (req, res) => {
    const { username } = req.params;
    const user = await new User().eq({ name: username }).find(db);
    res.json(user);
})
    .ok(User)
    .tag('user');
app.put('/user/:username', async (req, res) => {
    const { username } = req.params;
    await new User().eq({ name: username }).set(req.body).update(db);
})
    .body(User)
    .tag('user');
app.delete('/user/:username', async (req, res) => {
    const { username } = req.params;
    await new User().eq({ name: username }).set(req.body).delete(db);
}).tag('user');
app.get('/user/login', async (req, res) => {
    const { username, password } = req.query;
})
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

app.createApiDocs('/api-docs', '/swagger.json');
app.listen(PORT, () => console.log(`http://localhost:${PORT}/api-docs`));
