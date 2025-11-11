import React from 'react';
import { useVoiceAppContext } from '../VoiceAppContext';
import { PersonaEditor } from './PersonaEditor';
import { PersonaInfoButton } from './PersonaInfoButton';

export const PersonaSelector: React.FC = () => {
  const { session, ui, language } = useVoiceAppContext();
  const { strings: t } = language;
  const { selectedAssistant } = session;

  const allAssistants = ui.customAssistants;
  const presetAssistants = allAssistants.filter(a => a.id?.startsWith('preset-'));
  const userCustomAssistants = allAssistants.filter(a => !a.id?.startsWith('preset-'));

  const getPersonaDisplayName = (assistant: any) => {
    return assistant.title || (assistant.titleKey ? t[assistant.titleKey] : assistant.id);
  };

  const handleSelectedAssistantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    if (value === 'add-new') {
      ui.setEditingPersona({ title: '', prompt: '' });
      ui.setPersonaView('add');
    } else {
      const assistant = allAssistants.find(a => a.id === value);
      if (assistant) {
        session.setSelectedAssistant(assistant);
      }
    }
  };

  const handleEditPersona = () => {
    if (selectedAssistant) {
      ui.setEditingPersona({
        ...selectedAssistant,
        title: getPersonaDisplayName(selectedAssistant)
      });
      ui.setPersonaView('edit');
    }
  };

  if (ui.personaView === 'add' || ui.personaView === 'edit') {
    return <PersonaEditor />;
  }

  return (
    <div className="relative mt-4">
      <div className="flex items-center space-x-2">
        <select
          value={selectedAssistant?.id || ''}
          onChange={handleSelectedAssistantChange}
          className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium"
        >
          {presetAssistants.length > 0 && (
            <optgroup label="Presets" className="font-semibold">
              {presetAssistants.map((assistant) => (
                <option key={assistant.id} value={assistant.id} className="text-gray-900">
                  {getPersonaDisplayName(assistant)}
                </option>
              ))}
            </optgroup>
          )}
          {userCustomAssistants.length > 0 && (
            <optgroup label="Custom" className="font-semibold">
              {userCustomAssistants.map((assistant) => (
                <option key={assistant.id} value={assistant.id} className="text-gray-900">
                  {getPersonaDisplayName(assistant)}
                </option>
              ))}
            </optgroup>
          )}
          <option value="add-new" className="text-green-600 font-bold">
            {t.createNewPersona}
          </option>
        </select>
        
        <button 
          onClick={handleEditPersona}
          className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" 
          aria-label={t.editPersona}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
          </svg>
        </button>
        
        <PersonaInfoButton />
      </div>
    </div>
  );
};
