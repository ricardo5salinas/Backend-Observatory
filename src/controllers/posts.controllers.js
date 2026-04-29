import * as postsModel from '../models/posts.models.js';

export const createPost = async (req, res) => {
  const body = req.body || {};

  if (!body.title || !body.content) {
    return res.status(400).json({ ok: false, error: 'Titulo y contenido son requeridos' });
  }

  try {
    const post = await postsModel.createPost(body);
    return res.status(201).json({ ok: true, post });
  } catch (error) {
    console.error('Error en createPost:', error);

    if (error && error.code === '23503') {
      return res.status(400).json({ ok: false, error: 'El usuario, autor o categoria no existe' });
    }

    if (error && error.code === '23502') {
      return res.status(400).json({ ok: false, error: 'Faltan campos requeridos para crear el post' });
    }

    return res.status(500).json({ ok: false, error: 'Error al crear el post' });
  }
};

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
    const posts = await postsModel.getAllPosts();
    return res.status(200).json({ ok: true, posts });
  } catch (error) {
    console.error('Error en getPosts:', error);
    return res.status(500).json({ ok: false, error: 'Error al obtener posts' });
  }
};

export const getPostById = async (req, res) => {
  const { id } = req.params;

  try {
    const post = await postsModel.getPostById(id);
    if (!post) return res.status(404).json({ ok: false, error: 'Post no encontrado' });
    return res.status(200).json({ ok: true, post });
  } catch (error) {
    console.error('Error en getPostById:', error);
    return res.status(500).json({ ok: false, error: 'Error al obtener el post' });
  }
};

export const updatePost = async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  if (Object.keys(body).length === 0) {
    return res.status(400).json({ ok: false, error: 'Debe enviar al menos un campo para actualizar' });
  }

  try {
    const post = await postsModel.updatePost(id, body);
    if (!post) return res.status(404).json({ ok: false, error: 'Post no encontrado' });
    return res.status(200).json({ ok: true, post });
  } catch (error) {
    console.error('Error en updatePost:', error);

    if (error && error.code === '23503') {
      return res.status(400).json({ ok: false, error: 'El usuario, autor o categoria no existe' });
    }

    if (error && error.code === '23502') {
      return res.status(400).json({ ok: false, error: 'No se puede dejar vacio un campo requerido' });
    }

    return res.status(500).json({ ok: false, error: 'Error al actualizar el post' });
  }
};

export const deletePost = async (req, res) => {
  const { id } = req.params;

  try {
    const post = await postsModel.deletePost(id);
    if (!post) return res.status(404).json({ ok: false, error: 'Post no encontrado' });
    return res.status(200).json({ ok: true, message: 'Post eliminado', post });
  } catch (error) {
    console.error('Error en deletePost:', error);
    return res.status(500).json({ ok: false, error: 'Error al eliminar el post' });
  }
}
