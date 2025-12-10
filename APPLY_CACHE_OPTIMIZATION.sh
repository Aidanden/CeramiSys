#!/bin/bash

# Script لتطبيق تحسينات الـ cache على جميع الـ APIs

echo "🚀 بدء تطبيق تحسينات الأداء..."

# قائمة الملفات التي تحتاج تحديث
APIs=(
  "purchaseApi.ts"
  "interCompanySalesApi.ts"
  "activityApi.ts"
  "reportsApi.ts"
  "provisionalSalesApi.ts"
  "saleReturnsApi.ts"
  "warehouseApi.ts"
  "salePaymentApi.ts"
  "complexInterCompanySalesApi.ts"
)

cd /run/media/shark/033e2f56-34e7-4428-b4ef-bf76d5c4b6fb/CODE/CeramiSys/client/src/state

for api in "${APIs[@]}"; do
  if [ -f "$api" ]; then
    echo "✅ معالجة $api..."
    # سيتم التحديث يدوياً
  else
    echo "⚠️  الملف $api غير موجود"
  fi
done

echo "✅ تم الانتهاء!"
