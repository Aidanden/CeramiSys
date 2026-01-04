import { Request, Response } from 'express';
import generalReceiptService from '../services/generalReceipt.service';
import { TransactionType } from '@prisma/client';

class GeneralReceiptController {
    async getAll(req: Request, res: Response) {
        try {
            const { contactId, customerId, supplierId, employeeId, treasuryId, startDate, endDate, type } = req.query;
            const receipts = await generalReceiptService.getAllReceipts({
                contactId: contactId ? parseInt(contactId as string) : undefined,
                customerId: customerId ? parseInt(customerId as string) : undefined,
                supplierId: supplierId ? parseInt(supplierId as string) : undefined,
                employeeId: employeeId ? parseInt(employeeId as string) : undefined,
                treasuryId: treasuryId ? parseInt(treasuryId as string) : undefined,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                type: type as TransactionType,
            });
            res.json(receipts);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id || '0');
            const receipt = await generalReceiptService.getReceiptById(id);
            if (!receipt) {
                res.status(404).json({ error: 'الإيصال غير موجود' });
                return;
            }
            res.json(receipt);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const receipt = await generalReceiptService.createReceipt({
                ...req.body,
                createdBy: req.user?.userId // Assuming req.user exists from auth middleware
            });
            res.status(201).json(receipt);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}

export default new GeneralReceiptController();
