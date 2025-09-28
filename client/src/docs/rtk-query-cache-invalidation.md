# RTK Query Cache Invalidation في شاشة المستخدمين

## 🎯 نظرة عامة

RTK Query يوفر ميزة قوية جداً اسمها **Cache Invalidation** التي تجعل تحديث البيانات تلقائياً بعد أي عملية (إضافة، تعديل، أو حذف) بدون الحاجة لـ manual refetch.

## 🔧 كيف يعمل Cache Invalidation

### 1. **Cache Tags**

```typescript
export const usersApi = createApi({
  reducerPath: "usersApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ["Users", "User", "UserStats"], // أنواع الـ tags
  // ...
});
```

### 2. **Provides Tags (توفير البيانات)**

```typescript
// قائمة المستخدمين
getUsers: builder.query<UsersResponse, GetUsersQuery>({
  query: (params = {}) => {
    // ... query logic
  },
  providesTags: (result) => [
    'Users', // General users list tag
    ...(result?.data?.users?.map(({ id }) => ({ type: 'User' as const, id })) || []), // Individual user tags
  ],
}),

// مستخدم واحد
getUser: builder.query<UserResponse, string>({
  query: (id) => `/users/users/${id}`,
  providesTags: (result, error, id) => [
    { type: 'User', id }, // Specific user tag
    'Users', // Also invalidate users list
  ],
}),

// إحصائيات المستخدمين
getUserStats: builder.query<CompanyStats, void>({
  query: () => "/users/users/stats",
  providesTags: ['UserStats'], // Cache stats
  transformResponse: (response: CompanyStatsResponse) => response.data,
}),
```

### 3. **Invalidates Tags (إبطال الكاش)**

```typescript
// إنشاء مستخدم جديد
createUser: builder.mutation<UserResponse, CreateUserRequest>({
  query: (userData) => ({
    url: "/users/users",
    method: "POST",
    body: userData,
  }),
  invalidatesTags: ['Users', 'UserStats'], // إبطال قائمة المستخدمين والإحصائيات
}),

// تحديث مستخدم
updateUser: builder.mutation<UserResponse, { id: string; userData: UpdateUserRequest }>({
  query: ({ id, userData }) => ({
    url: `/users/users/${id}`,
    method: "PUT",
    body: userData,
  }),
  invalidatesTags: (result, error, { id }) => [
    { type: 'User', id }, // إبطال المستخدم المحدد
    'Users', // إبطال قائمة المستخدمين
    'UserStats', // إبطال الإحصائيات
  ],
}),

// حذف مستخدم
deleteUser: builder.mutation<{ success: boolean; message: string }, string>({
  query: (id) => ({
    url: `/users/users/${id}`,
    method: "DELETE",
  }),
  invalidatesTags: (result, error, id) => [
    { type: 'User', id }, // إبطال المستخدم المحدد
    'Users', // إبطال قائمة المستخدمين
    'UserStats', // إبطال الإحصائيات
  ],
}),
```

### 4. **Optimistic Updates (التحديثات المتفائلة)**

```typescript
// إنشاء مستخدم جديد مع optimistic update
createUser: builder.mutation<UserResponse, CreateUserRequest>({
  query: (userData) => ({
    url: "/users/users",
    method: "POST",
    body: userData,
  }),
  invalidatesTags: ['Users', 'UserStats'],
  async onQueryStarted(arg, { dispatch, queryFulfilled }) {
    try {
      const { data } = await queryFulfilled;
      // إبطال الكاش فوراً بعد نجاح العملية
      dispatch(usersApi.util.invalidateTags(['Users', 'UserStats']));
    } catch (error) {
      // معالجة الأخطاء
    }
  },
}),
```

## 🚀 الفوائد

### 1. **تحديث تلقائي**
- ✅ البيانات تتحدث تلقائياً بعد أي عملية
- ✅ لا حاجة لـ manual refetch
- ✅ تجربة مستخدم سلسة

### 2. **أداء محسن**
- ✅ كاش ذكي (60 ثانية)
- ✅ تحديثات محددة فقط
- ✅ تقليل الطلبات غير الضرورية

### 3. **كود نظيف**
- ✅ لا حاجة لـ useEffect معقد
- ✅ لا حاجة لـ local state
- ✅ منطق بسيط وواضح

## 📊 مثال عملي

```typescript
// في المكون
const { data: usersData, isLoading } = useGetUsersQuery({
  page: currentPage,
  limit: 10,
  search: searchTerm,
  role: currentFilter === 'all' ? undefined : currentFilter,
});

const [createUser] = useCreateUserMutation();
const [updateUser] = useUpdateUserMutation();
const [deleteUser] = useDeleteUserMutation();

// عند إضافة مستخدم
const handleAddUser = async (userData) => {
  try {
    await createUser(userData).unwrap();
    // البيانات ستتحدث تلقائياً بسبب invalidatesTags
    toast.success('تم إضافة المستخدم بنجاح');
  } catch (error) {
    toast.error('خطأ في إضافة المستخدم');
  }
};

// عند تحديث مستخدم
const handleUpdateUser = async (id, userData) => {
  try {
    await updateUser({ id, userData }).unwrap();
    // البيانات ستتحدث تلقائياً بسبب invalidatesTags
    toast.success('تم تحديث المستخدم بنجاح');
  } catch (error) {
    toast.error('خطأ في تحديث المستخدم');
  }
};

// عند حذف مستخدم
const handleDeleteUser = async (id) => {
  try {
    await deleteUser(id).unwrap();
    // البيانات ستتحدث تلقائياً بسبب invalidatesTags
    toast.success('تم حذف المستخدم بنجاح');
  } catch (error) {
    toast.error('خطأ في حذف المستخدم');
  }
};
```

## 🎯 النتيجة

مع RTK Query Cache Invalidation:
- ✅ **تحديث فوري** للبيانات بعد العمليات
- ✅ **أداء محسن** مع كاش ذكي
- ✅ **كود بسيط** بدون تعقيد
- ✅ **تجربة مستخدم ممتازة**
- ✅ **لا حاجة لـ manual refetch**

هذه هي قوة RTK Query! 🚀
