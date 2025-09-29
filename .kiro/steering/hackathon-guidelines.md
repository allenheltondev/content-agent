---
inclusion: manual
---

# Hackathon Development Guidelines

## Development Philosophy

### Core Principles
- **Simplicity over complexity** - Choose the straightforward solution
- **Intuitive variable names** - Code should read like plain English
- **REST conventions** - Use standard HTTP methods and resource patterns
- **Intuitive UX** - Users should understand without instructions

### Speed vs Quality Balance
- **Prioritize working features** over perfect architecture
- **Use established patterns** from existing codebase
- **Keep it simple** - avoid over-engineering
- **Focus on core user experience** first

### MVP Approach
1. **Authentication** - Get users logged in
2. **Basic Editor** - Create and edit posts
3. **Suggestion Display** - Show AI suggestions
4. **Accept/Reject Flow** - Core interaction
5. **Polish** - Improve UX and handle edge cases

## Quick Implementation Strategies

### Use Proven Libraries
- **React Query** for API state management (handles caching, loading, errors)
- **Headless UI** for accessible components without custom styling
- **React Hook Form** for form handling with minimal code
- **AWS Amplify Auth** for Cognito integration

### Copy-Paste Friendly Patterns

#### API Service Template
```javascript
class BlogApi {
  constructor(getAuthToken) {
    this.getAuthToken = getAuthToken;
    this.apiUrl = process.env.REACT_APP_API_URL;
  }

  async makeRequest(endpoint, options = {}) {
    const authToken = await this.getAuthToken();
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  }

  // REST endpoints with intuitive names
  getPosts = () => this.makeRequest('/posts');
  getPost = (postId) => this.makeRequest(`/posts/${postId}`);
  createPost = (postData) => this.makeRequest('/posts', { method: 'POST', body: JSON.stringify(postData) });
  updatePost = (postId, postData) => this.makeRequest(`/posts/${postId}`, { method: 'PUT', body: JSON.stringify(postData) });
}
```

#### React Query Hook Template
```javascript
export const usePost = (postId) => {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: () => apiService.getPost(postId),
    enabled: !!postId,
  });
};
```

### Rapid Prototyping Tips

#### Start with Static Data
- Use mock data for initial development
- Build UI components before API integration
- Test user interactions with fake suggestions

#### Progressive Enhancement
1. Static layout and navigation
2. Basic CRUD operations
3. Add suggestion highlighting
4. Implement accept/reject logic
5. Add real-time features

#### Defer Complex Features
- Advanced error handling
- Offline support
- Performance optimizations
- Comprehensive testing
- Advanced animations

## Time-Saving Shortcuts

### Styling Shortcuts
```javascript
// Use Tailwind component classes for consistency
const buttonClasses = "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600";
const inputClasses = "w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500";
```

### State Management Shortcuts
```javascript
// Simple context for global state
const AppContext = createContext();
export const useApp = () => useContext(AppContext);

// Local storage helpers
const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};
```

### Error Handling Shortcuts
```javascript
// Simple error boundary
const ErrorFallback = ({ error }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded">
    <h2 className="text-red-800">Something went wrong</h2>
    <p className="text-red-600">{error.message}</p>
  </div>
);

// Toast notifications
const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  return { toasts, addToast };
};
```

## Debugging Strategies

### Quick Debug Tools
```javascript
// Debug component props
const DebugProps = ({ data }) => (
  <pre className="bg-gray-100 p-2 text-xs overflow-auto">
    {JSON.stringify(data, null, 2)}
  </pre>
);

// Console logging with context
const log = (message, data) => {
  console.log(`[${new Date().toISOString()}] ${message}`, data);
};
```

### Common Issues and Solutions

#### CORS Issues
- Ensure API Gateway has proper CORS configuration
- Check that preflight requests are handled
- Verify headers match between frontend and backend

#### Authentication Issues
- Check token expiration and refresh logic
- Verify Cognito configuration matches frontend
- Test with browser dev tools network tab

#### Suggestion Highlighting Issues
- Validate offset calculations with console logs
- Test with simple text before complex content
- Check for text encoding issues

## Demo Preparation

### Essential Features for Demo
1. **Login flow** - Show authentication working
2. **Create post** - Demonstrate basic functionality
3. **Show suggestions** - Display AI recommendations
4. **Accept suggestion** - Show the core interaction
5. **Save and status** - Complete the workflow

### Demo Script Template
1. "Here's our blog writing assistant..."
2. "I'll log in with my author account..."
3. "Let me create a new blog post..."
4. "The AI has analyzed my content and suggests improvements..."
5. "I can accept this suggestion with one click..."
6. "The change is applied immediately..."
7. "When I'm done, I can finalize the draft..."

### Backup Plans
- Have screenshots ready if live demo fails
- Prepare sample content that generates good suggestions
- Test the demo flow multiple times
- Have a simple fallback version ready
