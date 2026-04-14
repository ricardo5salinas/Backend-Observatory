import { pool } from '../db.js';
import bcrypt from 'bcryptjs';

const USER_TABLE = 'public."User"';
const ROLE_TABLE = 'public."Role"';
const USER_WRITE_FIELDS = new Set([
  'name',
  'first_name',
  'last_name',
  'email',
  'password',
  'pass',
  'password_hash',
  'role_id',
  'status',
]);

let userColumnsCache = null;
let roleTableExistsCache = null;

const getUserColumns = async () => {
  if (userColumnsCache) return userColumnsCache;

  const result = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
  `);

  userColumnsCache = new Map(result.rows.map(row => [row.column_name, row.data_type]));
  return userColumnsCache;
};

const findColumn = (columns, candidates) => candidates.find(column => columns.has(column));

const roleTableExists = async () => {
  if (roleTableExistsCache !== null) return roleTableExistsCache;

  const result = await pool.query('SELECT to_regclass($1) AS table_name', ['public."Role"']);
  roleTableExistsCache = Boolean(result.rows[0] && result.rows[0].table_name);
  return roleTableExistsCache;
};

const getRoleJoinParts = async () => {
  const columns = await getUserColumns();
  const canJoinRole = columns.has('role_id') && await roleTableExists();

  return {
    roleSelect: canJoinRole ? ', r.name AS role_name' : ', NULL AS role_name',
    roleJoin: canJoinRole ? `LEFT JOIN ${ROLE_TABLE} r ON u.role_id = r.id` : '',
  };
};

const getStatusColumn = async () => {
  const columns = await getUserColumns();
  const name = findColumn(columns, ['status']);
  return name ? { name, type: columns.get(name) } : null;
};

const normalizeStatus = (value, statusColumn) => {
  if (value === undefined || !statusColumn) return undefined;

  const isBooleanColumn = statusColumn.type && statusColumn.type.includes('boolean');
  if (isBooleanColumn) {
    if (typeof value === 'boolean') return value;
    return value === 'active';
  }

  if (typeof value === 'boolean') return value ? 'active' : 'inactive';
  return value;
};

const getRoleByName = async (roleName) => {
  if (!roleName || typeof roleName !== 'string') return null;

  try {
    const result = await pool.query(
      `SELECT id, name FROM ${ROLE_TABLE} WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [roleName],
    );
    return result.rows[0] || null;
  } catch (error) {
    if (error && (error.code === '42P01' || error.code === '42703')) return null;
    throw error;
  }
};

const resolveRoleId = async (body) => {
  if (body.role_id !== undefined) return body.role_id;
  if (body.role === undefined) return undefined;

  if (typeof body.role === 'number') return body.role;
  if (typeof body.role === 'string' && /^\d+$/.test(body.role)) return Number(body.role);

  const role = await getRoleByName(body.role);
  return role ? role.id : undefined;
};

const prepareUserWrite = async (body) => {
  const columns = await getUserColumns();
  const statusColumn = await getStatusColumn();
  const passwordColumn = findColumn(columns, ['password', 'password_hash', 'pass']);
  const prepared = {};

  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || key === 'role') continue;
    if (!USER_WRITE_FIELDS.has(key)) continue;

    if (key === 'password') {
      if (passwordColumn) prepared[passwordColumn] = await bcrypt.hash(value, 10);
      continue;
    }

    if (key === 'status') {
      const normalizedStatus = normalizeStatus(value, statusColumn);
      if (normalizedStatus !== undefined) prepared[statusColumn.name] = normalizedStatus;
      continue;
    }

    if (columns.has(key)) {
      prepared[key] = value;
    }
  }

  if (!prepared.name && !prepared.first_name) {
    if (body.name !== undefined && columns.has('first_name')) prepared.first_name = body.name;
    if (body.first_name !== undefined && columns.has('name')) prepared.name = body.first_name;
  }

  const roleId = await resolveRoleId(body);
  if (roleId !== undefined && columns.has('role_id')) {
    prepared.role_id = roleId;
  }

  return prepared;
};

const getActiveUserWhereClause = async (alias = 'u') => {
  const statusColumn = await getStatusColumn();
  if (!statusColumn) return { clause: '', params: [] };

  const column = `${alias}."${statusColumn.name}"`;
  if (statusColumn.type && statusColumn.type.includes('boolean')) {
    return { clause: ` AND ${column} IS NOT FALSE`, params: [] };
  }

  return { clause: ` AND COALESCE(${column}, '') <> $2`, params: ['deleted'] };
};

