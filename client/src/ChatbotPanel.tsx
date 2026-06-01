import { useEffect, useRef, useState } from 'react'
import { type Pet } from './api'
import './ChatbotPanel.css'

interface Props {
  pets: Pet[]
}

interface Message {
  id: number
  role: 'bot' | 'user'
  text: string
  time: string
}

const SUGGESTIONS = [
  '예방접종 스케줄 알려줘',
  '지금 먹으면 안 되는 음식은?',
  '체중이 갑자기 늘었어요',
]

const MOCK_RESPONSES: string[] = [
  '네, 좋은 질문이에요! 반려동물의 건강을 위해 정기적인 검진이 중요합니다. 구체적인 증상이 있다면 수의사에게 상담을 받는 것을 권장해요.',
  '일반적으로 초콜릿, 포도/건포도, 양파/파, 자일리톨, 마카다미아 너트, 아보카도는 개와 고양이에게 독성을 가질 수 있습니다. 성분표 스캔 기능을 이용하면 더 자세히 확인할 수 있어요.',
  '체중 관리는 반려동물의 건강에 매우 중요해요. 체중이 급격히 변했다면 식이 조절과 함께 수의사 상담을 권장드립니다. 정기적인 체중 기록을 통해 변화를 추적해보세요.',
  '예방접종 일정은 종류와 나이에 따라 다릅니다. 강아지의 경우 종합백신(DHPPi)과 광견병 접종이 특히 중요하며, 광견병은 법적 의무 접종이에요. 예방접종 관리 탭에서 자세한 스케줄을 확인해보세요.',
  '반려동물의 건강 이상 신호로는 식욕 감소, 급격한 체중 변화, 과도한 음수, 기력 저하 등이 있어요. 이런 증상이 지속되면 동물병원 방문을 권장합니다.',
]

function now(): string {
  return new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

let idCounter = 100

export default function ChatbotPanel({ pets }: Props) {
  const [selectedPetId, setSelectedPetId] = useState<string>(pets[0]?.id ?? 'mock')
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const selectedPet = pets.find((p) => p.id === selectedPetId)
  const petName = selectedPet?.name ?? '콩이'

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 1,
      role: 'bot',
      text: `안녕하세요! 저는 PawCare 챗봇이에요. ${petName}에 대해 궁금한 것을 물어보세요 🐾`,
      time: now(),
    },
    {
      id: 2,
      role: 'user',
      text: '예방접종 스케줄 알려줘',
      time: now(),
    },
    {
      id: 3,
      role: 'bot',
      text: '예방접종 일정은 종류와 나이에 따라 다릅니다. 강아지의 경우 종합백신(DHPPi)과 광견병 접종이 특히 중요하며, 광견병은 법적 의무 접종이에요. 예방접종 관리 탭에서 자세한 스케줄을 확인해보세요.',
      time: now(),
    },
    {
      id: 4,
      role: 'user',
      text: '먹으면 안 되는 음식이 뭐가 있어?',
      time: now(),
    },
    {
      id: 5,
      role: 'bot',
      text: '초콜릿, 포도/건포도, 양파/파, 자일리톨, 마카다미아 너트, 아보카도는 반려동물에게 독성을 가질 수 있어요. 성분표 스캔 기능을 이용하면 구체적인 성분도 확인할 수 있답니다!',
      time: now(),
    },
  ])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Update greeting when pet changes
  useEffect(() => {
    setMessages((prev) => {
      const updated = [...prev]
      if (updated[0]) {
        updated[0] = {
          ...updated[0],
          text: `안녕하세요! 저는 PawCare 챗봇이에요. ${petName}에 대해 궁금한 것을 물어보세요 🐾`,
        }
      }
      return updated
    })
  }, [petName])

  function getMockResponse(): string {
    return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]
  }

  function sendMessage(text: string) {
    if (!text.trim() || isTyping) return

    const userMsg: Message = {
      id: ++idCounter,
      role: 'user',
      text: text.trim(),
      time: now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // Simulate bot typing delay
    setTimeout(() => {
      const botMsg: Message = {
        id: ++idCounter,
        role: 'bot',
        text: getMockResponse(),
        time: now(),
      }
      setMessages((prev) => [...prev, botMsg])
      setIsTyping(false)
    }, 1200 + Math.random() * 800)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="chatbot-layout">
      {/* Header */}
      <div className="chatbot-header">
        <div className="chatbot-avatar">🐾</div>
        <div>
          <div className="chatbot-title">PawCare 챗봇</div>
          <div className="chatbot-subtitle">일반 건강 정보 안내 · AI 기반</div>
        </div>
      </div>

      {/* Pet selector */}
      <div className="chatbot-pet-selector">
        <label>반려동물:</label>
        {pets.length > 0 ? (
          <select
            value={selectedPetId}
            onChange={(e) => setSelectedPetId(e.target.value)}
          >
            {pets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.species === 'dog' ? '🐶' : '🐱'} {p.name}
              </option>
            ))}
          </select>
        ) : (
          <select value="mock" disabled>
            <option value="mock">🐶 콩이 (데모)</option>
          </select>
        )}
      </div>

      {/* Messages */}
      <div className="chatbot-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg chat-msg-${msg.role}`}>
            {msg.role === 'bot' && (
              <div className="chatbot-avatar" style={{ width: 28, height: 28, fontSize: 14, flexShrink: 0 }}>🐾</div>
            )}
            <div>
              <div className="chat-bubble">{msg.text}</div>
              <div className="chat-timestamp">{msg.time}</div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="chat-msg chat-msg-bot">
            <div className="chatbot-avatar" style={{ width: 28, height: 28, fontSize: 14, flexShrink: 0 }}>🐾</div>
            <div className="chat-bubble" style={{ padding: '6px 14px' }}>
              <div className="chat-typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      <div className="chat-suggestions">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            className="chat-suggest-btn"
            onClick={() => sendMessage(s)}
            disabled={isTyping}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="chatbot-input-area">
        <textarea
          ref={textareaRef}
          className="chatbot-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="궁금한 것을 입력하세요… (Enter로 전송, Shift+Enter로 줄바꿈)"
          rows={1}
          disabled={isTyping}
        />
        <button
          className="chatbot-send-btn"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isTyping}
          title="전송"
        >
          ▶
        </button>
      </div>

      {/* Disclaimer */}
      <div className="chat-disclaimer">
        ⚠️ 이 챗봇은 일반적인 정보만 제공합니다. 응급 상황 시 동물병원을 방문하세요.
      </div>
    </div>
  )
}
