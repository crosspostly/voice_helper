import React from 'react';
import { useVoiceAppContext } from '../VoiceAppContext';

export const PersonaEditor: React.FC = () => {
  const { ui, language } = useVoiceAppContext();
  const { strings: t } = language;
  const { editingPersona, personaView } = ui;

  const handleSavePersona = () => {
    if (!editingPersona || !editingPersona.title || !editingPersona.prompt) {
      alert("Title and prompt are required.");
      return;
    }

    // This would be handled by the context
    // For now, just reset to select view
    ui.setPersonaView('select');
    ui.setEditingPersona(null);
  };

  const handleDeletePersona = () => {
    if (editingPersona?.id && editingPersona.id.startsWith('custom-')) {
      if (window.confirm(t.deleteConfirm)) {
        // This would be handled by the context
        ui.setPersonaView('select');
        ui.setEditingPersona(null);
      }
    }
  };

  const handleCancel = () => {
    ui.setPersonaView('select');
    ui.setEditingPersona(null);
  };

  if (!editingPersona) return null;

  return (
    <div className="flex flex-col space-y-3 mt-4">
      <input 
        key="persona-title-input"
        type="text" 
        value={editingPersona.title || ''} 
        onChange={(e) => ui.setEditingPersona({ ...editingPersona, title: e.target.value })} 
        placeholder={t.titlePlaceholder} 
        className="w-full bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
      />
      <textarea
        key="persona-prompt-textarea"
        value={editingPersona.prompt || ''}
        onChange={(e) => ui.setEditingPersona({ ...editingPersona, prompt: e.target.value })}
        placeholder={t.promptPlaceholderWithNote}
        className="w-full bg-gray-700 rounded-md px-3 py-2 h-40 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      {(editingPersona.id?.startsWith('preset-')) && (
        <p className="text-xs text-amber-400">{t.presetPromptReadOnly}</p>
      )}
      <div className="flex justify-end items-center space-x-2">
        {personaView === 'edit' && editingPersona.id?.startsWith('custom-') && (
          <button 
            onClick={handleDeletePersona} 
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md text-sm"
          >
            {t.deletePersona}
          </button>
        )}
        <button 
          onClick={handleCancel} 
          className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md text-sm"
        >
          {t.cancel}
        </button>
        <button 
          onClick={handleSavePersona} 
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md text-sm"
        >
          {editingPersona.id?.startsWith('preset-') ? t.save : t.saveChanges}
        </button>
      </div>
    </div>
  );
};