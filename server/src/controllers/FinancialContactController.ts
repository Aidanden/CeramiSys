import { Request, Response } from 'express';
import financialContactService from '../services/financialContact.service';

class FinancialContactController {
    async getAll(req: Request, res: Response) {
        try {
            const contacts = await financialContactService.getAllContacts();
            res.json(contacts);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            const contact = await financialContactService.getContactById(id);
            res.json(contact);
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const contact = await financialContactService.createContact(req.body);
            res.status(201).json(contact);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            const contact = await financialContactService.updateContact(id, req.body);
            res.json(contact);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async getStatement(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            const { startDate, endDate } = req.query;
            const statement = await financialContactService.getStatement(
                id,
                startDate ? new Date(startDate as string) : undefined,
                endDate ? new Date(endDate as string) : undefined
            );
            res.json(statement);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}

export default new FinancialContactController();
