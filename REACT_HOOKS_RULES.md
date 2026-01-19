# ⚛️ React Hooks Rules - Common Errors & Fixes

## 🚨 **Error: "Rendered more hooks than during the previous render"**

### **What This Error Means**

React tracks the order of hooks calls between renders. If the number or order of hooks changes, React throws this error.

**Example of BROKEN code:**
```typescript
function MyComponent() {
  const [state, setState] = useState()  // Hook 1
  
  if (someCondition) {
    return <Loading />  // Early return!
  }
  
  const data = useMemo(() => {...})  // Hook 2 - Sometimes called, sometimes not!
  
  return <Content />
}
```

**Why it breaks:**
- **First render (someCondition = true)**: Only 1 hook called (useState)
- **Second render (someCondition = false)**: 2 hooks called (useState + useMemo)
- **React error:** "Rendered more hooks than during the previous render"

---

## ✅ **Solution: Move All Hooks BEFORE Early Returns**

### **Rule:**
**ALL hooks must be called at the top level of the component, BEFORE any conditional returns.**

**FIXED code:**
```typescript
function MyComponent() {
  const [state, setState] = useState()  // Hook 1
  const data = useMemo(() => {          // Hook 2 - ALWAYS called
    if (!someData) return null
    return {...}
  }, [dependencies])
  
  if (someCondition) {
    return <Loading />  // Early return is OK now
  }
  
  return <Content />
}
```

---

## 🐛 **Case Study: Catalog Edit Page Error**

### **The Bug**

**File:** `src/app/(dashboard)/catalogs/[id]/edit/page.tsx`

**Broken Code:**
```typescript
export default function EditCatalogPage({ params }) {
  const router = useRouter()              // Hook 1
  const { data: products } = useQuery()   // Hook 2
  const { data: catalog } = useQuery()    // Hook 3
  const updateMutation = useMutation()    // Hook 4
  
  // Early returns (sometimes called)
  if (isLoading) return <Loading />
  if (!catalog) return <NotFound />
  
  // Hook 5 - Only called AFTER early returns pass
  const initialData = useMemo(() => ({
    name: catalog.name,
    // ...
  }), [catalog.id])
  
  return <CatalogForm initialData={initialData} />
}
```

**Why it failed:**
1. **First render (loading)**: 4 hooks called → Early return at `<Loading />`
2. **Second render (loaded)**: 5 hooks called (useMemo added)
3. **React error:** Hook count changed!

---

### **The Fix**

**Fixed Code:**
```typescript
export default function EditCatalogPage({ params }) {
  const router = useRouter()              // Hook 1
  const { data: products } = useQuery()   // Hook 2
  const { data: catalog } = useQuery()    // Hook 3
  const updateMutation = useMutation()    // Hook 4
  
  // Hook 5 - ALWAYS called (before early returns)
  const initialData = useMemo(() => {
    if (!catalog) return null  // Handle null INSIDE useMemo
    
    return {
      name: catalog.name,
      // ...
    }
  }, [catalog?.id])  // Optional chaining for safety
  
  // Early returns AFTER all hooks
  if (isLoading) return <Loading />
  if (!catalog) return <NotFound />
  
  return <CatalogForm initialData={initialData} />
}
```

**Why it works:**
- All 5 hooks are **ALWAYS** called in the same order
- Early returns happen **AFTER** all hooks
- `useMemo` handles `null` catalog internally

---

## 📋 **React Hooks Rules (Official)**

### **Rule 1: Only Call Hooks at the Top Level**

❌ **DON'T** call hooks inside:
- Conditions (`if` statements)
- Loops (`for`, `while`)
- Nested functions

✅ **DO** call hooks at:
- Top level of component function
- Before any early returns
- Before any conditional logic that returns JSX

---

### **Rule 2: Only Call Hooks from React Functions**

✅ Call hooks from:
- React function components
- Custom hooks (functions starting with `use`)

