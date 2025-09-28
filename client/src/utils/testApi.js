// ملف اختبار بسيط للتحقق من الاتصال مع API
const testApiConnection = async () => {
  try {
    console.log('🔍 Testing API connection...');
    
    // اختبار الاتصال الأساسي
    const response = await fetch('http://localhost:8000/api/users/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API connection successful!');
      console.log('📊 Data received:', data);
    } else {
      console.log('❌ API connection failed!');
      console.log('📄 Response text:', await response.text());
    }
  } catch (error) {
    console.error('🚨 Network error:', error);
    console.log('💡 Possible issues:');
    console.log('   - Backend server is not running');
    console.log('   - Wrong API URL (check if it should be http://localhost:3001/api or different port)');
    console.log('   - CORS issues');
    console.log('   - Network connectivity problems');
  }
};

// تشغيل الاختبار
testApiConnection();

// اختبار مع مسارات مختلفة
const testDifferentPaths = async () => {
  const paths = [
    'http://localhost:8000/api/users/users',
    'http://localhost:8000/api/users',
    'http://localhost:3001/api/users/users',
    'http://localhost:3001/api/users',
    '/api/users/users',
    '/api/users'
  ];
  
  console.log('🔍 Testing different API paths...');
  
  for (const path of paths) {
    try {
      console.log(`\n📡 Testing: ${path}`);
      const response = await fetch(path, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        console.log(`✅ ${path} - SUCCESS (${response.status})`);
      } else {
        console.log(`❌ ${path} - FAILED (${response.status})`);
      }
    } catch (error) {
      console.log(`🚨 ${path} - ERROR:`, error.message);
    }
  }
};

// تشغيل اختبار المسارات المختلفة
setTimeout(testDifferentPaths, 2000);
