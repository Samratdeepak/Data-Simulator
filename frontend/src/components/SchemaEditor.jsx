import { useState } from 'react';
import FieldEditor from './FieldEditor';
import { FaTrashAlt } from 'react-icons/fa';

const SchemaEditor = ({ schema, setSchema }) => {
  const [activeFieldIndex, setActiveFieldIndex] = useState(0);

  const addField = () => {
    const newField = {
      name: `field_${schema.fields.length + 1}`,
      type: 'STRING',
      mode: 'NULLABLE',
      constraints: {}
    };
    setSchema({
      ...schema,
      fields: [...schema.fields, newField]
    });
    setActiveFieldIndex(schema.fields.length);
  };

  const removeField = (index) => {
    if (schema.fields.length <= 1) return;
    const newFields = [...schema.fields];
    newFields.splice(index, 1);
    setSchema({ ...schema, fields: newFields });
    setActiveFieldIndex(Math.min(activeFieldIndex, newFields.length - 1));
  };

  const updateField = (index, field) => {
    const newFields = [...schema.fields];
    newFields[index] = field;
    setSchema({ ...schema, fields: newFields });
  };

  const updateSchema = (key, value) => {
    setSchema({ ...schema, [key]: value });
  };

  return (
    <div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Data Set</label>
        <input
          type="text"
          value={schema.table_name}
          onChange={(e) => updateSchema('table_name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Enter Dataset name"
        />
      </div>
      
      <div className="flex space-x-4">
        <div className="w-1/3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">Fields</h3>
            <button
              onClick={addField}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add Field
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-md overflow-hidden">
            {schema.fields.map((field, index) => (
              <div key={index} onClick={() => setActiveFieldIndex(index)} className={`p-3 border-b border-gray-200 cursor-pointer ${activeFieldIndex === index ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
              <div className="flex justify-between items-center">
                <span className="font-medium">{field.name}</span>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-2">{field.type}</span>
                  {schema.fields.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); removeField(index); }} className="text-red-500 hover:text-red-700 p-1" aria-label="Delete field">
                      <FaTrashAlt className="text-sm" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            ))}
          </div>
        </div>
        
        <div className="w-2/3">
          {schema.fields.length > 0 && (
            <FieldEditor
              field={schema.fields[activeFieldIndex]}
              setField={(updatedField) => updateField(activeFieldIndex, updatedField)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SchemaEditor;