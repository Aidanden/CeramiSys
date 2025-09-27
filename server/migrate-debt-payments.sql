-- Add new columns to Debts table
ALTER TABLE "Debts" ADD COLUMN "PaidAmount" DECIMAL(18,4) DEFAULT 0;
ALTER TABLE "Debts" ADD COLUMN "RemainingAmount" DECIMAL(18,4);

-- Update existing debts to set RemainingAmount = Amount
UPDATE "Debts" SET "RemainingAmount" = "Amount" WHERE "RemainingAmount" IS NULL;

-- Make RemainingAmount NOT NULL
ALTER TABLE "Debts" ALTER COLUMN "RemainingAmount" SET NOT NULL;

-- Update Status enum to include PARTIAL
-- Note: This might need manual adjustment based on your database

-- Create DebtPayments table
CREATE TABLE "DebtPayments" (
    "PaymentID" TEXT NOT NULL,
    "DebtID" TEXT NOT NULL,
    "Amount" DECIMAL(18,4) NOT NULL,
    "PaymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "PaymentType" TEXT NOT NULL,
    "Description" TEXT,
    "UserID" TEXT NOT NULL,
    "Exist" BOOLEAN NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebtPayments_pkey" PRIMARY KEY ("PaymentID")
);

-- Add foreign key constraints
ALTER TABLE "DebtPayments" ADD CONSTRAINT "DebtPayments_DebtID_fkey" FOREIGN KEY ("DebtID") REFERENCES "Debts"("DebtID") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DebtPayments" ADD CONSTRAINT "DebtPayments_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;
