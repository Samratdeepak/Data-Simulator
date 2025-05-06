const FieldEditor = ({ field, setField }) => {
  const dataTypes = ['STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE', 'TIMESTAMP', 'RECORD'];
  const modeOptions = ['NULLABLE', 'REQUIRED', 'REPEATED'];

  const updateField = (key, value) => {
    const updatedField = { ...field, [key]: value };
    setField(updatedField);
    return updatedField;
  };

  const updateConstraint = (key, value) => {
    const constraints = field.constraints || {};
    if (value === '') {
      delete constraints[key];
    } else {
      constraints[key] = value;
    }
    const updatedField = { ...field, constraints };
    setField(updatedField);
    return updatedField;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Field Configuration</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Field Name</label>
        <input
          type="text"
          value={field.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Enter Field Name"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data Type</label>
          <select
            value={field.type}
            onChange={(e) => updateField('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {dataTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
          <select
            value={field.mode}
            onChange={(e) => updateField('mode', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {modeOptions.map(mode => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Constraints</h4>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Pattern (regex)</label>
            <input
              type="text"
              value={field.constraints?.pattern || ''}
              onChange={(e) => updateConstraint('pattern', e.target.value)}
              placeholder="Enter Constraints"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Min Value</label>
              <input
                type="number"
                value={field.constraints?.min || ''}
                onChange={(e) => updateConstraint('min', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Max Value</label>
              <input
                type="number"
                value={field.constraints?.max || ''}
                onChange={(e) => updateConstraint('max', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Options (comma separated)</label>
            <input
              type="text"
              value={field.constraints?.options?.join(', ') || ''}
              onChange={(e) => updateConstraint('options', e.target.value.split(',').map(item => item.trim()))}
              placeholder="Option 1, Option 2, Option 3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldEditor;