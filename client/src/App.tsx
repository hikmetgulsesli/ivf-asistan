import { ChatWidget, useChat } from './components/ChatWidget';

function App() {
  const chat = useChat({
    apiUrl: '/api',
    welcomeMessage: 'Merhaba! IVF süreciyle ilgili sorularınızı yanıtlayabilirim. Size nasıl yardımcı olabilirim?'
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-16 px-4">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">IVF Asistan</h1>
        <p className="text-gray-600 mb-8">
          Tüp Bebek Klinikleri için Akıllı Hasta Rehberi
        </p>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Demo</h2>
          <p className="text-gray-600 mb-4">
            Aşağıdaki butona tıklayarak sohbet widget'ını test edebilirsiniz.
          </p>
          <p className="text-sm text-gray-500">
            Widget sağ alt köşede görünecektir.
          </p>
        </div>
      </div>

      <ChatWidget
        isOpen={chat.isOpen}
        messages={chat.messages}
        isLoading={chat.isLoading}
        suggestedQuestions={chat.suggestedQuestions}
        messagesEndRef={chat.messagesEndRef}
        onSendMessage={chat.sendMessage}
        onToggleOpen={chat.toggleOpen}
      />
    </div>
  );
}

export default App;
