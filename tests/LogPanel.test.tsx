import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoiceAppProvider } from '../src/components/VoiceApp/VoiceAppContext';
import { LogPanel } from '../src/components/VoiceApp/Common/LogPanel';

// Mock context
jest.mock('../src/components/VoiceApp/VoiceAppContext', () => ({
  VoiceAppProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useVoiceAppContext: () => ({
    ui: {
      showLogs: false,
      setShowLogs: jest.fn(),
    },
    logger: {
      logs: ['Test log 1', 'Test log 2'],
      clearLogs: jest.fn(),
    },
    language: {
      strings: {
        logs: 'Logs',
        clearLogs: 'Clear',
      },
    },
  }),
}));

describe('LogPanel', () => {
  const mockSetShowLogs = jest.fn();
  const mockClearLogs = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Override mock for this test
    jest.doMock('../src/components/VoiceApp/VoiceAppContext', () => ({
      VoiceAppProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      useVoiceAppContext: () => ({
        ui: {
          showLogs: false,
          setShowLogs: mockSetShowLogs,
        },
        logger: {
          logs: ['Test log 1', 'Test log 2'],
          clearLogs: mockClearLogs,
        },
        language: {
          strings: {
            logs: 'Logs',
            clearLogs: 'Clear',
          },
        },
      }),
    }));
  });

  it('should render logs header', () => {
    render(
      <VoiceAppProvider>
        <LogPanel />
      </VoiceAppProvider>
    );

    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  it('should toggle logs visibility when header is clicked', () => {
    render(
      <VoiceAppProvider>
        <LogPanel />
      </VoiceAppProvider>
    );

    const header = screen.getByText('Logs').closest('div');
    fireEvent.click(header!);

    expect(mockSetShowLogs).toHaveBeenCalledWith(true);
  });

  it('should show expanded icon when logs are visible', () => {
    jest.doMock('../src/components/VoiceApp/VoiceAppContext', () => ({
      VoiceAppProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      useVoiceAppContext: () => ({
        ui: {
          showLogs: true,
          setShowLogs: mockSetShowLogs,
        },
        logger: {
          logs: ['Test log 1', 'Test log 2'],
          clearLogs: mockClearLogs,
        },
        language: {
          strings: {
            logs: 'Logs',
            clearLogs: 'Clear',
          },
        },
      }),
    }));

    render(
      <VoiceAppProvider>
        <LogPanel />
      </VoiceAppProvider>
    );

    expect(screen.getByText('▼')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('should display logs when visible', () => {
    jest.doMock('../src/components/VoiceApp/VoiceAppContext', () => ({
      VoiceAppProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      useVoiceAppContext: () => ({
        ui: {
          showLogs: true,
          setShowLogs: mockSetShowLogs,
        },
        logger: {
          logs: ['Test log 1', 'Test log 2'],
          clearLogs: mockClearLogs,
        },
        language: {
          strings: {
            logs: 'Logs',
            clearLogs: 'Clear',
          },
        },
      }),
    }));

    render(
      <VoiceAppProvider>
        <LogPanel />
      </VoiceAppProvider>
    );

    expect(screen.getByText('Test log 1')).toBeInTheDocument();
    expect(screen.getByText('Test log 2')).toBeInTheDocument();
  });

  it('should clear logs when clear button is clicked', () => {
    jest.doMock('../src/components/VoiceApp/VoiceAppContext', () => ({
      VoiceAppProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      useVoiceAppContext: () => ({
        ui: {
          showLogs: true,
          setShowLogs: mockSetShowLogs,
        },
        logger: {
          logs: ['Test log 1', 'Test log 2'],
          clearLogs: mockClearLogs,
        },
        language: {
          strings: {
            logs: 'Logs',
            clearLogs: 'Clear',
          },
        },
      }),
    }));

    render(
      <VoiceAppProvider>
        <LogPanel />
      </VoiceAppProvider>
    );

    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    expect(mockClearLogs).toHaveBeenCalled();
  });
});