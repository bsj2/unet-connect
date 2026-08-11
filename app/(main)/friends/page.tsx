'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Check, X, UserMinus, UserCheck, Users } from 'lucide-react'

// define the type for a connection item
type ConnectionItem = {
  connectionId: string;
  user: {
    id: string;
    nombre: string;
    apellido: string;
    avatar_url: string;
    rol: string;
    carrera: string;
  };
}

export default function FriendsPage() {
  const [requests, setRequests] = useState<ConnectionItem[]>([])
  const [friends, setFriends] = useState<ConnectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchConnections = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const myId = session.user.id

      const { data: connections, error } = await supabase
        .from('connections')
        .select('*')
        .eq('type', 'FRIEND')
        .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)

      if (error) throw error

      if (!connections || connections.length === 0) {
        setRequests([])
        setFriends([])
        setLoading(false)
        return
      }

      const userIds = connections.map(c => c.sender_id === myId ? c.receiver_id : c.sender_id)

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, nombre, apellido, avatar_url, rol, carrera')
        .in('id', userIds)

      if (usersError) throw usersError

      const requestsList: ConnectionItem[] = []
      const friendsList: ConnectionItem[] = []

      connections.forEach(conn => {
        const isSender = conn.sender_id === myId
        const otherUserId = isSender ? conn.receiver_id : conn.sender_id
        const otherUser = usersData?.find(u => u.id === otherUserId)

        if (!otherUser) return

        const item: ConnectionItem = {
          connectionId: conn.id,
          user: otherUser
        }

        if (conn.status === 'ACCEPTED') {
          friendsList.push(item)
        } else if (conn.status === 'PENDING' && !isSender) {
          requestsList.push(item)
        }
      })

      setRequests(requestsList)
      setFriends(friendsList)
    } catch (error) {
      console.error('Error fetching connections:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConnections()
  }, [])

  const handleAccept = async (connectionId: string) => {
    setActionLoading(connectionId)
    try {
      await supabase.from('connections').update({ status: 'ACCEPTED' }).eq('id', connectionId)
      fetchConnections()
    } catch (error) {
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectOrRemove = async (connectionId: string) => {
    setActionLoading(connectionId)
    try {
      await supabase.from('connections').delete().eq('id', connectionId)
      fetchConnections()
    } catch (error) {
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Cargando red...</div>
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Friends & Connections
          </h1>
          <p className="text-muted-foreground mt-2">Manage your university network</p>
        </div>

        {requests.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">
              Friend Requests ({requests.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.map((req) => (
                <div key={req.connectionId} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg shadow-sm">
                  <Link href={`/profile/${req.user.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-primary flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {req.user.avatar_url ? (
                        <img src={req.user.avatar_url} alt={req.user.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary-foreground font-semibold">
                          {req.user.nombre.charAt(0)}{req.user.apellido.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="truncate">
                      <h3 className="font-semibold text-foreground truncate">{req.user.nombre} {req.user.apellido}</h3>
                      <p className="text-xs text-muted-foreground truncate">{req.user.rol}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 ml-4">
                    <button 
                      onClick={() => handleAccept(req.connectionId)}
                      disabled={actionLoading === req.connectionId}
                      className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors disabled:opacity-50"
                      title="Accept"
                    >
                      <Check size={18} />
                    </button>
                    <button 
                      onClick={() => handleRejectOrRemove(req.connectionId)}
                      disabled={actionLoading === req.connectionId}
                      className="p-2 bg-muted hover:bg-destructive hover:text-destructive-foreground text-foreground rounded-md transition-colors disabled:opacity-50"
                      title="Decline"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">
            My Friends ({friends.length})
          </h2>
          
          {friends.length === 0 ? (
            <div className="text-center py-10 bg-muted/20 border border-border rounded-lg">
              <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="font-medium text-foreground">No friends yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Visit profiles on the community feed to connect with others.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map((friend) => (
                <div key={friend.connectionId} className="flex flex-col p-4 bg-card border border-border rounded-lg shadow-sm hover:border-primary/50 transition-colors group">
                  <Link href={`/profile/${friend.user.id}`} className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-primary flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {friend.user.avatar_url ? (
                        <img src={friend.user.avatar_url} alt={friend.user.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary-foreground font-semibold">
                          {friend.user.nombre.charAt(0)}{friend.user.apellido.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="truncate">
                      <h3 className="font-semibold text-foreground truncate">{friend.user.nombre} {friend.user.apellido}</h3>
                      <p className="text-xs text-muted-foreground truncate">{friend.user.rol}</p>
                    </div>
                  </Link>
                  <button 
                    onClick={() => handleRejectOrRemove(friend.connectionId)}
                    disabled={actionLoading === friend.connectionId}
                    className="mt-auto w-full flex items-center justify-center gap-2 py-2 bg-secondary/50 hover:bg-destructive hover:text-destructive-foreground text-muted-foreground rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <UserMinus size={16} />
                    Unfriend
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}