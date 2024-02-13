import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController.js';

const router = express.Router();

const routerController = (app) => {
  app.use('/', router);

  // App Controller
  router.get('/status', (req, res) => AppController.getStatus(req, res));
  router.get('/stats', (req, res) => AppController.getStats(req, res));

  // User Controller
  router.post('/users', (req, res) => UsersController.postNew(req, res));
};

export default routerController;
