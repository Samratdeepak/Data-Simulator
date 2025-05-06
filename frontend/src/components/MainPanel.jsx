import { useState, useEffect } from "react";
import SchemaEditor from "./SchemaEditor";
import FormatSelector from "./FormatSelector";
import DataPreview from "./DataPreview";
import LiveStreamViewer from "./LiveStreamViewer";

const MainPanel = ({
  activeTab,
  setGeneratedData,
  isGenerating,
  setIsGenerating,
  generatedData,
  currentInput,
  setCurrentInput  
}) => {
  const [schema, setSchema] = useState({
    table_name: "",
    fields: [{ name: " ", type: "select", mode: "select", constraints: { pattern: "" } }],
  });
  const [recordCount, setRecordCount] = useState(100);
  const [outputFormat, setOutputFormat] = useState("csv");
  const [showDataPreview, setShowDataPreview] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [showLiveStream, setShowLiveStream] = useState(false);

  const storageOptions = [
    { name: "Azure SQL", value: "azure_sql" },
    { name: "Azure Blob Storage", value: "blob_storage" },
  ];

  const [selectedStorage, setSelectedStorage] = useState("");

  const isStorageSelected = selectedStorage !== "";

  // Load schema from input when it changes (if it's JSON)
  useEffect(() => {
    if (currentInput) {
      try {
        const parsed = JSON.parse(currentInput);
        if (parsed.table_name && parsed.fields) {
          setSchema(parsed);
        }
      } catch (e) {
        // Not valid JSON
      }
    }
  }, [currentInput]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("http://localhost:8000/generate-data-async/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema,
          record_count: recordCount,
          output_format: outputFormat,
          storage_option: selectedStorage,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setTaskId(data.task_id);
      setTaskStatus({ status: "PENDING" });
      pollTaskStatus(data.task_id);
    } catch (error) {
      console.error("Error:", error);
      setIsGenerating(false);
      setTaskStatus({
        status: "FAILURE",
        error: error.message
      });
    }
  };

  const pollTaskStatus = async (taskId) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/task-status/${taskId}`);
        const status = await response.json();
        setTaskStatus(status);

        if (status.status === "SUCCESS" || status.status === "FAILURE") {
          clearInterval(interval);
          setIsGenerating(false);
          if (status.status === "SUCCESS") {
            setGeneratedData(status.result);
            setShowDataPreview(true);
          }
        }
      } catch (error) {
        console.error("Error polling task status:", error);
        clearInterval(interval);
        setIsGenerating(false);
      }
    }, 1000);
  };

  const handleLiveStream = () => {
    setShowLiveStream(true);
  };

  const handleSchemaChange = (newSchema) => {
    setSchema(newSchema);
    setCurrentInput(JSON.stringify(newSchema, null, 2));
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Panel */}
          <div className="lg:w-1/2">
            {activeTab === "single-table" ? (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <SchemaEditor schema={schema} setSchema={handleSchemaChange} />
                </div>
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Schema Configuration</h3>
                  <textarea
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-md font-mono text-sm"
                    placeholder="Enter your schema in JSON format or use the editor below"
                    rows={8}
                  />
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Generation Options</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !isStorageSelected}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                      >
                        {isGenerating ? "Generating..." : "Generate"}
                      </button>

                      {taskStatus && taskStatus.status === "SUCCESS" && (
                        <button
                          onClick={handleLiveStream}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                        >
                          Live Stream
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Record Count
                      </label>
                      <input
                        type="number"
                        value={recordCount}
                        onChange={(e) => setRecordCount(parseInt(e.target.value))}
                        min="1"
                        max="100000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <FormatSelector outputFormat={outputFormat} setOutputFormat={setOutputFormat} />
                  </div>

                  {/* Storage Options Dropdown */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Storage Option
                    </label>
                    <select
                      value={selectedStorage}
                      onChange={(e) => setSelectedStorage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select storage option</option>
                      {storageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    {!isStorageSelected && (
                      <p className="mt-1 text-sm text-red-600">
                        Please select a storage option
                      </p>
                    )}
                  </div>

                  {/* Task Status */}
                  {taskStatus && (
                    <div className="mt-4 p-3 rounded-md bg-gray-50 border border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Task Status:</span>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            taskStatus.status === "SUCCESS"
                              ? "bg-green-100 text-green-800"
                              : taskStatus.status === "FAILURE"
                              ? "bg-red-100 text-red-800"
                              : taskStatus.status === "TERMINATED"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {taskStatus.status}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Relational Data Generator</h3>
                  <p className="text-gray-600">
                    This will generate a complete set of relational data including customers,
                    products, orders, and order items.
                  </p>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !isStorageSelected}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                >
                  {isGenerating ? "Generating..." : "Generate Relational Data"}
                </button>
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="lg:w-1/2">
            <div className="bg-white rounded-lg shadow p-6 h-full flex flex-col gap-4">
              {showDataPreview && generatedData && (
                <div className="flex-1">
                  <DataPreview data={generatedData} />
                </div>
              )}

              {showLiveStream && (
                <div className="flex-1">
                  <LiveStreamViewer taskId={taskId} />
                </div>
              )}

              {!showLiveStream && !showDataPreview && (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <p>Generated data will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPanel;