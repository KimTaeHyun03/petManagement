import { useEffect, useRef, useState } from 'react'
import { api, errorMessage, type Pet } from '../api'
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

  const [messages, setMessages] = useState<Message[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // 펫이 바뀌면 해당 펫의 채팅 기록 로드
  useEffect(() => {
    if (!selectedPetId || selectedPetId === 'mock') {
      setMessages([{
        id: 1,
        role: 'bot',
        text: `안녕하세요! 저는 PawCare 챗봇이에요. ${petName}에 대해 궁금한 것을 물어보세요 🐾`,
        time: now(),
      }])
      return
    }
    let cancelled = false
    setHistoryLoading(true)
    api.getChatHistory(selectedPetId)
      .then((history) => {
        if (cancelled) return
        if (history.length === 0) {
          setMessages([{
            id: ++idCounter,
            role: 'bot',
            text: `안녕하세요! 저는 PawCare 챗봇이에요. ${petName}에 대해 궁금한 것을 물어보세요 🐾`,
            time: now(),
          }])
        } else {
          setMessages(history.map((h) => ({
            id: ++idCounter,
            role: h.role === 'assistant' ? 'bot' : 'user',
            text: h.message,
            time: new Date(h.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          })))
        }
      })
      .catch(() => {
        if (!cancelled) setMessages([])
      })
      .finally(() => { if (!cancelled) setHistoryLoading(false) })
    return () => { cancelled = true }
  }, [selectedPetId, petName])

  async function sendMessage(text: string) {
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

    try {
      const { answer } = await api.sendChatMessage(selectedPetId, text.trim())
      setMessages((prev) => [
        ...prev,
        { id: ++idCounter, role: 'bot', text: answer, time: now() },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: ++idCounter,
          role: 'bot',
          text: `오류가 발생했습니다: ${errorMessage(err)}`,
          time: now(),
        },
      ])
    } finally {
      setIsTyping(false)
    }
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
        {historyLoading && (
          <div style={{ textAlign: 'center', padding: '16px', color: '#888', fontSize: 13 }}>
            대화 기록 불러오는 중…
          </div>
        )}
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
