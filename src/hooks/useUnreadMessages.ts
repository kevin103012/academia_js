import { useEffect, useState } from 'react'
import { messagingService, onMessagesChanged } from '../services'

/** Cantidad de mensajes privados sin leer del usuario; se actualiza al enviar, leer o volver a la pestaña. */
export function useUnreadMessages(userId: string | undefined): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!userId) {
      setCount(0)
      return
    }
    let alive = true
    const refresh = () => {
      messagingService
        .list(userId)
        .then((messages) => {
          if (alive) setCount(messages.filter((message) => message.recipientId === userId && !message.read).length)
        })
        .catch(() => {
          // Sin conexión se conserva el número anterior.
        })
    }
    refresh()
    const stop = onMessagesChanged(refresh)
    return () => {
      alive = false
      stop()
    }
  }, [userId])

  return count
}
