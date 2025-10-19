import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Increase chunk size warning limit to 1MB
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better optimization
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'aws-vendor': ['aws-amplify', 'aws-amplify/auth'],

          // UI library chunks
          'ui-components': [
            './src/components/common/AppHeader.tsx',
            './src/components/common/LoadingSpinner.tsx',
            './src/components/common/ErrorDisplay.tsx',
            './src/components/common/LoadingState.tsx'
          ],

          // Editor-specific chunks (heavy components)
          'editor': [
            './src/components/editor/ContentEditorWithSuggestions.tsx',
            './src/components/editor/SuggestionsPanel.tsx',
            './src/components/editor/SuggestionHighlightOverlay.tsx'
          ],

          // Dashboard chunks
          'dashboard': [
            './src/components/dashboard/PostList.tsx',
            './src/components/dashboard/StatsOverview.tsx'
          ],

          // Profile chunks
          'profile': [
            './src/components/profile/ProfileErrorBoundary.tsx',
            './src/components/profile/ProfileErrorDisplay.tsx'
          ],

          // Services and utilities
          'services': [
            './src/services/ApiService.ts',
            './src/services/review-service.ts'
          ],

          // Utils
          'utils': [
            './src/utils/accessibility.ts',
            './src/utils/apiErrorHandler.ts'
          ]
        }
      }
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'aws-amplify',
      'aws-amplify/auth'
    ]
  }
})
