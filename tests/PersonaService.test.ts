import { PersonaService } from '../src/services/personaService';
import { Assistant } from '../src/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('PersonaService', () => {
  let personaService: PersonaService;
  const mockCustomAssistant: Assistant = {
    id: 'custom-123',
    title: 'Custom Assistant',
    prompt: 'You are a custom assistant',
  };

  beforeEach(() => {
    personaService = new PersonaService();
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('loadCustomAssistants', () => {
    it('should load custom assistants from localStorage', () => {
      localStorageMock.setItem('assistants', JSON.stringify([mockCustomAssistant]));
      
      const result = personaService.loadCustomAssistants();
      
      expect(result).toEqual([mockCustomAssistant]);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('assistants');
    });

    it('should return empty array when no assistants exist', () => {
      const result = personaService.loadCustomAssistants();
      
      expect(result).toEqual([]);
    });

    it('should handle localStorage errors', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = personaService.loadCustomAssistants();
      
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith("Failed to load custom assistants from localStorage", expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('saveCustomAssistants', () => {
    it('should save custom assistants to localStorage', () => {
      personaService.saveCustomAssistants([mockCustomAssistant]);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('assistants', JSON.stringify([mockCustomAssistant]));
    });

    it('should handle save errors', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      personaService.saveCustomAssistants([mockCustomAssistant]);
      
      expect(consoleSpy).toHaveBeenCalledWith("Error saving custom assistants to localStorage", expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('loadSelectedAssistantId', () => {
    it('should load selected assistant ID from localStorage', () => {
      localStorageMock.setItem('selectedAssistantId', 'preset-0');
      
      const result = personaService.loadSelectedAssistantId();
      
      expect(result).toBe('preset-0');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('selectedAssistantId');
    });

    it('should return null when no ID exists', () => {
      const result = personaService.loadSelectedAssistantId();
      
      expect(result).toBeNull();
    });
  });

  describe('saveSelectedAssistantId', () => {
    it('should save selected assistant ID to localStorage', () => {
      personaService.saveSelectedAssistantId('preset-0');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('selectedAssistantId', 'preset-0');
    });
  });

  describe('getAllAssistants', () => {
    it('should return all assistants including presets and custom', () => {
      localStorageMock.setItem('assistants', JSON.stringify([mockCustomAssistant]));
      
      const result = personaService.getAllAssistants();
      
      expect(result.length).toBeGreaterThan(1); // Presets + custom
      expect(result).toContainEqual(mockCustomAssistant);
      expect(result.some(a => a.id?.startsWith('preset-'))).toBe(true);
    });
  });

  describe('getAssistantById', () => {
    it('should return assistant by ID', () => {
      localStorageMock.setItem('assistants', JSON.stringify([mockCustomAssistant]));
      
      const result = personaService.getAssistantById('custom-123');
      
      expect(result).toEqual(mockCustomAssistant);
    });

    it('should return null for non-existent ID', () => {
      const result = personaService.getAssistantById('non-existent');
      
      expect(result).toBeNull();
    });
  });

  describe('addCustomAssistant', () => {
    it('should add custom assistant', () => {
      const newAssistantData = {
        title: 'New Assistant',
        prompt: 'You are new',
      };
      
      const result = personaService.addCustomAssistant(newAssistantData);
      
      expect(result.id).toMatch(/^custom-\d+$/);
      expect(result.title).toBe(newAssistantData.title);
      expect(result.prompt).toBe(newAssistantData.prompt);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('assistants', expect.any(String));
    });
  });

  describe('updateCustomAssistant', () => {
    it('should update custom assistant', () => {
      localStorageMock.setItem('assistants', JSON.stringify([mockCustomAssistant]));
      
      const updates = { title: 'Updated Title' };
      const result = personaService.updateCustomAssistant('custom-123', updates);
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('assistants', expect.any(String));
    });

    it('should return false for non-existent assistant', () => {
      const result = personaService.updateCustomAssistant('non-existent', { title: 'Updated' });
      
      expect(result).toBe(false);
    });
  });

  describe('deleteCustomAssistant', () => {
    it('should delete custom assistant', () => {
      localStorageMock.setItem('assistants', JSON.stringify([mockCustomAssistant]));
      
      const result = personaService.deleteCustomAssistant('custom-123');
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('assistants', expect.any(String));
    });

    it('should return false for non-existent assistant', () => {
      const result = personaService.deleteCustomAssistant('non-existent');
      
      expect(result).toBe(false);
    });
  });
});