import { h } from 'preact';

import { useState } from 'preact/hooks';

interface APIDebugToolProps {
  apiBaseUrl?: string;
}

/**
 * Debug tool to test API connectivity from within the frontend
 * This component can be temporarily added to the app for debugging API issues
 */
export const APIDebugTool = ({ apiBaseUrl = 'http://localhost:3001/api' }: APIDebugToolProps) => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    console.log(message);
    setTestResults(prev => [...prev, message]);
  };

  const testAPI = async () => {
    setIsLoading(true);
    setTestResults([]);
    addLog('🧪 Starting API connectivity test...');

    try {
      // Create all test promises
      const testPromises = [
        fetch(`${apiBaseUrl}/health`).then(async response => ({
          name: 'Health endpoint',
          response,
          data: await response.json()
        })),
        fetch(`${apiBaseUrl}/search?q=New York`).then(async response => ({
          name: 'Search endpoint',
          response,
          data: await response.json()
        })),
        fetch(`${apiBaseUrl}/health`).then(async response => ({
          name: 'Current configuration check',
          response,
          data: await response.json()
        })),
        fetch(`${apiBaseUrl}/debug-config`).then(async response => ({
          name: 'Debug configuration',
          response,
          data: await response.json()
        }))
      ];

      // Run all tests concurrently and wait for all to settle
      const results = await Promise.allSettled(testPromises);

      // Process results
      results.forEach((result, index) => {
        const testNumber = index + 1;
        const testName = ['Health endpoint', 'Search endpoint', 'Current configuration check', 'Debug configuration'][index];
        
        if (result.status === 'fulfilled') {
          const { name, response, data } = result.value;
          addLog(`${testNumber}️⃣ Testing ${testName}...`);
          addLog(`✅ ${name}: ${response.status} ${response.statusText}`);
          
          if (data) {
            if (name === 'Health endpoint') {
              addLog(`📊 Server info: ${JSON.stringify(data)}`);
            } else if (name === 'Search endpoint') {
              addLog(`📍 Found ${Array.isArray(data) ? data.length : 0} locations`);
            } else if (name === 'Debug configuration') {
              addLog(`📋 Expected API_BASE_URL: ${data.expectedFrontendConfig?.API_BASE_URL}`);
              addLog(`🔗 Server base URL: ${data.server?.baseUrl}`);
            }
          }
        } else {
          addLog(`${testNumber}️⃣ Testing ${testName}...`);
          addLog(`❌ ${testName} failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
          
          // Add specific help messages
          if (index === 2) {
            addLog('💡 Try updating API_BASE_URL in .env file or check if server is running');
          }
        }
      });

    } catch (error: unknown) {
      addLog(`❌ Test failed with error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '400px',
      maxHeight: '500px',
      background: '#f5f5f5',
      border: '2px solid #ccc',
      borderRadius: '8px',
      padding: '10px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 9999,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
        🔧 API Debug Tool
      </div>

      <div style={{ marginBottom: '10px' }}>
        <button
          onClick={testAPI}
          disabled={isLoading}
          style={{
            padding: '5px 10px',
            marginRight: '5px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          {isLoading ? 'Testing...' : 'Test API'}
        </button>
        <button
          onClick={clearLogs}
          style={{
            padding: '5px 10px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Clear
        </button>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: 'white',
        padding: '5px',
        border: '1px solid #ddd',
        borderRadius: '4px'
      }}>
        {testResults.length === 0 ? (
          <div style={{ color: '#666' }}>Click "Test API" to start debugging</div>
        ) : (
          testResults.map((result, index) => (
            <div key={index} style={{ marginBottom: '2px' }}>
              {result}
            </div>
          ))
        )}
      </div>
    </div>
  );
};