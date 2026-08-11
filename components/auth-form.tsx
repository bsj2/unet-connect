'use client'

import { useState } from 'react'
import { Mail, Lock, User, CreditCard, GraduationCap, BookOpen, Hash } from 'lucide-react'
import { supabase } from '@/lib/supabase' 
import { useRouter } from 'next/navigation' 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function AuthForm() {
  const router = useRouter()
  
  const [isLogin, setIsLogin] = useState(true)
  const [emailPrefix, setEmailPrefix] = useState('')
  const [password, setPassword] = useState('')
  const [docType, setDocType] = useState('V')
  const [cedula, setCedula] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('')
  const [major, setMajor] = useState('')
  const [semester, setSemester] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [showVerifyDialog, setShowVerifyDialog] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    
    const fullEmail = `${emailPrefix}@unet.edu.ve`

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: fullEmail,
          password,
        })
        
        if (error) throw error
        
        router.push('/')
        
      } else {
        const fullCedula = `${docType}-${cedula}`
        
        const { error: authError } = await supabase.auth.signUp({
          email: fullEmail,
          password,
          options: {
            data: {
              carnet: fullCedula,
              nombre: firstName,
              apellido: lastName,
              rol: role,
              carrera: major,
              semestre: semester
            }
          }
        })

        if (authError) throw authError

        setShowVerifyDialog(true)
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-card border border-border rounded-xl shadow-sm">
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 text-red-500 text-sm rounded-md">
          {errorMsg}
        </div>
      )}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          {isLogin ? 'Sign In' : 'Create Account'}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {isLogin
            ? 'Sign in to your UNET Connect account'
            : 'Join the university social network'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <>
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    required 
                    type="text" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                    placeholder="John" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Last Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    required 
                    type="text" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                    placeholder="Doe" 
                  />
                </div>
              </div>
            </div>

            {/* Cédula Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">ID Card (Cédula)</label>
              <div className="flex rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-primary overflow-hidden transition-all">
                <select 
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="bg-muted/50 border-r border-input px-3 py-2 text-sm font-medium text-foreground focus:outline-none appearance-none"
                >
                  <option value="V">V</option>
                  <option value="E">E</option>
                </select>
                <div className="relative flex-1">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    required 
                    type="text" 
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-9 pr-4 py-2 bg-transparent text-sm focus:outline-none" 
                    placeholder="12345678" 
                    maxLength={9}
                  />
                </div>
              </div>
            </div>

            {/* Role and Major Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Role</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <select 
                    required 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                  >
                    <option value="">Select...</option>
                    <option value="Student">Student</option>
                    <option value="Professor">Professor</option>
                    <option value="Alumni">Alumni</option>
                    <option value="Staff">Administrative Staff</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Major</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <select 
                    required 
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                  >
                    <option value="">Select...</option>
                    <option value="Computer Engineering">Computer Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Industrial Engineering">Industrial Engineering</option>
                    <option value="Animal Production Engineering">Animal Production Engineering</option>
                    <option value="Electronic Engineering">Electronic Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Environmental Engineering">Environmental Engineering</option>
                    <option value="Agronomic Engineering">Agronomic Engineering</option>
                    <option value="Agroindustrial Engineering">Agroindustrial Engineering</option>
                    <option value="Architecture">Architecture</option>
                    <option value="Music">Music</option>
                    <option value="Psychology">Psychology</option>
                    <option value="Sports Training">Sports Training</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Semester Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Current Semester</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  required 
                  type="number" 
                  min="1" 
                  max="10" 
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                  placeholder="E.g. 5" 
                />
              </div>
            </div>
          </>
        )}

        {/* Username / Email Prefix Field */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Institutional Username</label>
          <div className="flex rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-primary overflow-hidden transition-all">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                required 
                type="text" 
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                value={emailPrefix}
                onChange={(e) => setEmailPrefix(e.target.value.toLowerCase().trim())}
                className="w-full pl-9 pr-2 py-2 bg-transparent text-sm focus:outline-none" 
                placeholder="john.doe" 
              />
            </div>
            <div className="flex items-center px-3 bg-muted/50 border-l border-input text-muted-foreground text-sm font-medium select-none pointer-events-none">
              @unet.edu.ve
            </div>
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              required 
              type="password" 
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
              placeholder="••••••••" 
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-2 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium text-sm transition-colors mt-4 disabled:opacity-50"
        >
          {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-muted-foreground">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
        </span>
        <button 
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="text-primary hover:underline font-medium"
        >
          {isLogin ? 'Sign up here' : 'Sign in'}
        </button>
      </div>

      <AlertDialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account Created!</AlertDialogTitle>
            <AlertDialogDescription>
              Please check your institutional email to verify your account before signing in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => {
                setShowVerifyDialog(false)
                setIsLogin(true)
              }}
            >
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}