import { Response } from 'express';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const responseHelper = {
  // استجابة ناجحة
  success: <T>(res: Response, data: T, message: string = 'تمت العملية بنجاح', statusCode: number = 200): Response => {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data
    };
    return res.status(statusCode).json(response);
  },

  // استجابة خطأ
  error: (res: Response, message: string = 'حدث خطأ', statusCode: number = 500, errors?: any[]): Response => {
    const response: ApiResponse = {
      success: false,
      message,
      ...(errors && { errors })
    };
    return res.status(statusCode).json(response);
  },

  // أخطاء التحقق من صحة البيانات
  validationError: (res: Response, errors: any[], message: string = 'أخطاء في البيانات المدخلة'): Response => {
    const response: ApiResponse = {
      success: false,
      message,
      errors
    };
    return res.status(400).json(response);
  },

  // استجابة بدون بيانات (مثل الحذف)
  noContent: (res: Response, message: string = 'تمت العملية بنجاح'): Response => {
    const response: ApiResponse = {
      success: true,
      message
    };
    return res.status(200).json(response);
  },

  // استجابة مع ترقيم الصفحات
  paginated: <T>(
    res: Response, 
    data: T[], 
    pagination: { total: number; page: number; limit: number; pages: number },
    message: string = 'تم الحصول على البيانات بنجاح'
  ): Response => {
    const response: ApiResponse<T[]> = {
      success: true,
      message,
      data,
      pagination
    };
    return res.status(200).json(response);
  }
};
