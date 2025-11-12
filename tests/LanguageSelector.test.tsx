import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoiceAppProvider } from '../src/components/VoiceApp/VoiceAppContext';
import { LanguageSelector } from '../src/components/VoiceApp/Settings/LanguageSelector';

// Mock context
jest.mock('../src/components/VoiceApp/VoiceAppContext', () => ({
  VoiceAppProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useVoiceAppContext: () => ({
    language: {
      locale: 'en',
      setLocale: jest.fn(),
    },
  }),
}));

describe('LanguageSelector', () => {
  const mockSetLocale = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Override mock for this test
    jest.doMock('../src/components/VoiceApp/VoiceAppContext', () => ({
      VoiceAppProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      useVoiceAppContext: () => ({
        language: {
          locale: 'en',
          setLocale: mockSetLocale,
        },
      }),
    }));
  });

  it('should render language selector with EN selected', () => {
    render(
      <VoiceAppProvider>
        <LanguageSelector />
      </VoiceAppProvider>
    );

    const select = screen.getByDisplayValue('EN');
    expect(select).toBeInTheDocument();
    
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveValue('en');
    expect(options[1]).toHaveValue('ru');
  });

  it('should render language selector with RU selected', () => {
    jest.doMock('../src/components/VoiceApp/VoiceAppContext', () => ({
      VoiceAppProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      useVoiceAppContext: () => ({
        language: {
          locale: 'ru',
          setLocale: mockSetLocale,
        },
      }),
    }));

    render(
      <VoiceAppProvider>
        <LanguageSelector />
      </VoiceAppProvider>
    );

    const select = screen.getByDisplayValue('RU');
    expect(select).toBeInTheDocument();
  });

  it('should call setLocale when language is changed', () => {
    render(
      <VoiceAppProvider>
        <LanguageSelector />
      </VoiceAppProvider>
    );

    const select = screen.getByDisplayValue('EN');
    fireEvent.change(select, { target: { value: 'ru' } });

    expect(mockSetLocale).toHaveBeenCalledWith('ru');
  });
});