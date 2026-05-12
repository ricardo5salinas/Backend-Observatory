import * as authorsModel from '../models/authors.models.js'

export const createAuthor = async (req, res) => {
  const body = req.body || {}
  const { name, bio, email } = body
  if (!name) return res.status(400).json({ ok: false, error: 'Faltan campos requeridos' })

  try {
    const author = await authorsModel.createAuthor({ name, bio, email })
    return res.status(201).json({ ok: true, author })
  } catch (error) {
    console.error('Error en createAuthor:', error)
    if (error && error.code === '23505') {
      return res.status(409).json({ ok: false, error: 'Ya existe un autor con esos datos' })
    }
    return res.status(500).json({ ok: false, error: 'Error al crear el autor' })
  }
}

export const getAuthors = async (req, res) => {
  try {
    const authors = await authorsModel.getAllAuthors()
    return res.status(200).json({ ok: true, authors })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ ok: false, error: 'Error al obtener autores' })
  }
}

export const getAuthorById = async (req, res) => {
  const { id } = req.params
  try {
    const author = await authorsModel.getAuthorById(id)
    if (!author) return res.status(404).json({ ok: false, error: 'Autor no encontrado' })
    return res.status(200).json({ ok: true, author })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ ok: false, error: 'Error al obtener el autor' })
  }
}

export const updateAuthor = async (req, res) => {
  const { id } = req.params
  const body = req.body || {}
  try {
    const author = await authorsModel.updateAuthor(id, body)
    if (!author) return res.status(404).json({ ok: false, error: 'Autor no encontrado' })
    return res.status(200).json({ ok: true, author })
  } catch (error) {
    console.error('Error en updateAuthor:', error)
    if (error && error.code === '23505') {
      return res.status(409).json({ ok: false, error: 'Ya existe un autor con esos datos' })
    }
    return res.status(500).json({ ok: false, error: 'Error al actualizar el autor' })
  }
}

export const deleteAuthor = async (req, res) => {
  const { id } = req.params
  try {
    const author = await authorsModel.deleteAuthor(id)
    if (!author) return res.status(404).json({ ok: false, error: 'Autor no encontrado' })
    return res.status(200).json({ ok: true, message: 'Autor eliminado', author })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ ok: false, error: 'Error al eliminar el autor' })
  }
}
