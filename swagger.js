const express = require('express');
const swaggerUi = require('swagger-ui-express');
class Swagger {
    express = express(); typedef = {}; _pipes = []; _query = []; _tags = [];
    doc = { openapi: '3.0.0', info: { title: 'swagger-orm-express' }, paths: {}, components: { schemas: {} } };
    findRef(value = {}) {
        const name = Object.keys(this.typedef).find(x => (Array.isArray(value) ? value.type : value) instanceof this.typedef[x]);
        return name && '#/components/schemas/' + name;
    }
    createSchema(schema = {}) {
        if (schema.prototype) schema = new schema();
        if (Array.isArray(schema)) {
            const $ref = this.findRef(schema);
            return { type: 'array', items: $ref ? { $ref } : { type: typeof schema.type } };
        }
        const properties = {};
        for (let [key, value] of Object.entries(schema)) {
            if (key.startsWith('_')) continue;
            if (typeof value == 'object') {
                const $ref = this.findRef(value);
                properties[key] = Array.isArray(value) ? { type: 'array', items: $ref ? { $ref } : { type: typeof value.type } } : { $ref };
            } else if (typeof value == 'string') properties[key] = { type: 'string', example: value };
            else if (typeof value == 'number') properties[key] = { type: 'integer', example: value };
        }
        // { allOf: { $ref: '#/components/schemas/' + extend }, properties };
        return { properties };
    }
    use(...args) { this.express.use(...args); return this; }
    set(...args) { this.express.set(...args); return this; }
    listen(...args) { this.express.listen(...args); return this; }
    get(_url, ..._pipes) { return Object.assign(this.next(), { _method: 'get', _url, _pipes }); }
    post(_url, ..._pipes) { return Object.assign(this.next(), { _method: 'post', _url, _pipes }); }
    put(_url, ..._pipes) { return Object.assign(this.next(), { _method: 'put', _url, _pipes }); }
    delete(_url, ..._pipes) { return Object.assign(this.next(), { _method: 'delete', _url, _pipes }); }
    patch(_url, ..._pipes) { return Object.assign(this.next(), { _method: 'patch', _url, _pipes }); }
    head(_url, ..._pipes) { return Object.assign(this.next(), { _method: 'head', _url, _pipes }); }
    query(..._query) { return Object.assign(this, { _query }); }
    body(_body) { return Object.assign(this, { _body }); }
    ok(_ok) { return Object.assign(this, { _ok }); }
    tag(..._tags) { return Object.assign(this, { _tags }); }
    summary(_summary) { return Object.assign(this, { _summary }); }
    description(_description) { return Object.assign(this, { _description }); }
    next() {
        const { doc, _method, _pipes, _url, _query, _body, _ok, _tags, _summary, _description } = this;
        if (!_method) return this;
        const _path = (_url.match(/:\w+/g) || []).map(x => x.replace(':', ''));
        const parameters = [
            ..._path.map(name => ({ name, in: 'path', required: true })),
            ..._query.map(name => ({ name, in: 'query' })),
        ];
        const router = { tags: _tags, parameters, summary: _summary, description: _description, operationId: this._pipes[this._pipes.length - 1]?.name || '' };
        const mime = 'application/json';
        if (_body) router.requestBody = { content: { [mime]: { schema: this.createSchema(_body) } } };
        if (_ok) router.responses = { 200: { content: { [mime]: { schema: this.createSchema(_ok) } } } };
        const pathname = _url.replace(/:(\w+)/g, '{$1}');
        if (doc.paths[pathname]) doc.paths[pathname][_method] = router;
        else doc.paths[pathname] = { [_method]: router };
        this.routerMatcher = this.express[_method](_url, ..._pipes);
        return Object.assign(this, { _method: '', _url: '', _body: null, _ok: null, _query: [], _pipes: [], _tags: [], _summary: '', _description: '' });
    }
    createApiDocs(htmlURL = '/api-docs', jsonURL = '/swagger.json') {
        this.next();
        this.express.use(htmlURL, swaggerUi.serve, swaggerUi.setup(this.doc));
        this.express.get(jsonURL, (req, res) => res.json(this.doc));
        return this;
    }
    constructor(typedef) {
        Object.assign(this, { typedef });
        for (let key in typedef) this.doc.components.schemas[key] = this.createSchema(typedef[key]);
    }
}
module.exports = Swagger;