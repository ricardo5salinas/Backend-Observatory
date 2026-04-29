import * as postsModel from '../models/posts.models.js'

export const createPost = async (req, res) => {
  const body = req.body || {}
  // Nota: Quitamos 'status' de aquí porque el modelo ahora lo pone automático
  const { title, content, user_id, category_id, author_id } = body
  
  if (!title || !content || !user_id || !category_id || !author_id) {
    return res.status(400).json({ ok: false, error: 'Faltan campos requeridos' })
  }

  try {
    // El modelo se encarga de poner "pending_approval" y la fecha
    const post = await postsModel.createPost({ title, content, user_id, category_id, author_id })
    return res.status(201).json({ ok: true, post })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ ok: false, error: 'Error al crear el post' })
  }
}

// --- ESTA ES LA FUNCIÓN QUE FALTABA ---
export const updatePost = async (req, res) => {
  const { id } = req.params
  const dataToUpdate = req.body

  // Verificamos que el body no esté vacío
  if (!dataToUpdate || Object.keys(dataToUpdate).length === 0) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Debe enviar al menos un campo para actualizar' 
    })
  }

  try {
    // Enviamos el ID y el objeto completo al modelo dinámico
    const post = await postsModel.updatePost(id, dataToUpdate)
    
    if (!post) {
      return res.status(404).json({ ok: false, error: 'Post no encontrado' })
    }

    return res.status(200).json({ 
      ok: true, 
      message: 'Post actualizado con éxito', 
      post 
    })
  } catch (error) {
    console.error("Error en updatePost:", error)
    return res.status(500).json({ ok: false, error: 'Error al actualizar el post' })
  }
}

export const updatePostStatus = async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  try {
    const post = await postsModel.updatePost(id, { status })

    if (!post) {
      return res.status(404).json({ ok: false, error: 'Post no encontrado' })
    }

    return res.status(200).json({
      ok: true,
      message: 'Estatus del post actualizado con éxito',
      post,
    })
  } catch (error) {
    console.error('Error en updatePostStatus:', error)
    return res.status(500).json({ ok: false, error: 'Error al actualizar el estatus del post' })
  }
}

export const getPosts = async (req, res) => {
  try {
    const posts = await postsModel.getAllPosts()
    return res.status(200).json({ ok: true, posts })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ ok: false, error: 'Error al obtener posts' })
  }
}

export const getPostById = async (req, res) => {
  const { id } = req.params
  try {
    const post = await postsModel.getPostById(id)
    if (!post) return res.status(404).json({ ok: false, error: 'Post no encontrado' })
    return res.status(200).json({ ok: true, post })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ ok: false, error: 'Error al obtener el post' })
  }
}

export const deletePost = async (req, res) => {
  const { id } = req.params
  try {
    const post = await postsModel.deletePost(id)
    if (!post) return res.status(404).json({ ok: false, error: 'Post no encontrado' })
    return res.status(200).json({ ok: true, message: 'Post eliminado', post })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ ok: false, error: 'Error al eliminar el post' })
  }
}
