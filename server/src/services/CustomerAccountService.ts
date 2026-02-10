import { Prisma, CustomerTransactionType, CustomerReferenceType } from '@prisma/client';
import prisma from '../models/prismaClient';

interface CreateCustomerAccountEntryInput {
  customerId: number;
  transactionType: CustomerTransactionType;
  amount: number;
  referenceType: CustomerReferenceType;
  referenceId: number;
  description?: string;
  transactionDate?: Date;
}

class CustomerAccountService {
  /**
   * إنشاء قيد في حساب العميل
   * Create an entry in customer account
   */
  async createAccountEntry(data: CreateCustomerAccountEntryInput, tx?: Prisma.TransactionClient) {
    const { customerId, transactionType, amount, referenceType, referenceId, description, transactionDate } = data;
    const db = tx || prisma;

    // جلب آخر رصيد للعميل
    const lastEntry = await db.customerAccount.findFirst({
      where: { customerId },
      orderBy: { createdAt: 'desc' }
    });

    const previousBalance = lastEntry ? Number(lastEntry.balance) : 0;

    // حساب الرصيد الجديد
    // DEBIT (عليه) = زيادة في الدين على العميل
    // CREDIT (له) = تخفيض من الدين (دفع)
    let newBalance: number;
    if (transactionType === 'DEBIT') {
      newBalance = previousBalance + amount;
    } else {
      newBalance = previousBalance - amount;
    }

    // إنشاء القيد
    const entry = await db.customerAccount.create({
      data: {
        customerId,
        transactionType,
        amount,
        balance: newBalance,
        referenceType,
        referenceId,
        description,
        transactionDate: transactionDate || new Date()
      },
      include: {
        customer: true
      }
    });

    return entry;
  }

  /**
   * جلب حساب عميل معين مع كل المعاملات مع دعم الفلترة بالتاريخ
   * Get customer account with all transactions with date filtering support
   */
  async getCustomerAccount(customerId: number, startDate?: string, endDate?: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      throw new Error('العميل غير موجود');
    }

    // بناء فلتر التاريخ
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      // إضافة يوم واحد لتضمين نهاية اليوم
      const endDateObj = new Date(endDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      dateFilter.lt = endDateObj;
    }

    const whereClause: any = { customerId };
    if (Object.keys(dateFilter).length > 0) {
      whereClause.transactionDate = dateFilter;
    }

    const entries = await prisma.customerAccount.findMany({
      where: whereClause,
      orderBy: { transactionDate: 'desc' },
      include: {
        customer: true
      }
    });

