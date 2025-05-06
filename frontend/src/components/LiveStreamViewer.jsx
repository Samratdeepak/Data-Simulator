import { useEffect, useState } from "react";

const LiveStreamViewer = ({ schemaData }) => {
  const [streamData, setStreamData] = useState([]);
  const [fileType, setFileType] = useState("csv");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setStreamData([]); // Clear previous data

      try {
        if (fileType === "schema") {
          // Handle schema data directly from props
          setStreamData([JSON.stringify(schemaData, null, 2)]);
        } else {
          // Handle CSV or JSON from the live stream endpoint
          const response = await fetch(
            `http://localhost:8000/live-stream/?file_type=${fileType}${
              fileType === "schema" ? "&is_schema=true" : ""
            }`
          );
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const newData = decoder.decode(value);
            setStreamData((prevData) => [...prevData, newData]);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setStreamData([`Error loading ${fileType} data: ${error.message}`]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [fileType, schemaData]);

  return (
    <div className="p-4 bg-gray-50 border rounded-lg">
      <h3 className="text-lg font-semibold mb-3">Live Stream Viewer</h3>

      {/* Dropdown to select file type */}
      <div className="mb-3">
        <label className="mr-2 font-semibold">Select File Type:</label>
        <select
          className="border p-1 rounded-md"
          value={fileType}
          onChange={(e) => setFileType(e.target.value)}
        >
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
      </div>

      <div className="overflow-y-auto h-64 border p-2 bg-white rounded-md">
        {isLoading ? (
          <p className="text-gray-500">Loading data...</p>
        ) : streamData.length > 0 ? (
          streamData.map((line, index) => (
            <pre key={index} className="text-sm text-gray-800 whitespace-pre-wrap">
              {line}
            </pre>
          ))
        ) : (
          <p className="text-gray-500">No data available</p>
        )}
      </div>
    </div>
  );
};

export default LiveStreamViewer;