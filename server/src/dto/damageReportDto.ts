export interface CreateDamageReportLineDto {
  productId: number;
  quantity: number;
  notes?: string;
}

export interface CreateDamageReportDto {
  companyId?: number; // للـ Admin فقط - لتحديد الشركة
  reason: string;
  notes?: string;
  lines: CreateDamageReportLineDto[];
}

export interface GetDamageReportsQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  companyId?: number;
  startDate?: string;
  endDate?: string;
  productName?: string;
  productCode?: string;
  reason?: string;
}

export interface DamageReportLineResponseDto {
  id: number;
  productId: number;
  product: {
    id: number;
    sku: string;
    name: string;
    unit: string | null;
    unitsPerBox: number | null;
  };
  quantity: number;
  notes: string | null;
  createdAt: Date;
}

export interface DamageReportResponseDto {
  id: number;
  reportNumber: string;
  companyId: number;
  company: {
    id: number;
    name: string;
    code: string;
  };
  createdByUserId: string;
  createdBy: {
    UserID: string;
    FullName: string;
    UserName: string;
  };
  reason: string;
  notes: string | null;
  status: string;
  lines: DamageReportLineResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DamageReportStatsDto {
  totalReports: number;
  pendingReports: number;
  approvedReports: number;
  rejectedReports: number;
  totalDamagedQuantity: number;
  totalDamagedBoxes: number;
  totalDamagedPieces: number;
  totalDamagedBags: number;
  totalDamagedLiters: number;
  reportsPerCompany: {
    companyId: number;
    companyName: string;
    companyCode: string;
    totalReports: number;
  }[];
}
