'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Library, Plus, Users as UsersIcon, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from '@/components/ui/toast'

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')

  const fetchGroups = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) setCurrentUserId(session.user.id)

      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          group_members (count)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGroups(data || [])
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [])

  const handleCreateGroup = async () => {
    if (!currentUserId || !newGroupName.trim()) return
    setIsCreating(true)

    try {
      // 1. create the group in the groups table
      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: newGroupName.trim(),
          description: newGroupDesc.trim(),
          creator_id: currentUserId
        })
        .select()
        .single()

      if (groupError) throw groupError

      // 2. add the current user as an ADMIN in the group_members table
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: newGroup.id,
          user_id: currentUserId,
          role: 'ADMIN'
        })

      if (memberError) throw memberError

      // clean up and refresh
      setNewGroupName('')
      setNewGroupDesc('')
      setIsCreateOpen(false)
      fetchGroups()
      
    } catch (error: any) {
      toast.add({
        title: "Error",
        description: "Error creating group: " + error.message,
        type: "error",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* heading and create button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Library className="w-8 h-8 text-primary" />
              Communities & Groups
            </h1>
            <p className="text-muted-foreground mt-2">Join study groups, clubs, and faculty discussions.</p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger data-protected="true" className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 w-fit">
              <Plus size={18} />
              Create Group
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create a New Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Group Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Programación 1 - Sección 2"
                    className="w-full bg-muted/50 border border-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <textarea
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="What is this group about?"
                    className="w-full bg-muted/50 border border-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <button
                  onClick={handleCreateGroup}
                  disabled={isCreating || !newGroupName.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* group list */}
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Cargando grupos...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-lg">
            <Library className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="font-semibold text-foreground">No groups yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Be the first to create a community for your classes!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <Link 
                key={group.id} 
                href={`/groups/${group.id}`}
                className="flex flex-col p-5 bg-card border border-border rounded-xl shadow-sm hover:border-primary/50 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Library size={24} />
                </div>
                <h3 className="font-bold text-foreground text-lg mb-1 truncate">{group.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                  {group.description || "No description provided."}
                </p>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mt-auto pt-4 border-t border-border/50">
                  <UsersIcon size={14} />
                  <span>{group.group_members[0]?.count || 0} members</span>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}