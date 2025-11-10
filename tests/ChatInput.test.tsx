import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceAppProvider } from '../src/components/VoiceApp/VoiceAppContext';
import { ChatInput } from '../src/components/VoiceApp/ChatInput';

// Mock the context
jest.mock('../src/components/VoiceApp/VoiceAppContext', () => ({
  VoiceAppProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useVoiceAppContext: () => ({
    session: {
      status: 'IDLE',
      selectedAssistant: { id: 'test', title: 'Test Assistant' },
      sendText: jest.fn().mockResolvedValue(undefined),
    },
    ui: {
      textInputValue: '',
      setTextInputValue: jest.fn(),
    },
    language: {
      strings: {
        sendMessage: 'Send message',
      },
    },
  }),
}));

describe('ChatInput', () => {
  const mockSendText = jest.fn();
  const mockSetTextInputValue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Override the mock for this test
    jest.doMock('../src/components/VoiceApp/VoiceAppContext', () => ({
      VoiceAppProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      useVoiceAppContext: () => ({
        session: {
          status: 'IDLE',
          selectedAssistant: { id: 'test', title: 'Test Assistant' },
          sendText: mockSendText,
        },
        ui: {
          textInputValue: '',
          setTextInputValue: mockSetTextInputValue,
        },
        language: {
          strings: {
            sendMessage: 'Send message',
          },
        },
      }),
    }));
  });

  it('should render input field and send button', () => {
    render(
      <VoiceAppProvider>
        <ChatInput />
      </VoiceAppProvider>
    );

    expect(screen.getByPlaceholderText('Send message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('should update input value when typing', () => {
    render(
      <VoiceAppProvider>
        <ChatInput />
      </VoiceAppProvider>
    );

    const input = screen.getByPlaceholderText('Send message');
    fireEvent.change(input, { target: { value: 'Hello world' } });

    expect(mockSetTextInputValue).toHaveBeenCalledWith('Hello world');
  });

  it('should send message when send button is clicked', async () => {
    mockSetTextInputValue.mockReturnValue('Hello world');

    render(
      <VoiceAppProvider>
        <ChatInput />
      </VoiceAppProvider>
    );

    const sendButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendText).toHaveBeenCalledWith('Hello world');
    });
  });

  it('should send message when Enter key is pressed', async () => {
    mockSetTextInputValue.mockReturnValue('Hello world');

    render(
      <VoiceAppProvider>
        <ChatInput />
      </VoiceAppProvider>
    );

    const input = screen.getByPlaceholderText('Send message');
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockSendText).toHaveBeenCalledWith('Hello world');
    });
  });

  it('should disable send button when input is empty', () => {
    render(
      <VoiceAppProvider>
        <ChatInput />
      </VoiceAppProvider>
    );

    const sendButton = screen.getByRole('button', { name: /send message/i });
    expect(sendButton).toBeDisabled();
  });

  it('should disable input when speaking', () => {
    jest.doMock('../src/components/VoiceApp/VoiceAppContext', () => ({
      VoiceAppProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      useVoiceAppContext: () => ({
        session: {
          status: 'SPEAKING',
          selectedAssistant: { id: 'test', title: 'Test Assistant' },
          sendText: mockSendText,
        },
        ui: {
          textInputValue: '',
          setTextInputValue: mockSetTextInputValue,
        },
        language: {
          strings: {
            sendMessage: 'Send message',
          },
        },
      }),
    }));

    render(
      <VoiceAppProvider>
        <ChatInput />
      </VoiceAppProvider>
    );

    const input = screen.getByPlaceholderText('Send message');
    expect(input).toBeDisabled();
  });
});