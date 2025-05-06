import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import MainPanel from "../components/MainPanel";

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedFile = location.state?.selectedFile || null;
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem('chatHistory');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState("single-table");
  const [generatedData, setGeneratedData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentInput, setCurrentInput] = useState("");

  // Load saved content if a file is selected
  useEffect(() => {
    if (selectedFile) {
      if (selectedFile.type === 'chat') {
        // For existing chats, load the content
        setCurrentInput(selectedFile.content);
      } else {
        // For other files, start with empty input
        setCurrentInput("");
      }
    } else {
      // New chat - empty input
      setCurrentInput("");
    }
  }, [selectedFile]);

  const handleSave = () => {
    if (!currentInput.trim()) return;
  
    let updatedHistory;
    try {
      const parsedContent = JSON.parse(currentInput);
      const tableName = parsedContent?.table_name || `Dataset ${chatHistory.length + 1}`;
  
      if (selectedFile?.type === 'chat') {
        // Update existing chat
        updatedHistory = chatHistory.map(chat => 
          chat.id === selectedFile.id 
            ? { 
                ...chat, 
                name: tableName,
                content: currentInput, 
                timestamp: new Date().toISOString() 
              }
            : chat
        );
      } else {
        // Create new chat
        const newChat = {
          id: `chat_${Date.now()}`,
          name: tableName,
          content: currentInput,
          timestamp: new Date().toISOString()
        };
        updatedHistory = [...chatHistory, newChat];
      }
    } catch (e) {
      // If content is not JSON, fall back to default naming
      const defaultName = selectedFile?.type === 'chat' 
        ? selectedFile.name 
        : `Dataset ${chatHistory.length + 1}`;
      
      if (selectedFile?.type === 'chat') {
        updatedHistory = chatHistory.map(chat => 
          chat.id === selectedFile.id 
            ? { ...chat, content: currentInput, timestamp: new Date().toISOString() }
            : chat
        );
      } else {
        const newChat = {
          id: `chat_${Date.now()}`,
          name: defaultName,
          content: currentInput,
          timestamp: new Date().toISOString()
        };
        updatedHistory = [...chatHistory, newChat];
      }
    }
  
    setChatHistory(updatedHistory);
    localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
    navigate('/file-browser', { state: { refresh: true } });
  };

  return (
    <div className="min-h-screen bg-gray-50">
     
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Welcome to Your Dashboard</h2>
              <p className="mt-1 text-gray-600">You're successfully authenticated</p>
              {selectedFile && (
                <p className="mt-2 text-gray-700">
                  {selectedFile.type === 'chat' ? 'Editing: ' : 'Selected File: '}
                  <strong>{selectedFile.name}{selectedFile.type !== 'chat' ? `.${selectedFile.type}` : ''}</strong>
                </p>
              )}
            </div>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
          </div>

          <MainPanel 
            activeTab={activeTab} 
            setGeneratedData={setGeneratedData}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            generatedData={generatedData}
            currentInput={currentInput}
            setCurrentInput={setCurrentInput}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;