export const getAllUsers = async () => {
  const statusColumn = await getStatusColumn();
  const { roleSelect, roleJoin } = await getRoleJoinParts();

  let where = '';
  const values = [];
  if (statusColumn && statusColumn.type && statusColumn.type.includes('boolean')) {
    where = 'WHERE u."status" IS NOT FALSE';
  } else if (statusColumn) {
    where = 'WHERE COALESCE(u."status", \'\') <> $1';
    values.push('deleted');
  }

  const result = await pool.query(`
    SELECT u.*${roleSelect}
    FROM ${USER_TABLE} u
    ${roleJoin}
    ${where}
    ORDER BY u.created_at DESC
  `, values);
  return result.rows;
};

export const getUserById = async (id) => {
  const { clause, params } = await getActiveUserWhereClause('u');
  const { roleSelect, roleJoin } = await getRoleJoinParts();
  const values = [id, ...params];

  const result = await pool.query(`
    SELECT u.*${roleSelect}
    FROM ${USER_TABLE} u
    ${roleJoin}
    WHERE u.id = $1${clause}
  `, values);

  return result.rows[0] || null;
};

export const createUser = async (body) => {
  const data = await prepareUserWrite(body);
  const keys = Object.keys(data);

  if (keys.length === 0) {
    throw new Error('No hay campos validos para crear el usuario');
  }

  const cols = keys.map(k => `"${k}"`).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const values = keys.map(key => data[key]);

  const result = await pool.query(
    `INSERT INTO ${USER_TABLE} (${cols}) VALUES (${placeholders}) RETURNING *`,
    values,
  );
  return result.rows[0];
};

export const authenticate = async (email, password) => {
  const statusColumn = await getStatusColumn();
  const { roleSelect, roleJoin } = await getRoleJoinParts();
  const values = [email];
  let statusFilter = '';

  if (statusColumn && statusColumn.type && statusColumn.type.includes('boolean')) {
    statusFilter = 'AND u."status" IS NOT FALSE';
  } else if (statusColumn) {
    values.push('active');
    statusFilter = `AND COALESCE(u."status", 'active') = $${values.length}`;
  }

  const result = await pool.query(`
    SELECT u.*${roleSelect}
    FROM ${USER_TABLE} u
    ${roleJoin}
    WHERE LOWER(u."email") = LOWER($1)
      ${statusFilter}
    LIMIT 1
  `, values);

  if (result.rows.length === 0) return null;

  const user = result.rows[0];
  const hash = user.password || user.pass || user.password_hash;
  if (!hash) return null;

  if (typeof hash === 'string' && hash.startsWith('$2')) {
    const ok = await bcrypt.compare(password, hash);
    return ok ? user : null;
  }

  if (password === hash) {
    try {
      const columns = await getUserColumns();
      const passwordColumn = findColumn(columns, ['password', 'password_hash', 'pass']);
      if (passwordColumn) {
        const newHash = await bcrypt.hash(password, 10);
        await pool.query(`UPDATE ${USER_TABLE} SET "${passwordColumn}" = $1 WHERE id = $2`, [newHash, user.id]);
      }
    } catch (error) {
      console.error('Failed to migrate password to bcrypt for user', user.id, error);
    }
    return user;
  }

  return null;
};

export const getRoleById = async (roleId) => {
  if (!roleId) return null;

  try {
    const result = await pool.query(`SELECT id, name FROM ${ROLE_TABLE} WHERE id = $1 LIMIT 1`, [roleId]);
    return result.rows[0] || null;
  } catch (error) {
    if (error && (error.code === '42P01' || error.code === '42703')) return null;
    throw error;
  }
};

export const updateUser = async (id, body) => {
  const existing = await getUserById(id);
  if (!existing) return null;

  const data = await prepareUserWrite(body);
  const keys = Object.keys(data).filter(key => key !== 'id');
  if (keys.length === 0) return existing;

  const setClause = keys.map((key, index) => `"${key}" = $${index + 1}`).join(', ');
  const values = keys.map(key => data[key]);
  values.push(id);

  const result = await pool.query(
    `UPDATE ${USER_TABLE} SET ${setClause}, "updated_at" = NOW() WHERE id = $${values.length} RETURNING *`,
    values,
  );
  return result.rows[0] || null;
};

export const deleteUser = async (id) => {
  const statusColumn = await getStatusColumn();

  if (statusColumn && statusColumn.type && statusColumn.type.includes('boolean')) {
    const result = await pool.query(
      `UPDATE ${USER_TABLE} SET "${statusColumn.name}" = $1 WHERE id = $2 RETURNING *`,
      [false, id],
    );
    return result.rows[0] || null;
  }

  if (statusColumn) {
    const result = await pool.query(
      `UPDATE ${USER_TABLE} SET "${statusColumn.name}" = $1 WHERE id = $2 RETURNING *`,
      ['deleted', id],
    );
    return result.rows[0] || null;
  }

  const result = await pool.query(`DELETE FROM ${USER_TABLE} WHERE id = $1 RETURNING *`, [id]);
  return result.rows[0] || null;
};
