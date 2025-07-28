import { useState } from "react"
import { motion } from "motion/react"
import { 
  Settings, 
  User, 
  Bell, 
  Palette, 
  Shield, 
  LogOut,
  Moon,
  Sun,
  Monitor
} from "lucide-react"

import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Separator } from "~/components/ui/separator"
import { Switch } from "~/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"

interface UserSettingsProps {
  user: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  onLogout: () => void
  onUpdateProfile: (data: { name: string; email: string }) => void
}

export function UserSettings({ user, onLogout, onUpdateProfile }: UserSettingsProps) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [notifications, setNotifications] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [isLoading, setIsLoading] = useState(false)

  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      await onUpdateProfile({ name, email })
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to update profile:', error)
      // TODO: Show error toast
    } finally {
      setIsLoading(false)
    }
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    // TODO: Implement theme switching logic
    console.log('Theme changed to:', newTheme)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto p-6 space-y-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>
            Manage your account information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-lg">
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm" disabled>
              Change Avatar (Coming Soon)
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleSaveProfile}
            disabled={isLoading || (name === user.name && email === user.email)}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Settings - Temporarily disabled due to hydration issues */}
      {/* TODO: Re-enable notification settings after fixing hydration */}

      {/* Privacy & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Security
          </CardTitle>
          <CardDescription>
            Manage your privacy and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full justify-start" disabled>
            Change Password (Coming Soon)
          </Button>
          <Button variant="outline" className="w-full justify-start" disabled>
            Download Data (Coming Soon)
          </Button>
          <Button variant="outline" className="w-full justify-start" disabled>
            Privacy Settings (Coming Soon)
          </Button>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the look and feel of the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleThemeChange('light')}
                className="flex items-center gap-2"
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleThemeChange('dark')}
                className="flex items-center gap-2"
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleThemeChange('system')}
                className="flex items-center gap-2"
              >
                <Monitor className="h-4 w-4" />
                System
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardContent className="pt-6">
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button 
              variant="destructive" 
              onClick={onLogout}
              className="w-full flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
