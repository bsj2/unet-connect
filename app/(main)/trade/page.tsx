'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Plus, Tag, Loader2, Store, Upload, Image as ImageIcon, MessageCircle, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import Link from 'next/link'

const CATEGORIES = [
  "All",
  "Electronics & Hardware",
  "Digital Services",
  "Books & Academic",
  "Sports & Fitness",
  "Clothing",
  "Others"
]

export default function TradePage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Estados para el Formulario de Venta
  const [isSellOpen, setIsSellOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({ title: '', price: '', category: 'Electronics & Hardware', description: '', phone: '' })

  // Estado para ver Detalles del Producto
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)

  const fetchProducts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) setCurrentUserId(session.user.id)

      let query = supabase
        .from('products')
        .select('*, seller:users(id, nombre, apellido, avatar_url)')
        .eq('status', 'AVAILABLE')
        .order('created_at', { ascending: false })

      if (activeCategory !== "All") query = query.eq('category', activeCategory)
      if (searchQuery.trim()) query = query.ilike('title', `%${searchQuery}%`)

      const { data, error } = await query
      if (error) throw error
      setProducts(data || [])
    } catch (error) { console.error(error) } finally { setLoading(false) }
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => { fetchProducts() }, 300)
    return () => clearTimeout(delayDebounceFn)
  }, [activeCategory, searchQuery])

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId || !formData.title || !formData.price || !formData.phone) return
    setIsSubmitting(true)

    try {
      let imageUrl = null
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const filePath = `${currentUserId}/${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('products').upload(filePath, imageFile)
        if (uploadError) throw uploadError
        imageUrl = supabase.storage.from('products').getPublicUrl(filePath).data.publicUrl
      }

      const { error } = await supabase.from('products').insert({
        seller_id: currentUserId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        contact_phone: formData.phone.trim(),
        image_url: imageUrl
      })

      if (error) throw error

      setIsSellOpen(false)
      setFormData({ title: '', price: '', category: 'Electronics & Hardware', description: '', phone: '' })
      setImageFile(null)
      fetchProducts()
    } catch (error: any) { alert("Error publishing product: " + error.message) } finally { setIsSubmitting(false) }
  }

  const openWhatsApp = (product: any) => {
    // Limpiar el número de teléfono (deja solo los números)
    const cleanPhone = product.contact_phone?.replace(/\D/g, '') || ''
    const message = encodeURIComponent(`Hola ${product.seller?.nombre}, vengo de UNET-Trade y estoy interesado en: "${product.title}" que tienes en venta por $${product.price}. ¿Aún está disponible?`)
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank')
  }

  const handleDeleteProduct = async (productId: string, imageUrl: string | null) => {
    const isConfirmed = window.confirm("¿Estás seguro de que deseas eliminar este producto?")
    if (!isConfirmed) return

    try {
      // 1. Borrar la imagen del storage si existe
      if (imageUrl) {
        // Extraemos la ruta exacta del archivo desde la URL pública
        const filePath = imageUrl.split('/products/')[1]
        if (filePath) {
          await supabase.storage.from('products').remove([filePath])
        }
      }

      // 2. Borrar el registro de la base de datos
      const { error } = await supabase.from('products').delete().eq('id', productId)
      if (error) throw error

      // 3. Actualizar la interfaz
      setProducts(prev => prev.filter(p => p.id !== productId))
      setSelectedProduct(null)
    } catch (error: any) {
      alert("Error al eliminar el producto: " + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* CABECERA */}
      <div className="bg-card border-b border-border sticky top-16 z-30 px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Store className="w-6 h-6 text-primary" /><h1 className="text-xl font-bold text-foreground">UNET Trade</h1>
          </div>

          <div className="flex-1 w-full md:max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search items or services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {/* BOTÓN Y MODAL DE VENTA */}
          {currentUserId && (
            <Dialog open={isSellOpen} onOpenChange={setIsSellOpen}>
              <DialogTrigger className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors outline-none">
                <Plus size={18} /> Sell Something
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] bg-card border-border h-[85vh] sm:h-auto overflow-y-auto hide-scrollbar">
                <DialogHeader><DialogTitle>Publish an Item</DialogTitle></DialogHeader>
                <form onSubmit={handleSell} className="space-y-4 py-2">
                  
                  <div className="flex justify-center">
                    <label className="w-full h-40 border-2 border-dashed border-border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center text-muted-foreground overflow-hidden relative">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                      {imageFile ? (
                        <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <><ImageIcon size={32} className="mb-2" /><span className="text-sm">Upload Photo (Optional)</span></>
                      )}
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 col-span-2">
                      <label className="text-xs font-medium">Title *</label>
                      <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-muted border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="What are you selling?" />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Price ($) *</label>
                      <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-muted border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="0.00" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium">Category *</label>
                      <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-muted border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                        {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1 col-span-2">
                      <label className="text-xs font-medium">WhatsApp Number *</label>
                      <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-muted border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Ej: +58 414 1234567" />
                    </div>

                    <div className="space-y-1 col-span-2">
                      <label className="text-xs font-medium">Description</label>
                      <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-muted border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" rows={3} placeholder="Details about condition, delivery, etc." />
                    </div>
                  </div>

                  <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold flex items-center justify-center gap-2 mt-4">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Tag className="w-5 h-5" />} Publish Item
                  </button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* FILTROS */}
        <div className="max-w-7xl mx-auto mt-4 flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {CATEGORIES.map(category => (
            <button key={category} onClick={() => setActiveCategory(category)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${activeCategory === category ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-muted-foreground border-border hover:border-foreground/50'}`}>
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* GRID DE PRODUCTOS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
            <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" /><h3 className="text-lg font-semibold">No items found</h3>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map(product => (
              <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col group cursor-pointer">
                <div className="relative aspect-square bg-muted overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon className="opacity-20" size={48}/></div>
                  )}
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-semibold text-foreground text-sm line-clamp-2 mb-1">{product.title}</h3>
                  <span className="font-bold text-primary text-base mb-2">${product.price}</span>
                  
                  <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-2">
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-primary flex-shrink-0">
                      {product.seller?.avatar_url ? <img src={product.seller.avatar_url} className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-white font-bold text-[10px]">{product.seller?.nombre?.charAt(0)}</span>}
                    </div>
                    <span className="truncate">{product.seller?.nombre} {product.seller?.apellido}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE DETALLES DEL PRODUCTO */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border p-0 overflow-hidden">
          {selectedProduct && (
            <div className="flex flex-col">
              <div className="relative w-full aspect-video md:aspect-square max-h-[300px] bg-black flex items-center justify-center">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} className="w-full h-full object-contain" alt={selectedProduct.title} />
                ) : (
                  <ImageIcon className="text-white/20" size={64}/>
                )}
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <h2 className="text-xl font-bold text-foreground leading-tight">{selectedProduct.title}</h2>
                  <span className="text-2xl font-black text-primary">${selectedProduct.price}</span>
                </div>

                <div className="flex items-center gap-3 mb-6 p-3 bg-muted/50 rounded-lg">
                  <Link href={`/profile/${selectedProduct.seller_id}`} className="w-10 h-10 rounded-full bg-primary overflow-hidden flex-shrink-0 border border-border">
                    {selectedProduct.seller?.avatar_url ? <img src={selectedProduct.seller.avatar_url} className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-white font-bold">{selectedProduct.seller?.nombre?.charAt(0)}</span>}
                  </Link>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Seller</span>
                    <Link href={`/profile/${selectedProduct.seller_id}`} className="font-semibold text-foreground hover:underline">
                      {selectedProduct.seller?.nombre} {selectedProduct.seller?.apellido}
                    </Link>
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN: Dueño vs Comprador */}
                {selectedProduct.seller_id === currentUserId ? (
                  <button 
                    onClick={() => handleDeleteProduct(selectedProduct.id, selectedProduct.image_url)}
                    className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Trash2 size={20} />
                    Delete Item
                  </button>
                ) : (
                  <button 
                    onClick={() => openWhatsApp(selectedProduct)}
                    className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <MessageCircle size={20} />
                    Contact on WhatsApp
                  </button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}