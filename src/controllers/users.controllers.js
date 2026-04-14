import jwt from 'jsonwebtoken';
import * as usersModel from '../models/users.models.js';

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, pass, password_hash, ...safe } = user;
  return safe;
};

export const getUsers = async (req, res) => {
  try {
    const users = await usersModel.getAllUsers();
    return res.status(200).json({ ok: true, users: users.map(sanitizeUser) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: 'Error al obtener usuarios' });
  }
};

export const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await usersModel.getUserById(id);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    return res.status(200).json({ ok: true, user: sanitizeUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: 'Error al obtener el usuario' });
  }
};

export const createUser = async (req, res) => {
  const body = req.body || {};

  if (!body.email || !body.password) {
    return res.status(400).json({ ok: false, error: 'Email y contraseña son requeridos' });
  }

  try {
    const user = await usersModel.createUser(body);
    return res.status(201).json({ ok: true, user: sanitizeUser(user) });
  } catch (error) {
    console.error(error);
    if (error && error.code === '23505') {
      return res.status(409).json({ ok: false, error: 'Ya existe un usuario con esos datos' });
    }
    return res.status(500).json({ ok: false, error: 'Error al crear el usuario' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Email y contraseña requeridos' });
  }

  try {
    const user = await usersModel.authenticate(email, password);
    if (!user) return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });

    const payload = {
      id: user.id,
      email: user.email,
      role_id: user.role_id ?? null,
      role_name: user.role_name ?? null,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'change_this_secret', { expiresIn: '1h' });

    return res.status(200).json({ ok: true, token, user: sanitizeUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: 'Error al autenticar usuario' });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  if (Object.keys(body).length === 0) {
    return res.status(400).json({ ok: false, error: 'Cuerpo vacío' });
  }

  try {
    const user = await usersModel.updateUser(id, body);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    return res.status(200).json({ ok: true, user: sanitizeUser(user) });
  } catch (error) {
    console.error(error);
    if (error && error.code === '23505') {
      return res.status(409).json({ ok: false, error: 'Ya existe un usuario con esos datos' });
    }
    return res.status(500).json({ ok: false, error: 'Error al actualizar el usuario' });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await usersModel.deleteUser(id);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    return res.status(200).json({ ok: true, message: 'Usuario eliminado', user: sanitizeUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: 'Error al eliminar el usuario' });
  }
};
