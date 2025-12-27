import { Router } from 'express';
import { ProductGroupController } from '../controllers/ProductGroupController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const controller = new ProductGroupController();

router.get('/', authenticateToken, controller.getProductGroups.bind(controller));
router.get('/products', authenticateToken, controller.getProductsWithGroupStatus.bind(controller));
router.get('/:id', authenticateToken, controller.getProductGroupById.bind(controller));
router.post('/', authenticateToken, controller.createProductGroup.bind(controller));
router.put('/:id', authenticateToken, controller.updateProductGroup.bind(controller));
router.delete('/:id', authenticateToken, controller.deleteProductGroup.bind(controller));
router.post('/:id/assign-products', authenticateToken, controller.assignProductsToGroup.bind(controller));
router.post('/remove-products', authenticateToken, controller.removeProductsFromGroup.bind(controller));

export default router;