    // --- Self-Healing: Check for missing Approved Returns and add them to ledger ---
    try {
      // 1. Get all approved returns for this customer
      const approvedReturns = await prisma.saleReturn.findMany({
        where: { customerId, status: { in: ['APPROVED', 'RECEIVED_WAREHOUSE'] } }
      });

      if (approvedReturns.length > 0) {
        // 2. Get existing return entries in ledger
        const existingReturnEntries = await prisma.customerAccount.findMany({
          where: {
            customerId,
            referenceType: 'RETURN',
            referenceId: { in: approvedReturns.map(r => r.id) }
          },
          select: { referenceId: true }
        });

        const existingIds = new Set(existingReturnEntries.map(e => e.referenceId));

        // 3. Find missing returns
        const missingReturns = approvedReturns.filter(r => !existingIds.has(r.id));

        // 4. Create missing entries
        if (missingReturns.length > 0) {
          console.log(`[Self-Healing] Found ${missingReturns.length} missing return entries for Customer ${customerId}. Creating them...`);

          for (const ret of missingReturns) {
            if (ret.customerId) {
              await this.createAccountEntry({
                customerId: ret.customerId,
                transactionType: 'CREDIT',
                amount: Number(ret.total),
                referenceType: 'RETURN',
                referenceId: ret.id,
                description: `مردود مبيعات (تصحيح تلقائي) - فاتورة #${ret.id}`,
                transactionDate: ret.createdAt // Use original return date
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("[Self-Healing] Error syncing returns:", error);
    }
    // -------------------------------------------------------------------------------

    // جلب آخر رصيد كلي للعميل (بدون فلترة)
    const lastEntry = await prisma.customerAccount.findFirst({
      where: { customerId },
      orderBy: { createdAt: 'desc' }
    });

    // الرصيد الحالي الكلي = آخر رصيد مسجل
    const currentBalance = Number(lastEntry?.balance || 0);

    // حساب إجمالي الديون (DEBIT) وإجمالي الدفعات (CREDIT)
    const [totalDebit, totalPaymentsSum, totalAllCredit] = await Promise.all([
      prisma.customerAccount.aggregate({
        where: { customerId, transactionType: 'DEBIT' },
        _sum: { amount: true }
      }),
      // إجمالي المدفوعات الفعلية فقط
      prisma.customerAccount.aggregate({
        where: { customerId, transactionType: 'CREDIT', referenceType: 'PAYMENT' },
        _sum: { amount: true }
      }),
      // إجمالي كل الائتمانات (مدفوعات + مردودات + تسويات)
      prisma.customerAccount.aggregate({
        where: { customerId, transactionType: 'CREDIT' },
        _sum: { amount: true }
      })
    ]);

    // جلب إيصالات المردودات المعلقة (التي لم يتم صرفها مالياً بعد ولكنها سجلت على الشركة)
    const pendingReturnReceipts = await prisma.supplierPaymentReceipt.findMany({
      where: {
        customerId,
        type: 'RETURN',
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });

    const pendingReturnsAmount = pendingReturnReceipts.reduce((sum, r) => sum + Number(r.amount), 0);

    const debitAmount = Number(totalDebit._sum.amount || 0);
    const paymentsAmount = Number(totalPaymentsSum._sum.amount || 0);
    const confirmedCreditAmount = Number(totalAllCredit._sum.amount || 0);

    // الإجمالي الدائن يشمل الآن المردودات المعلقة لأن العميل يطالب بها
    const totalCreditAmount = confirmedCreditAmount + pendingReturnsAmount;
    const otherCreditsAmount = totalCreditAmount - paymentsAmount;

    // الرصيد الحالي المعدل (يخصم منه المردودات المعلقة)
    // الرصيد في الداتابيس لا يشمل المعلق، لذا نطرحه منه
    const adjustedCurrentBalance = currentBalance - pendingReturnsAmount;

    console.log(`[DEBUG] Customer Account ID: ${customerId}`);
    console.log(`[DEBUG] Total Debit: ${debitAmount}`);
    console.log(`[DEBUG] Confirmed Credit: ${confirmedCreditAmount}`);
    console.log(`[DEBUG] Pending Returns: ${pendingReturnsAmount}`);
    console.log(`[DEBUG] Total Credit (Adjusted): ${totalCreditAmount}`);
    console.log(`[DEBUG] Current Balance (DB): ${currentBalance}`);
    console.log(`[DEBUG] Current Balance (Adjusted): ${adjustedCurrentBalance}`);

    // تحويل القيود المسجلة
    const mappedEntries = entries.map(entry => ({
      ...entry,
      amount: Number(entry.amount),
      balance: Number(entry.balance)
    }));

    // تحويل المردودات المعلقة إلى قيود عرض
    // نفترض أنها أحدث عمليات، فنضعها في البداية
    const pendingEntries = pendingReturnReceipts.map((r, index) => {
      // الرصيد لهذه العملية الافتراضية
      // بما أنها "فوق" آخر رصيد مسجل، وهي عملية CREDIT (تخفض الرصيد)
      // الرصيد بعدها = الرصيد الفعلي - (مجموع المردودات التي قبلها وهذه المردودات)
      // لكن للتبسيط، سنعرض الرصيد التراكمي من آخر رصيد مسجل نزولاً

      // لنحسبها بشكل بسيط: نعرضها كقائمة في الأعلى.
      // الرصيد الظاهر بجانبها:
      // أول واحد (الأحدث) = adjustedCurrentBalance
      // الذي يليه = adjustedCurrentBalance + amount (لأننا نرجع للوراء باتجاه الرصيد القديم)

      // ولكن هنا لدينا قائمة مفصولة.
      // سنقوم بدمجها في `mappedEntries` لاحقاً إذا أردنا ترتيب دقيق، 
      // لكن بما أن تاريخها `createdAt` موجود، يمكننا دمجها وفرزها.

      return {
        id: -r.id, // ID سالب لتمييزها
        customerId,
        transactionType: 'CREDIT' as const,
        amount: Number(r.amount),
        balance: 0, // سنحسبه بعد الفرز
        referenceType: 'RETURN' as const,
        referenceId: r.saleReturnId || 0,
        description: `مردود مبيعات (معلق) - ${r.description || ''}`,
        transactionDate: r.createdAt,
        createdAt: r.createdAt,
        customer,
        isPending: true // حقل إضافي للتميز في الفرونت إند إذا لزم
      };
    });

    // دمج القائمتين
    const allEntries = [...pendingEntries, ...mappedEntries];

    // إعادة الفرز حسب التاريخ (الأحدث أولاً)
    allEntries.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

    // تحديث الأرصدة (Recalculate running balance for display)
    // هذا معقد قليلاً لأن لدينا رصيد "محفوظ" في القيود القديمة، ورصيد "معدل" للجديدة.
    // الأسهل: نعتمد الرصيد المحفوظ للقيود القديمة، وللقيود الجديدة (المعلقة) نحسب انطلاقاً من آخر رصيد محفوظ.
    // لكن ماذا لو تداخلت التواريخ؟

    // الحل العملي:
    // القيود المأخوذة من DB (`mappedEntries`) تملك `balance` صحيح وقت إنشائها.
    // القيود المعلقة (`pendingEntries`) ليس لها balance.
    // سنقوم فقط بضبط أرصدة القيود المعلقة بناءً على موقعها.
    // لكن إذا كانت المعلقة أحدث شيء (وهذا المتوقع)، فإن:
    // رصيد المعلق 1 (الأحدث) = رصيد المعلق 2 - مبلغ المعلق 1
    // ...
    // رصيد المعلق الأخير (الأقدم بين الجدد) = رصيد آخر قيد فعلي - مبلغ المعلق الأخير

    // انتظر، CREDIT ينقص الرصيد.
    // رصيد (بعد عملية CREDIT) = رصيد (قبل) - مبلغ.
    // إذن: رصيد (قبل) = رصيد (بعد) + مبلغ.

    // لنبدأ من أقدم قيد في المعلقات صعوداً للأحدث.
    // نقطة الارتكاز هي `lastEntry.balance` (وهو رصيد آخر عملية فعلية مثبتة).

    // سنعيد حساب أرصدة المردودات المعلقة فقط، وسنفترض أنها جاءت *بعد* آخر قيد مثبت، لتجنب تعقيد الأرصدة التاريخية.
    // (حتى لو كان تاريخها أقدم قليلاً، المنطق يقول أنها لم تؤثر في الحساب إلا الآن).

    let runningBalance = currentBalance; // نبدأ من رصيد DB

    // نعيد ترتيب المعلقات من الأقدم للأحدث لحساب الرصيد التراكمي
    const pendingSortedAsc = [...pendingEntries].sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());

    const pendingWithBalancesMap = new Map<number, number>(); // ID -> Balance

    for (const entry of pendingSortedAsc) {
      runningBalance = runningBalance - entry.amount; // CREDIT decreases balance
      pendingWithBalancesMap.set(entry.id, runningBalance);
    }

    // تطبيق الأرصدة المحسوبة على القائمة
    const finalEntries = allEntries.map(e => {
      if (e.id < 0 && pendingWithBalancesMap.has(e.id)) {
        return { ...e, balance: pendingWithBalancesMap.get(e.id)! };
      }
      return e;
    });

    return {
      customer,
      entries: finalEntries,
      totalDebit: debitAmount,
      totalCredit: totalCreditAmount,
      totalPayments: paymentsAmount,
      totalReturns: otherCreditsAmount,
      totalOtherCredits: otherCreditsAmount,
      currentBalance: adjustedCurrentBalance
    };
  }

  /**
   * جلب الرصيد الحالي لعميل
   */
  async getCurrentBalance(customerId: number) {
    const lastEntry = await prisma.customerAccount.findFirst({
      where: { customerId },
      orderBy: { createdAt: 'desc' }
    });
    return Number(lastEntry?.balance || 0);
  }

  /**
   * جلب ملخص حسابات جميع العملاء
   */
  async getAllCustomersAccountSummary() {
    const [customers, aggregates] = await Promise.all([
      prisma.customer.findMany(),
      prisma.customerAccount.groupBy({
        by: ['customerId', 'transactionType', 'referenceType'],
        _sum: { amount: true }
      })
    ]);

    // جلب مجموع المردودات المعلقة لكل عميل (RETURN PENDING) لمواءمة منطق getCustomerAccount
    const pendingReturnsAggregates = await prisma.supplierPaymentReceipt.groupBy({
      by: ['customerId'],
      _sum: { amount: true },
      where: {
        customerId: { not: null },
        type: 'RETURN',
        status: 'PENDING'
      }
    });

    const pendingReturnsMap: Record<number, number> = {};
    pendingReturnsAggregates.forEach(agg => {
      if (agg.customerId != null) {
        pendingReturnsMap[agg.customerId] = Number(agg._sum.amount || 0);
      }
    });

    // تحويل التجميعات إلى ماب للبحث السريع
    const statsMap: Record<number, { debit: number; payments: number; otherCredits: number }> = {};

    aggregates.forEach(agg => {
      if (!statsMap[agg.customerId]) {
        statsMap[agg.customerId] = { debit: 0, payments: 0, otherCredits: 0 };
      }

      const stats = statsMap[agg.customerId]!;
      const amount = Number(agg._sum.amount || 0);

      if (agg.transactionType === 'DEBIT') {
        stats.debit += amount;
      } else {
        // CREDIT - Match logic in getCustomerAccount
        // هناك، الـ totalPaymentsSum يحسب فقط referenceType: 'PAYMENT' و 'GENERAL_RECEIPT'
        // والـ totalAllCredit يحسب كل شيء (مدفوعات + مردودات + تسويات + مردودات معلقة)
        if (agg.referenceType === 'PAYMENT' || agg.referenceType === 'GENERAL_RECEIPT') {
          stats.payments += amount;
        } else {
          // مردودات وتعديلات مسجلة في الـ ledger
          stats.otherCredits += amount;
        }
      }
    });

    return customers.map(customer => {
      const stats = statsMap[customer.id] || { debit: 0, payments: 0, otherCredits: 0 };
      const pendingReturnsAmount = pendingReturnsMap[customer.id] || 0;

      // إجمالي الخصومات (مدفوعات + مردودات + تسويات + مردودات معلقة)
      const totalAllCredit = stats.payments + stats.otherCredits + pendingReturnsAmount;
      // إجمالي المردودات/التسويات (مسجلة + معلقة) لمواءمة totalReturns في getCustomerAccount
      const totalReturns = stats.otherCredits + pendingReturnsAmount;
      // الرصيد الصافي (يجب أن يطابق تماماً كشف الحساب بعد المردودات المعلقة)
      const currentBalance = stats.debit - totalAllCredit;

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        totalDebit: stats.debit,          // إجمالي العليه (المسحوبات)
        totalPayments: stats.payments,    // إجمالي المدفوعات (القبض)
        totalReturns: totalReturns,       // إجمالي المردودات / التسويات (له) بما فيها المعلقة
        totalCredit: totalAllCredit,      // إجمالي الخصومات (مدفوعات + مردودات + تسويات + معلقة)
        currentBalance: currentBalance,   // صافي الرصيد بعد المردودات
        remainingDebt: Math.max(0, currentBalance) // المتبقي عليه
      };
    });
  }

  /**
   * جلب الفواتير غير المسددة لعميل معين
   */
  async getCustomerOpenInvoices(customerId: number, startDate?: string, endDate?: string) {
    const where: any = {
      customerId,
      status: 'APPROVED',
      isFullyPaid: false
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        where.createdAt.lt = endDateObj;
      }
    }

    return prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * جلب الفواتير غير المسددة (التي مر عليها وقت) لعميل - للتقارير
   */
  async getOpenInvoices(customerId: number) {
    return this.getCustomerOpenInvoices(customerId);
  }
}

export default new CustomerAccountService();
