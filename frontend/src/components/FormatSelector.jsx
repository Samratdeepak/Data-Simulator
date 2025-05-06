const FormatSelector = ({ outputFormat, setOutputFormat }) => {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Output Format</label>
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-blue-600"
              name="outputFormat"
              value="csv"
              checked={outputFormat === 'csv'}
              onChange={() => setOutputFormat('csv')}
            />
            <span className="ml-2">CSV</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-blue-600"
              name="outputFormat"
              value="json"
              checked={outputFormat === 'json'}
              onChange={() => setOutputFormat('json')}
            />
            <span className="ml-2">JSON</span>
          </label>
        </div>
      </div>
    );
  };
  
  export default FormatSelector;