import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { FiDownload, FiEdit2, FiTrash2, FiSave, FiX, FiPlus } from 'react-icons/fi';

const FileBrowser = ({ user }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('chatHistory');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState(null);
  const [tableSchema, setTableSchema] = useState(null);

  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem('chatHistory');
    return saved ? JSON.parse(saved) : [];
  });

  const [generatedFiles, setGeneratedFiles] = useState([]);

  useEffect(() => {
    if (activeTab === 'generatedFiles') {
      fetchTables();
    }
  }, [activeTab]);

  const fetchTables = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/get-tables');
      if (!response.ok) throw new Error('Failed to fetch tables');
      const tables = await response.json();
      const files = tables.map(table => ({
        id: table,
        name: table.replace('synthetic_', ''),
        type: 'table',
        timestamp: Date.now(),
        tableName: table
      }));
      setGeneratedFiles(files);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTableContent = async (tableName) => {
    const response = await fetch(`http://localhost:8000/get-table-content/${tableName}`);
    if (!response.ok) throw new Error('Failed to fetch table content');
    return await response.json();
  };

  const fetchTableSchema = async (tableName) => {
    const response = await fetch(`http://localhost:8000/get-table-schema/${tableName}`);
    if (!response.ok) throw new Error('Failed to fetch table schema');
    return await response.json();
  };

  const handleFileClick = async (file) => {
    if (activeTab === 'chatHistory') {
      navigate('/dashboard', {
        state: {
          selectedFile: {
            id: file.id,
            name: file.name,
            type: 'chat',
            content: file.content
          }
        }
      });
    } else {
      try {
        const [content, schema] = await Promise.all([
          fetchTableContent(file.tableName),
          fetchTableSchema(file.tableName)
        ]);
        setDialogContent(content);
        setTableSchema(schema);
        setShowDialog(true);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleDeleteChat = (e, id) => {
    e.stopPropagation(); // Prevent triggering click on the file
    const updatedChats = chatHistory.filter(chat => chat.id !== id);
    setChatHistory(updatedChats);
    localStorage.setItem('chatHistory', JSON.stringify(updatedChats));
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setDialogContent(null);
    setTableSchema(null);
  };

  const convertJsonToCSV = (jsonData) => {
    if (!Array.isArray(jsonData) || jsonData.length === 0) return 'No data available';
    const headers = Object.keys(jsonData[0]);
    const rows = jsonData.map(row =>
      headers.map(field => {
        const value = row[field] ?? '';
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  const currentFiles = activeTab === 'chatHistory' ? chatHistory : generatedFiles;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Welcome, {user?.displayName || 'User'}</h2>
              <p className="mt-1 text-gray-600">Manage your files</p>
            </div>
            {activeTab === 'chatHistory' && (
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <FiPlus className="mr-2" /> Add New
              </button>
            )}
          </div>

          <div className="border-b border-gray-200">
            <nav className="flex">
              {['chatHistory', 'generatedFiles'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'chatHistory' ? 'Chat History' : 'Generated Files'}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {error && <div className="mb-4 p-4 bg-red-100 text-red-800 rounded">{error}</div>}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-12 w-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading files...</p>
              </div>
            ) : currentFiles.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No {activeTab === 'chatHistory' ? 'chat history' : 'generated files'} found.
              </div>
            ) : (
              <ul className="space-y-4">
                {currentFiles.map(file => (
                  <li
                    key={file.id}
                    onClick={() => handleFileClick(file)}
                    className="flex items-center justify-between px-4 py-3 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition"
                  >
                    <span>{file.name}</span>
                    {activeTab === 'chatHistory' && (
                      <button
                        onClick={(e) => handleDeleteChat(e, file.id)}
                        className="text-red-500 hover:text-red-700 ml-4"
                        title="Delete Chat"
                      >
                        <FiTrash2 />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 overflow-auto max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Table Details</h3>
              <button onClick={handleCloseDialog} className="text-gray-500 hover:text-gray-700">
                <FiX size={20} />
              </button>
            </div>

            <h4 className="text-lg font-bold text-purple-600">Schema</h4>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(tableSchema, null, 2)}
            </pre>

            <h4 className="text-lg font-bold mt-6 text-purple-600">Content (CSV Format)</h4>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto whitespace-pre-wrap">
              {convertJsonToCSV(dialogContent)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileBrowser;
