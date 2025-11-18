import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateInstallmentDto {
  paymentReceiptId: number;
  amount: number;
  notes?: string;
  paymentMethod?: string;
  referenceNumber?: string;
}

export interface PaymentInstallment {
  id: number;
  paymentReceiptId: number;
  amount: number;
  paidAt: string;
  notes?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  createdAt: string;
}

class PaymentInstallmentService {
  // إضافة دفعة جزئية جديدة
  async addInstallment(data: CreateInstallmentDto): Promise<{ installment: PaymentInstallment; message: string }> {
    try {
      console.log('إضافة دفعة جزئية:', data);

      // التحقق من وجود إيصال الدفع
      const paymentReceipt = await prisma.supplierPaymentReceipt.findUnique({
        where: { id: data.paymentReceiptId },
        include: {
          installments: true
        }
      });

      if (!paymentReceipt) {
        throw new Error('إيصال الدفع غير موجود');
      }

      // حساب المبلغ المدفوع حتى الآن
      const totalPaid = paymentReceipt.installments.reduce(
        (sum, inst) => sum + Number(inst.amount), 
        0
      );

      // التحقق من أن المبلغ الجديد لا يتجاوز المبلغ المتبقي
      const remainingAmount = Number(paymentReceipt.amount) - totalPaid;
      if (Number(data.amount) > remainingAmount) {
        throw new Error(`المبلغ المدخل (${data.amount}) يتجاوز المبلغ المتبقي (${remainingAmount})`);
      }

      // إنشاء الدفعة الجزئية
      const installment = await prisma.paymentReceiptInstallment.create({
        data: {
          paymentReceiptId: data.paymentReceiptId,
          amount: new Prisma.Decimal(data.amount),
          notes: data.notes,
          paymentMethod: data.paymentMethod,
          referenceNumber: data.referenceNumber,
          paidAt: new Date()
        }
      });

      // حساب المبلغ المدفوع الجديد
      const newTotalPaid = totalPaid + Number(data.amount);

      // تحديث حالة إيصال الدفع إذا تم السداد بالكامل
      if (newTotalPaid >= Number(paymentReceipt.amount)) {
        await prisma.supplierPaymentReceipt.update({
          where: { id: data.paymentReceiptId },
          data: { 
            status: 'PAID',
            paidAt: new Date()
          }
        });
      }

      return {
        installment: {
          id: installment.id,
          paymentReceiptId: installment.paymentReceiptId,
          amount: Number(installment.amount),
          paidAt: installment.paidAt.toISOString(),
          notes: installment.notes || undefined,
          paymentMethod: installment.paymentMethod || undefined,
          referenceNumber: installment.referenceNumber || undefined,
          createdAt: installment.createdAt.toISOString()
        },
        message: 'تم إضافة الدفعة بنجاح'
      };
    } catch (error) {
      console.error('خطأ في إضافة الدفعة الجزئية:', error);
      throw error;
    }
  }

  // الحصول على دفعات إيصال معين
  async getInstallmentsByReceiptId(paymentReceiptId: number): Promise<PaymentInstallment[]> {
    try {
      const installments = await prisma.paymentReceiptInstallment.findMany({
        where: { paymentReceiptId },
        orderBy: { paidAt: 'desc' }
      });

      return installments.map(inst => ({
        id: inst.id,
        paymentReceiptId: inst.paymentReceiptId,
        amount: Number(inst.amount),
        paidAt: inst.paidAt.toISOString(),
        notes: inst.notes || undefined,
        paymentMethod: inst.paymentMethod || undefined,
        referenceNumber: inst.referenceNumber || undefined,
        createdAt: inst.createdAt.toISOString()
      }));
    } catch (error) {
      console.error('خطأ في جلب الدفعات الجزئية:', error);
      throw error;
    }
  }

  // حذف دفعة جزئية
  async deleteInstallment(id: number): Promise<void> {
    try {
      // الحصول على الدفعة قبل الحذف
      const installment = await prisma.paymentReceiptInstallment.findUnique({
        where: { id },
        include: {
          paymentReceipt: {
            include: {
              installments: true
            }
          }
        }
      });

      if (!installment) {
        throw new Error('الدفعة غير موجودة');
      }

      // حذف الدفعة
      await prisma.paymentReceiptInstallment.delete({
        where: { id }
      });

      // حساب المبلغ المدفوع بعد الحذف
      const remainingInstallments = installment.paymentReceipt.installments.filter(
        inst => inst.id !== id
      );
      const totalPaid = remainingInstallments.reduce(
        (sum, inst) => sum + Number(inst.amount), 
        0
      );

      // تحديث حالة إيصال الدفع
      const receiptAmount = Number(installment.paymentReceipt.amount);
      const newStatus = totalPaid >= receiptAmount ? 'PAID' : 'PENDING';

      await prisma.supplierPaymentReceipt.update({
        where: { id: installment.paymentReceiptId },
        data: { 
          status: newStatus,
          paidAt: newStatus === 'PAID' ? new Date() : null
        }
      });

    } catch (error) {
      console.error('خطأ في حذف الدفعة الجزئية:', error);
      throw error;
    }
  }
}

export default new PaymentInstallmentService();
