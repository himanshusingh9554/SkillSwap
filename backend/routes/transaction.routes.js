import { Router } from 'express';
import { initiateTransaction ,
     acceptTransaction, 
    completeTransaction,
    cancelTransaction,
    getMyTransactions
} from '../controllers/transaction.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyJWT);

router.route('/initiate').post(initiateTransaction);
router.route('/accept/:transactionId').patch(acceptTransaction);
router.route('/complete/:transactionId').patch(completeTransaction);
router.route('/cancel/:transactionId').patch(cancelTransaction);
router.route('/my-transactions').get(getMyTransactions); 

export default router;