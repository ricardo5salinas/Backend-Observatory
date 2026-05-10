import { pool } from '../db.js';

const DOCUMENT_TABLE = 'public."Document"';
const DOCUMENT_WRITE_FIELDS = new Set([
  'title',
  'description',
  'type',
  'published_at',
  'file_url',
  'author_id',
  'project_id',
  'location_id',
]);

let documentColumnsCache = null;

const getDocumentColumns = async () => {
  if (documentColumnsCache) return documentColumnsCache;

  const result = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Document'
  `);

  documentColumnsCache = new Set(result.rows.map(row => row.column_name));
  return documentColumnsCache;
};

const prepareDocumentWrite = async (body, { isCreate = false } = {}) => {
  const columns = await getDocumentColumns();
  const data = {};

  for (const [key, value] of Object.entries(body || {})) {
    if (value === undefined) continue;
    if (!DOCUMENT_WRITE_FIELDS.has(key)) continue;
    if (!columns.has(key)) continue;
    data[key] = value;
  }

  if (isCreate && columns.has('published_at') && data.published_at === undefined) {
    data.published_at = new Date();
  }

  return data;
};

const getDocumentOrderBy = async () => {
  const columns = await getDocumentColumns();
  if (columns.has('created_at')) return 'ORDER BY d."created_at" DESC';
  return 'ORDER BY d."id" DESC';
};

const getDocumentSelect = async ({ byId = false } = {}) => {
  const columns = await getDocumentColumns();
  const orderBy = byId ? '' : await getDocumentOrderBy();
  const authorSelect = columns.has('author_id')
    ? ', COALESCE(a.name, u.name) AS author_name'
    : '';
  const authorJoins = columns.has('author_id')
    ? `
      LEFT JOIN public."Author" a ON d.author_id = a.id
      LEFT JOIN public."User" u ON d.author_id = u.id
    `
    : '';
  const where = byId ? 'WHERE d.id = $1' : '';

  return `
    SELECT d.*${authorSelect}
    FROM ${DOCUMENT_TABLE} d
    ${authorJoins}
    ${where}
    ${orderBy}
  `;
};

export const createDocument = async (body) => {
  const data = await prepareDocumentWrite(body, { isCreate: true });
  const keys = Object.keys(data);

  if (keys.length === 0) {
    throw new Error('No hay campos validos para crear el documento');
  }

  const columns = await getDocumentColumns();

  if (columns.has('updated_at') && data.updated_at === undefined) {
    data.updated_at = new Date();
    keys.push('updated_at');
  }

  const cols = keys.map(key => `"${key}"`).join(', ');
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
  const values = keys.map(key => data[key]);

  const result = await pool.query(
    `INSERT INTO ${DOCUMENT_TABLE} (${cols}) VALUES (${placeholders}) RETURNING *`,
    values,
  );

  return result.rows[0];
};

export const updateDocument = async (id, body) => {
  const existing = await getDocumentById(id);
  if (!existing) return null;

  const data = await prepareDocumentWrite(body);
  const keys = Object.keys(data).filter(key => key !== 'id');

  if (keys.length === 0) return existing;

  const columns = await getDocumentColumns();
  const setParts = keys.map((key, index) => `"${key}" = $${index + 1}`);
  const values = keys.map(key => data[key]);

  if (columns.has('updated_at')) {
    values.push(new Date());
    setParts.push(`"updated_at" = $${values.length}`);
  }

  values.push(id);

  const result = await pool.query(
    `UPDATE ${DOCUMENT_TABLE} SET ${setParts.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values,
  );

  return result.rows[0] || null;
};

export const getAllDocuments = async () => {
  const query = await getDocumentSelect();
  const result = await pool.query(query);
  return result.rows;
};

export const getDocumentById = async (id) => {
  const query = await getDocumentSelect({ byId: true });
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

export const deleteDocument = async (id) => {
  const result = await pool.query(`DELETE FROM ${DOCUMENT_TABLE} WHERE id = $1 RETURNING *`, [id]);
  return result.rows[0] || null;
};