❌ Don't call hooks from:
- Regular JavaScript functions
- Class components
- Event handlers

---

## 🔧 **Common Patterns & Fixes**

### **Pattern 1: Early Return with Loading State**

❌ **WRONG:**
```typescript
function MyComponent() {
  const { data, isLoading } = useQuery()
  
  if (isLoading) return <Loading />
  
  const memoizedData = useMemo(() => data.map(...), [data])  // ❌ After early return
  
  return <Content data={memoizedData} />
}
```

✅ **CORRECT:**
```typescript
function MyComponent() {
  const { data, isLoading } = useQuery()
  const memoizedData = useMemo(() => {
    if (!data) return []  // Handle null inside hook
    return data.map(...)
  }, [data])
  
  if (isLoading) return <Loading />
  
  return <Content data={memoizedData} />
}
```

---

### **Pattern 2: Conditional Hook Based on Props**

❌ **WRONG:**
```typescript
function MyComponent({ showExtra }) {
  const [state1, setState1] = useState()
  
  if (showExtra) {
    const [state2, setState2] = useState()  // ❌ Conditional hook
  }
  
  return <Content />
}
```

✅ **CORRECT:**
```typescript
function MyComponent({ showExtra }) {
  const [state1, setState1] = useState()
  const [state2, setState2] = useState()  // Always called
  
  return (
    <Content>
      {showExtra && <ExtraContent state={state2} />}  {/* Conditional rendering */}
    </Content>
  )
}
```

---

### **Pattern 3: Multiple Early Returns**

❌ **WRONG:**
```typescript
function MyComponent() {
  const { data: user } = useQuery()
  
  if (!user) return <Login />
  
  const { data: posts } = useQuery()  // ❌ After early return
  
  if (!posts) return <Loading />
  
  const sortedPosts = useMemo(() => posts.sort(...), [posts])  // ❌ After early return
  
  return <Content />
}
```

✅ **CORRECT:**
```typescript
function MyComponent() {
  const { data: user } = useQuery()
  const { data: posts } = useQuery({
    enabled: !!user  // Only fetch if user exists
  })
  const sortedPosts = useMemo(() => {
    if (!posts) return []
    return posts.sort(...)
  }, [posts])
  
  if (!user) return <Login />
  if (!posts) return <Loading />
  
  return <Content />
}
```

---

## 🧪 **Testing for Hook Rule Violations**

### **ESLint Rule**

Install and enable the React hooks ESLint plugin:

```bash
npm install eslint-plugin-react-hooks --save-dev
```

**`.eslintrc.json`:**
```json
{
  "extends": ["next/core-web-vitals"],
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

---

### **Manual Checklist**

Before pushing code, check:

- [ ] All `useState`, `useEffect`, `useMemo`, `useCallback` calls are at the top
- [ ] No hooks inside `if` statements
- [ ] No hooks inside loops
- [ ] No hooks after early returns
- [ ] No hooks in event handlers
- [ ] All hooks called in the same order every render

---

## 📚 **Additional Resources**

- [React Hooks Rules (Official Docs)](https://react.dev/reference/rules/rules-of-hooks)
- [ESLint Plugin: react-hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks)
- [Common React Hooks Mistakes](https://react.dev/learn#common-mistakes)

---

## 🎯 **Summary**

**Golden Rule:**
> **ALL hooks MUST be called in the SAME ORDER on EVERY render.**

**Best Practice:**
1. Call ALL hooks at the very top of your component
2. Use conditional logic INSIDE hooks, not around them
3. Place early returns AFTER all hook calls
4. Enable ESLint rules to catch violations automatically

**Remember:**
- ✅ Conditional logic inside hooks: `useMemo(() => { if (!data) return null; ... })`
- ❌ Conditional hook calls: `if (condition) { useMemo(...) }`

---

**Last Updated:** 2026-01-18  
**Related Errors:** "Rendered more hooks", "Hooks can only be called inside the body of a function component"
