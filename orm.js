Array.of = type => Object.assign([], { type });
class ORMEvent {
    sql = '';
    timer = new Date();
    error = '';
    constructor(arg) { Object.assign(this, arg); }
}
class ORMClient {
    driver = 'pg' | 'mysql' | 'mssql' | 'better-sqlite3' | 'oracledb';
    host = 'localhost';
    port = 5432 | 3306 | 1433 || undefined;
    user = 'root' | 'sa';
    password = 'password';
    database = 'public';
    schema = {};
    async listTables() { return []; }
    async listColumns(table) { return Object.entries({}); }
    async read(sql) { return [{}]; }
    async write(sql) { }
    async close() { }
    async batchInsert(table, rows, buffer = 30) {
        for (let i = 0; i < rows.length; i += buffer)
            await this.write(`INSERT INTO ${table} (${Object.keys(rows[0])}) VALUES (${rows.slice(i, i + buffer).map(row => Object.values(row).map(ORM.$)).join('),(')})`);
    }
    /** @param {ORMEvent} e */ onBefore(e) { }
    /** @param {ORMEvent} e */ onAfter(e) { }
    /** @param {ORMEvent} e */ onError(e) { console.error(e.sql, e.error); }
    constructor(arg) { Object.assign(this, arg); }
}
class ORM {
    _where = [];
    _as = {};
    _constraint = {};
    _set = {};
    _raw = '';
    _orderBy = {};
    _offset = 0;
    _limit = 0;
    _table = this.constructor.name;
    static Client = ORMClient;
    static DTYPE = { string: 'TEXT', number: 'NUMERIC', object: 'DATETIME', undefined: 'TEXT' };
    static PREFIX = ':';
    static SUFFIX = '';
    static notPreserved(text = '') { return !text.startsWith('_'); };
    static $(text) { return typeof text == 'string' ? "'" + text.replace(/'/g, '\'') + "'" : typeof text == 'object' ? "'" + JSON.stringify(text) + "'" : text; }
    static CASE_(CASE = '', WHEN = {}, ELSE = '') { return 'CASE ' + CASE + Object.entries(WHEN).map(([k, v]) => ' WHEN ' + (CASE ? ORM.$(k) : k) + ' THEN ' + ORM.$(v)).join('') + (ELSE ? ' ELSE ' + ELSE : '') + ' END'; }
    static ALIAS_(_expr = '', _alias = '') { return _alias && String(_expr).match(/^[A-Za-z]\w+$/) ? _alias + '.' + _expr : _expr; }
    static SELECT_(_class, _as = {}, _alias = '') { return 'SELECT ' + Object.keys(new _class()).filter(ORM.notPreserved).map(x => x in _as ? ORM.ALIAS_(map[x], _alias) + ` AS '${x}'` : ORM.ALIAS_(x, _alias)).join(','); }
    static IN_(arr) { return 'IN (' + arr.map(x => ORM.$(x)).join(',') + ')'; }
    /** @param {ORMClient} config @return {Promise<ORMClient>} */
    static async connect({ driver, host, port, database, user, password }) {
        const db = new ORMClient({ driver, host, port, database, user, password });
        function interceptor(handler) {
            return async function (sql) {
                const event = new ORMEvent({ sql });
                db.onBefore(event);
                try {
                    const result = await handler(event.sql);
                    db.onAfter(event);
                    return result;
                } catch (error) {
                    event.error = error;
                    db.onError(event);
                }
            };
        };
        switch (driver) {
            case 'pg': // https://node-postgres.com/
                const { Client } = require('pg');
                const client = new Client({ host, port, database, user, password });
                db.read = interceptor((sql) => client.query(sql));
                db.write = interceptor((sql) => client.query(sql).then(() => client.query('COMMIT')));
                db.close = () => client.end();
                break;
            case 'mysql': // https://github.com/mysqljs/mysql
                const mysql = require('mysql');
                const myConnection = await mysql.createConnection({ host, port, database, user, password });
                db.read = interceptor((sql) => new Promise((resolve) => connection.query(sql, (result) => resolve(result))));
                db.write = interceptor((sql) => new Promise((resolve) => connection.query(sql, (result) => resolve(result))));
                db.close = () => myConnection.end();
                break;
            case 'mssql': // https://www.npmjs.com/package/mssql
                const mssql = require('mssql');
                const connectionPool = await mssql.connect({
                    driver: 'msnodesqlv8', server: host.replace('\\SQLEXPRESS', ''), port, database, user, password,
                    options: { trustServerCertificate: true, [host.includes('\\SQLEXPRESS') && 'instanceName']: 'SQLEXPRESS' }
                });
                db.listTables = () => mssql.query('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES').then(x => x.recordsets[0].map(y => y.TABLE_NAME));
                db.listColumns = (table) => mssql.query(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}'`).then(x => x.recordsets[0].map(y => [y.COLUMN_NAME, y.DATA_TYPE]));
                db.read = interceptor((sql) => mssql.query(sql).then(x => x.recordsets.shift()));
                db.write = interceptor((sql) => mssql.query(sql));
                db.close = () => connectionPool.close();
                break;
            case 'oracledb': // https://node-oracledb.readthedocs.io/en/latest/user_guide/introduction.html#getstarted
                const oracledb = require('oracledb');
                const connection = await oracledb.getConnection({ connectString: host, user, password });
                db.read = interceptor((sql) => connection.execute(sql).rows);
                db.write = interceptor((sql) => connection.execute(sql));
                db.close = () => connection.close();
            case 'better-sqlite3': // https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
                const sqlite = require('better-sqlite3')(database);
                db.listTables = async () => sqlite.prepare('SELECT name FROM SQLITE_MASTER').all().map(x => x.name);
                db.listColumns = async (table) => sqlite.prepare(`pragma table_info(${table})`).all().map(x => [x.name, x.type]);
                db.read = interceptor(async (sql) => sqlite.prepare(sql).all());
                db.write = interceptor(async (sql) => sqlite.exec(sql));
                db.close = () => sqlite.close();
                break;
            default: break;
        }
        return db;
    }
    static mergeDeep(target, ...sources) {
        function isObject(obj) { return typeof obj == 'object' && obj !== null && typeof obj.map != 'function'; }
        if (!sources.length || !isObject(target)) return target;
        const source = sources.shift();
        if (isObject(source)) {
            for (const key in source) {
                if (isObject(source[key])) {
                    if (!target[key]) target[key] = {};
                    ORM.mergeDeep(target[key], source[key]);
                } else target[key] = source[key];
            }
        }
        return ORM.mergeDeep(target, ...sources);
    }
    _condition(db = new ORMClient(), sql = '') {
        this._where = this._where.filter(([k, o, v]) => v !== undefined);
        for (let where of this._where) if (['!=', '<>'].includes(where[1])) where[1] = db.driver == 'mssql' ? '<>' : '!=';
        if (this._where.length) sql += ' WHERE ' + this._where.map(([k, o, v]) => (k in this._as ? this._as[k] : k) + o + v).join(' AND ');
        if (Object.keys(this._orderBy).length) sql += ' ORDER BY ' + Object.entries(this._orderBy).map(([k, v]) => k + ' ' + v);
        if (this._offset) sql += ' OFFSET ' + this._offset;
        if (this._limit && db.driver != 'mssql') sql += ' LIMIT ' + this._limit;
        return sql;
    }
    _entries(obj = {}) { return Object.entries(obj).map(([k, v]) => [k in this._as ? this._as[k] : k, ORM.$(v)]).filter(([k, v]) => k && typeof k == 'string' && ORM.notPreserved(k) && v !== undefined); }
    selectSQL(db) {
        const TOP = this._limit && db.driver == 'mssql' ? `TOP ${this._limit} ` : '';
        return this._raw || `SELECT ${TOP}${Object.keys(this).filter(ORM.notPreserved).map(k => k in this._as ? this._as[k] + " AS '" + k + "'" : k).join(',')} FROM ${this._table}${this._condition(db)}; `;
    }
    insertSQL() { const entries = this._entries(this); return `INSERT INTO ${this._table} (${entries.map(x => x[0]).join(',')}) VALUES (${entries.map(x => x[1]).join(',')}); `; }
    updateSQL(db) { return `UPDATE ${this._table} SET ${this._entries(this._set).map(([k, v]) => k + '=' + v).join(',')}${this._condition(db)}; `; }
    /** @return {this} */ clearPreserved() { for (let key in new ORM()) delete this[key]; return this; }
	/** @param {this} arg @return {this} */eq(arg) { this._where.push(...Object.entries(arg).map(([k, v]) => [k, '=', ORM.$(v)])); return this; }
	/** @param {this} arg @return {this} */ne(arg) { this._where.push(...Object.entries(arg).map(([k, v]) => [k, '!=', ORM.$(v)])); return this; }
	/** @param {this} arg @return {this} */gt(arg) { this._where.push(...Object.entries(arg).map(([k, v]) => [k, '>', ORM.$(v)])); return this; }
	/** @param {this} arg @return {this} */ge(arg) { this._where.push(...Object.entries(arg).map(([k, v]) => [k, '>=', ORM.$(v)])); return this; }
	/** @param {this} arg @return {this} */lt(arg) { this._where.push(...Object.entries(arg).map(([k, v]) => [k, '<', ORM.$(v)])); return this; }
	/** @param {this} arg @return {this} */le(arg) { this._where.push(...Object.entries(arg).map(([k, v]) => [k, '<=', ORM.$(v)])); return this; }
	/** @param {this} arg @return {this} */like(arg) { this._where.push(...Object.entries(arg).map(([k, v]) => [k, ' LIKE ', ORM.$(v)])); return this; }
    /** @param {this} arg @return {this} */regexp(arg) { this._where.push(...Object.entries(arg).map(([k, v]) => [k, ' REGEXP ', ORM.$(v)])); return this; }
    /** @param {this} arg @return {this} */between(arg) { this._where.push(...Object.entries(arg).map(([k, v]) => [k, ' BETWEEN ', typeof v == 'string' ? v : v.map(ORM.$).join(' AND ')])); return this; }
	/** @param {this} arg @return {this} */in(arg) { this._where.push(...Object.entries(arg).map(([k, v]) => [k, ' IN ', '(' + v.map(ORM.$).join(',') + ')'])); return this; }
    /** @param {this} arg @return {this} */as(arg) { this._as = arg; return this; }
    /** @param {this} arg @return {this} */orderBy(arg) { this._orderBy = arg; return this; }
    /** @param {number} limit @return {this} */limit(limit) { this._limit = limit; return this; }
    /** @param {number} offset @return {this} */offset(offset) { this._offset = offset; return this; }
    /** @param {string} raw @param {this} arg @return {this} */raw(raw, arg = {}) { for (let key in arg) raw = raw.replace(new RegExp(ORM.PREFIX + key + ORM.SUFFIX, 'g'), ORM.$(arg[key])); this._raw = raw; return this; }
	/** @param {this} arg @return {this} */set(arg = {}) { for (let key in arg) if (ORM.notPreserved(key) && key in this) this._set[key] = this[key] = arg[key]; return this; }
    /** @param {this} arg @return {this} */constraint(arg) { for (let key in arg) if (!(key in this)) this[key] = undefined; Object.assign(this._constraint, arg); return this; }
	/** @param {string} table @return {this} */table(table) { this._table = table; return this; }
    /** @param {number} page @return {this} */page(page) { this._page = page; return this; }
    /** @param {ORMClient} db @return {Promise<number>} */ async findValue(db) { const rows = await db.read(this._raw || `SELECT COUNT(*) FROM ${this._table}${this._condition(db)};`); return Object.values(rows?.shift() || {}).shift(); }
	/** @param {ORMClient} db @return {Promise<this>} */ async find(db) { return db.read(this.selectSQL(db)).then(rows => rows && rows[0]); }
	/** @param {ORMClient} db @return {Promise<this[]>} */async findAll(db) { return db.read(this.selectSQL(db)); }
	/** @param {ORMClient} db @return {Promise<this>} */async insert(db) { await db.write(this.insertSQL(db)); return this.clearPreserved(); }
	/** @param {ORMClient} db @return {Promise<this>} */async update(db) { await db.write(this.updateSQL(db)); return this.clearPreserved(); }
	/** @param {ORMClient} db @return {Promise<this>} */async upsert(db) { if (await this.findValue(db)) return this.update(db); return this.insert(db); }
	/** @param {ORMClient} db */async delete(db) { return db.write(`DELETE FROM ${this._table} WHERE${this._condition(db)}; `); }
    /** @param {ORMClient} db */ async createTableIfNotExists(db) {
        const entries = Object.keys(this).filter(ORM.notPreserved).map(k => [k in this._as ? this._as[k] : k, this._constraint[k] || ORM.DTYPE[typeof this[k]]]);
        await db.write(`CREATE TABLE IF NOT EXISTS ${this._table} (${entries.map(([k, v]) => k + ' ' + v).join(',')});`); return entries;
    }
    /** @param {ORMClient} db */async migrate(db) {
        const afterEntries = await this.createTableIfNotExists(db);
        const beforeEntries = await db.listColumns(this._table);
        if (afterEntries.length == beforeEntries.length && afterEntries.every(x => x[1].split(' ')[0] == beforeEntries.find(y => x[0] == y[0])?.[1])) return;
        if (db.driver == 'better-sqlite3') {
            const innerColumns = afterEntries.map(x => x[0]).filter(x => beforeEntries.some(y => x == y[0]));
            await db.write(`ALTER TABLE ${this._table} RENAME TO temporary_table;
            CREATE TABLE IF NOT EXISTS ${this._table} (${afterEntries.map(([k, v]) => k + ' ' + v).join(',')});
            INSERT INTO ${this._table} (${innerColumns}) SELECT ${innerColumns} FROM temporary_table;
            DROP TABLE temporary_table;`);
        } else {
            for (let [name, type] of afterEntries) {
                const before = beforeEntries.find(x => x[0] == name);
                if (!before) await db.write(`ALTER TABLE ${this._table} ADD COLUMN ${name} ${type};`);
                else if (before[1] != type) await db.write(`ALTER TABLE ${this._table} MODIFY COLUMN ${name} ${type};`);
            }
            for (let [name] of beforeEntries.filter(x => !afterEntries.some(y => x[0] == y[0])))
                await db.write(`ALTER TABLE ${this._table} DROP COLUMN ${name};`);
        }
    }
    constructor(...args) { ORM.mergeDeep(this, ...args); }
}
module.exports = ORM;