import { useState, useEffect } from 'react';
import { FaFileCsv, FaFileAlt, FaSpinner, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';


const DataPreview = ({ data, loading, taskStatus }) => {
  const [activeTab, setActiveTab] = useState('preview');
  const [downloading, setDownloading] = useState({ csv: false, json: false });
  const [progress, setProgress] = useState({ current: 0, total: 1 });
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    if (taskStatus?.progress) {
      setProgress({
        current: taskStatus.progress,
        total: taskStatus.total
      });
    }
  }, [taskStatus]);

  const getPreviewData = () => {
    if (!data) return null;
    return data.result || data;
  };

  const previewData = getPreviewData();

  const downloadFile = async (fileType) => {
    if (!previewData?.files?.[fileType]) return;
    
    setDownloading(prev => ({ ...prev, [fileType]: true }));
    try {
      const filename = previewData.files[fileType].split('/').pop();
      const response = await fetch(`http://localhost:8000/download/${filename}`);
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert(`Failed to download ${fileType.toUpperCase()} file`);
    } finally {
      setDownloading(prev => ({ ...prev, [fileType]: false }));
    }
  };

  const saveSchemaToLocalStorage = async () => {
    try {
      const schemaJson = previewData?.previews?.schema_json;
      if (!schemaJson) {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 2000);
        return;
      }
  
      setSaveStatus('saving');
      
      // Send to backend to save in the correct location
      const response = await fetch('http://localhost:8000/save-schema/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schema: JSON.parse(schemaJson),
          table_name: previewData?.schema?.table_name || 'schema'
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to save schema');
      }
  
      const result = await response.json();
      
      // Now download the file from the backend location
      // Use the full filepath returned from the backend
      const downloadResponse = await fetch(`http://localhost:8000/download/${result.filepath}`);
      
      if (!downloadResponse.ok) throw new Error('Download failed');
      
      const blob = await downloadResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Get just the filename for the download attribute
      const filename = result.filepath.split('/').pop();
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
  
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error('Error saving schema:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <FaSpinner className="animate-spin text-2xl text-blue-500 mb-2" />
        <p className="text-gray-600">Generating data...</p>
        {taskStatus && (
          <div className="w-full mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress:</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{taskStatus.message}</p>
          </div>
        )}
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        {taskStatus?.status === 'FAILURE' ? (
          <div className="text-center">
            <FaTimesCircle className="text-red-500 text-2xl mx-auto mb-2" />
            <p>Generation failed: {taskStatus.error}</p>
          </div>
        ) : (
          <p>No data generated yet</p>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border border-gray-200 rounded-lg bg-white p-4">
      <h3 className="text-lg font-semibold mb-4">Data Preview</h3>
      
      <div className="mb-4 flex space-x-2">
        <button 
          onClick={() => setActiveTab('preview')}
          className={`px-3 py-1 text-sm rounded ${activeTab === 'preview' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
        >
          Schema & Sample
        </button>
        <button 
          onClick={() => setActiveTab('files')}
          className={`px-3 py-1 text-sm rounded ${activeTab === 'files' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
        >
          Generated Files
        </button>
        
      </div>
      
      <div className="flex-1 overflow-auto">
        {activeTab === 'preview' ? (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-700">Schema (JSON)</h4>
                <button
                  onClick={saveSchemaToLocalStorage}
                  disabled={!previewData?.previews?.schema_json || saveStatus === 'saving'}
                  className="flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 disabled:opacity-50"
                >
                  {saveStatus === 'success' ? (
                    <FaCheckCircle className="mr-1 text-green-500" />
                  ) : saveStatus === 'error' ? (
                    <FaTimesCircle className="mr-1 text-red-500" />
                  ) : saveStatus === 'saving' ? (
                    <FaSpinner className="mr-1 animate-spin" />
                  ) : (
                    <FaFileAlt className="mr-1" />
                  )}
                  {saveStatus === 'success' ? 'Saved!' : 
                  saveStatus === 'error' ? 'Error' : 
                  saveStatus === 'saving' ? 'Saving...' : 'Save Schema'}
                </button>
              </div>
              <pre className="text-xs text-gray-800 bg-gray-50 p-2 rounded border border-gray-200 overflow-auto max-h-40">
                {previewData?.previews?.schema_json || 'No schema available'}
              </pre>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Sample Data (CSV)</h4>
              <pre className="text-xs font-mono whitespace-pre bg-gray-50 p-2 rounded border border-gray-200 overflow-auto max-h-40">
                {previewData.previews?.sample_csv || 'No sample data available'}
              </pre>
            </div>
          </div>
        ) : activeTab === 'files' ? (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Download Files</h4>
              <div className="space-y-2">
                {previewData.files?.csv && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <FaFileCsv className="mr-2 text-green-600" />
                      <span className="text-sm">CSV File</span>
                    </div>
                    <button
                      onClick={() => downloadFile('csv')}
                      disabled={downloading.csv}
                      className="flex items-center px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50"
                    >
                      {downloading.csv ? (
                        <FaSpinner className="animate-spin mr-1" />
                      ) : (
                        <span>Download</span>
                      )}
                    </button>
                  </div>
                )}
                
                {previewData.files?.json && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <FaFileAlt className="mr-2 text-blue-600" />
                      <span className="text-sm">JSON File</span>
                    </div>
                    <button
                      onClick={() => downloadFile('json')}
                      disabled={downloading.json}
                      className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 disabled:opacity-50"
                    >
                      {downloading.json ? (
                        <FaSpinner className="animate-spin mr-1" />
                      ) : (
                        <span>Download</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Sample Record</h4>
              <pre className="text-xs text-gray-800 bg-gray-50 p-2 rounded border border-gray-200 overflow-auto max-h-40">
                {previewData.sample_record ? JSON.stringify(previewData.sample_record, null, 2) : 'No sample record available'}
              </pre>
            </div> */}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Generation Status</h4>
              <div className="flex items-center mb-2">
                {taskStatus?.status === 'SUCCESS' ? (
                  <FaCheckCircle className="text-green-500 mr-2" />
                ) : (
                  <FaSpinner className="animate-spin text-blue-500 mr-2" />
                )}
                <span className="capitalize">{taskStatus?.status || 'unknown'}</span>
              </div>
              
              {taskStatus?.status === 'PROGRESS' && (
                <div className="mt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress:</span>
                    <span>{progress.current} / {progress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Details</h4>
              <pre className="text-xs text-gray-800 bg-gray-50 p-2 rounded border border-gray-200 overflow-auto max-h-40">
                {JSON.stringify(taskStatus || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataPreview;