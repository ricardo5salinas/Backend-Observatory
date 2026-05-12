import { pool } from '../db.js';

const AUTHOR_TABLE = 'public."Author"';
const AUTHOR_WRITE_FIELDS = new Set(['name', 'bio', 'email']);

const RELATED_TABLES = [
  { key: 'documents', tableName: 'Document', table: 'public."Document"' },
  { key: 'posts', tableName: 'Post', table: 'public."Post"' },
  { key: 'projects', tableName: 'Project', table: 'public."Project"' },
];

let authorColumnsCache = null;
const tableColumnsCache = new Map();

const getTableColumns = async (tableName) => {
  if (tableColumnsCache.has(tableName)) return tableColumnsCache.get(tableName);

  const result = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
  `, [tableName]);

  const columns = new Set(result.rows.map(row => row.column_name));
  tableColumnsCache.set(tableName, columns);
  return columns;
};

const getAuthorColumns = async () => {
  if (authorColumnsCache) return authorColumnsCache;
  authorColumnsCache = await getTableColumns('Author');
  return authorColumnsCache;
};

const prepareAuthorWrite = async (body) => {
  const columns = await getAuthorColumns();
  const data = {};

  for (const [key, value] of Object.entries(body || {})) {
    if (value === undefined) continue;
    if (!AUTHOR_WRITE_FIELDS.has(key)) continue;
    if (!columns.has(key)) continue;
    data[key] = value;
  }

  return data;
};

const getAuthorOrderBy = async () => {
  const columns = await getAuthorColumns();
  if (columns.has('created_at')) return 'ORDER BY a."created_at" DESC';
  return 'ORDER BY a."id" DESC';
};

const attachAuthorRelations = async (author) => {
  if (!author) return null;

  const entries = await Promise.all(RELATED_TABLES.map(async ({ key, tableName, table }) => {
    const columns = await getTableColumns(tableName);

    if (!columns.has('author_id')) {
      return [key, []];
    }

    const orderBy = columns.has('created_at') ? 'ORDER BY "created_at" DESC' : 'ORDER BY "id" DESC';
    const result = await pool.query(
      `SELECT * FROM ${table} WHERE "author_id" = $1 ${orderBy}`,
      [author.id],
    );

    return [key, result.rows];
  }));

  return {
    ...author,
    ...Object.fromEntries(entries),
  };
};

export const createAuthor = async (body) => {
  const data = await prepareAuthorWrite(body);
  const keys = Object.keys(data);

  if (keys.length === 0) {
    throw new Error('No hay campos validos para crear el autor');
  }

  const cols = keys.map(key => `"${key}"`).join(', ');
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
  const values = keys.map(key => data[key]);

  const result = await pool.query(
    `INSERT INTO ${AUTHOR_TABLE} (${cols}) VALUES (${placeholders}) RETURNING *`,
    values,
  );

  return attachAuthorRelations(result.rows[0]);
};

export const getAllAuthors = async () => {
  const orderBy = await getAuthorOrderBy();
  const result = await pool.query(`SELECT a.* FROM ${AUTHOR_TABLE} a ${orderBy}`);
  return Promise.all(result.rows.map(attachAuthorRelations));
};

export const getAuthorById = async (id) => {
  const result = await pool.query(`SELECT * FROM ${AUTHOR_TABLE} WHERE id = $1`, [id]);
  return attachAuthorRelations(result.rows[0] || null);
};

export const updateAuthor = async (id, body) => {
  const existing = await getAuthorById(id);
  if (!existing) return null;

  const data = await prepareAuthorWrite(body);
  const keys = Object.keys(data).filter(key => key !== 'id');

  if (keys.length === 0) return existing;

  const columns = await getAuthorColumns();
  const setParts = keys.map((key, index) => `"${key}" = $${index + 1}`);
  const values = keys.map(key => data[key]);

  if (columns.has('updated_at')) {
    values.push(new Date());
    setParts.push(`"updated_at" = $${values.length}`);
  }

  values.push(id);

  const result = await pool.query(
    `UPDATE ${AUTHOR_TABLE} SET ${setParts.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values,
  );

  return attachAuthorRelations(result.rows[0] || null);
};

export const deleteAuthor = async (id) => {
  const result = await pool.query(`DELETE FROM ${AUTHOR_TABLE} WHERE id = $1 RETURNING *`, [id]);
  return result.rows[0] || null;
};
