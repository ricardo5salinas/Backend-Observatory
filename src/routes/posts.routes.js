import { Router } from 'express';
import {
  createPost,
  getPosts,
  getPostById,
  deletePost,
  updatePost,
  updatePostStatus,
} from '../controllers/posts.controllers.js'
import { validate } from '../middlewares/validate.middleware.js'
import { postCreateSchema, postStatusUpdateSchema, postUpdateSchema } from '../schemas/posts.schema.js'

const router = Router();

router.post('/posts', validate(postCreateSchema), createPost);
router.get('/posts', getPosts);
router.get('/posts/:id', getPostById);
router.put('/posts/:id', validate(postUpdateSchema), updatePost);
router.patch('/posts/:id', validate(postUpdateSchema), updatePost);
router.delete('/posts/:id', deletePost);

// Obtener todos los posts
router.get('/posts', getPosts)

// Obtener un post por ID
router.get('/posts/:id', getPostById)

// 2. EDITAR POST (Ruta PUT)
// Usamos el id por parámetro y validamos con el esquema de actualización
router.put('/posts/:id', validate(postUpdateSchema), updatePost)

// Cambiar solo el estatus del post
router.patch('/posts/:id/status', validate(postStatusUpdateSchema), updatePostStatus)

// Eliminar post
router.delete('/posts/:id', deletePost)

export default router
