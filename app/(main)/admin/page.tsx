'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ShieldAlert, Trash2, Ban, CheckCircle, Store, AlertTriangle, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [reports, setReports] = useState<any[]>([])
  const [pendingProducts, setPendingProducts] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    const checkAdminAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return setLoading(false)

      setCurrentUserId(session.user.id)

      const { data: profile } = await supabase.from('users').select('rol').eq('id', session.user.id).single()
      
      if (profile?.rol === 'Professor' || profile?.rol === 'Staff') {
        setIsAdmin(true)
        fetchAdminData()
      } else {
        setLoading(false)
      }
    }

    checkAdminAndFetchData()
  }, [])

  const fetchAdminData = async () => {
    try {
      const { data: repData } = await supabase
        .from('reports')
        .select('*, posts(content, user_id, users(nombre, apellido)), reporter:users!reporter_id(nombre, apellido)')
        .eq('status', 'PENDING')
      setReports(repData || [])

      const { data: prodData } = await supabase
        .from('products')
        .select('*, seller:users(id, nombre, apellido)')
        .eq('status', 'PENDING')
      setPendingProducts(prodData || [])

      const { data: userData } = await supabase
        .from('users')
        .select('id, nombre, apellido, rol, is_banned')
        .order('nombre', { ascending: true })
      setUsers(userData || [])

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // --- MODERATION ACTIONS ---

  const handleDismissReport = async (reportId: string) => {
    await supabase.from('reports').update({ status: 'DISMISSED' }).eq('id', reportId)
    setReports(prev => prev.filter(r => r.id !== reportId))
  }

  const handleDeleteReportedPost = async (reportId: string, postId: string) => {
    await supabase.from('posts').delete().eq('id', postId) 
    setReports(prev => prev.filter(r => r.id !== reportId))
  }

  const handleProductApproval = async (productId: string, status: 'AVAILABLE' | 'REJECTED') => {
    await supabase.from('products').update({ status }).eq('id', productId)
    setPendingProducts(prev => prev.filter(p => p.id !== productId))
  }

  const toggleUserBan = async (userId: string, currentBanStatus: boolean) => {
    // Validación de seguridad para no banearse a sí mismo
    if (userId === currentUserId) {
      alert("You cannot ban yourself.")
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_banned: !currentBanStatus })
        .eq('id', userId)

      if (error) throw error

      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_banned: !currentBanStatus } : u
      ))
      
    } catch (error: any) {
      alert("Error updating ban status: " + error.message)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>
  
  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
      <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
      <p className="text-muted-foreground mt-2">This module is restricted to Professors and Staff only.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            Administration & Moderation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage reports, marketplace approvals, and user security.</p>
        </div>

        <Tabs defaultValue="reports" className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md h-auto">
            <TabsTrigger value="reports" className="flex gap-2 py-2"><AlertTriangle size={16}/> Reports</TabsTrigger>
            <TabsTrigger value="marketplace" className="flex gap-2 py-2"><Store size={16}/>Approvals</TabsTrigger>
            <TabsTrigger value="users" className="flex gap-2 py-2"><Ban size={16}/> Users & Bans</TabsTrigger>
          </TabsList>

          {/* TAB 1: REPORTS */}
          <TabsContent value="reports" className="mt-6 space-y-4 outline-none">
            {reports.length === 0 ? (
              <p className="text-muted-foreground p-8 text-center bg-card rounded-lg border border-border">No pending reports.</p>
            ) : (
              reports.map(report => (
                <div key={report.id} className="p-4 bg-card border border-destructive/30 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-destructive uppercase">Reported by: {report.reporter?.nombre}</span>
                    <p className="font-semibold text-foreground mt-1">Reason: {report.reason}</p>
                    <div className="mt-3 p-3 bg-muted rounded-md text-sm border-l-2 border-primary">
                      <span className="text-xs text-muted-foreground block mb-1">Post by {report.posts?.users?.nombre}:</span>
                      "{report.posts?.content}"
                    </div>
                  </div>
                  <div className="flex sm:flex-col gap-2 min-w-[140px]">
                    <button onClick={() => handleDeleteReportedPost(report.id, report.post_id)} className="flex-1 bg-destructive hover:bg-destructive/90 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2">
                      <Trash2 size={16} /> Delete Post
                    </button>
                    <button onClick={() => handleDismissReport(report.id)} className="flex-1 bg-secondary text-foreground px-3 py-2 rounded-md text-sm font-medium border border-border hover:bg-secondary/80">
                      Dismiss Report
                    </button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* TAB 2: MARKETPLACE */}
          <TabsContent value="marketplace" className="mt-6 space-y-4 outline-none">
            {pendingProducts.length === 0 ? (
              <p className="text-muted-foreground p-8 text-center bg-card rounded-lg border border-border">No products pending approval.</p>
            ) : (
              pendingProducts.map(product => (
                <div key={product.id} className="p-4 bg-card border border-border rounded-lg shadow-sm flex flex-col sm:flex-row gap-4 items-center">
                  <div className="w-24 h-24 bg-muted rounded-md overflow-hidden flex-shrink-0">
                    {product.image_url && <img src={product.image_url} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 w-full">
                    <h3 className="font-bold text-foreground">{product.title} <span className="text-primary ml-2">${product.price}</span></h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
                    <span className="text-xs font-medium text-muted-foreground mt-2 block">Seller: {product.seller?.nombre} {product.seller?.apellido}</span>
                  </div>
                  <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                    <button onClick={() => handleProductApproval(product.id, 'AVAILABLE')} className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2">
                      <CheckCircle size={16} /> Approve
                    </button>
                    <button onClick={() => handleProductApproval(product.id, 'REJECTED')} className="flex-1 bg-destructive hover:bg-destructive/90 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2">
                      <Trash2 size={16} /> Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* TAB 3: USERS AND BANS */}
          <TabsContent value="users" className="mt-6 outline-none">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3 hidden sm:table-cell">Role</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map(u => (
                    <tr key={u.id} className={u.is_banned ? 'bg-destructive/5' : ''}>
                      <td className="px-6 py-4 font-medium text-foreground">{u.nombre} {u.apellido}</td>
                      <td className="px-6 py-4 hidden sm:table-cell">{u.rol}</td>
                      <td className="px-6 py-4 text-right">
                        {u.id !== currentUserId ? (
                          <button 
                            onClick={() => toggleUserBan(u.id, u.is_banned)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center justify-end gap-1.5 ml-auto transition-colors ${u.is_banned ? 'bg-secondary text-foreground border border-border hover:bg-secondary/80' : 'bg-destructive/10 text-destructive hover:bg-destructive hover:text-white'}`}
                          >
                            <Ban size={14} /> {u.is_banned ? 'Unban User' : 'Ban User'}
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground px-3 py-1.5">You</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}