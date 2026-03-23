'use client'

import { useRef, useState, useEffect, useTransition } from 'react'
import {
  fetchNotificationsAction,
  markReadAction,
  markAllReadAction,
} from '@/app/notifications/actions'

type Notification = {
  notification_id: string
  title: string
  message: string
  read: boolean
  created_at: string
  type: string
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [, startTransition] = useTransition()
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    startTransition(async () => {
      const data = await fetchNotificationsAction()
      setNotifications(data as Notification[])
    })
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markReadAction(id)
      setNotifications(prev =>
        prev.map(n => n.notification_id === id ? { ...n, read: true } : n)
      )
    })
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllReadAction()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    })
  }

  function formatTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-400 text-white transition-all"
        aria-label="Notifications"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-white text-orange-500 text-[10px] font-bold leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-surface shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-secondary hover:text-foreground transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-secondary text-center">No notifications</p>
            ) : (
              notifications.map(n => (
                <div
                  key={n.notification_id}
                  className={`flex gap-3 px-4 py-3 border-b border-border/40 last:border-0 transition-colors ${
                    n.read ? 'opacity-60' : 'bg-orange-500/5'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-secondary mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[11px] text-secondary/60 mt-1">{formatTime(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.notification_id)}
                      className="shrink-0 self-start mt-1 text-[11px] text-orange-400 hover:text-orange-300 transition-colors whitespace-nowrap"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
