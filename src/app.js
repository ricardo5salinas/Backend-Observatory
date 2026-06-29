import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import userRoutes from './routes/users.routes.js';
import postsRoutes from './routes/posts.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import authorsRoutes from './routes/authors.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import academicRoutes from './routes/academic.routes.js';

const app = express();

const whiteList = [
  'https://69854eaa7b59a6000863d342--serene-douhua-3515f7.netlify.app',
  'https://serene-douhua-3515f7.netlify.app',
  'https://sitio-web-observatorio.netlify.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

const allowedNetlifyHosts = [
  'serene-douhua-3515f7.netlify.app',
];

const isAllowedLocalDevelopment = (origin) => {
  try {
    const url = new URL(origin);
    return ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch (error) {
    return false;
  }
};

const isAllowedNetlifyPreview = (origin) => {
  try {
    const url = new URL(origin);
    return allowedNetlifyHosts.some(host => (
      url.hostname === host || url.hostname.endsWith(`--${host}`)
    ));
  } catch (error) {
    return false;
  }
};

const corsOptions = {
  origin: function (origin, callback) {
    if (
      !origin ||
      whiteList.indexOf(origin) !== -1 ||
      isAllowedLocalDevelopment(origin) ||
      isAllowedNetlifyPreview(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());

app.use((err, req, res, next) => {
  if (err && (err instanceof SyntaxError || err.type === 'entity.parse.failed')) {
    return res.status(400).json({ ok: false, error: 'JSON inválido en el cuerpo de la petición' });
  }
  return next(err);
});

app.use(userRoutes);
app.use(postsRoutes);
app.use(documentsRoutes);
app.use(projectsRoutes);
app.use(authorsRoutes);
app.use(dashboardRoutes);
app.use(academicRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, error: 'Error interno del servidor' });
});

export default app;
