import type { MetaFunction } from "@remix-run/node"
import { useState } from "react"
import { motion } from "motion/react"

import { UserSettings } from "~/components/user-settings"

export const meta: MetaFunction = () => {
  return [
    { title: "Settings - Baseline" },
    { name: "description", content: "Manage your Baseline account settings" },
  ]
}

// Mock user data - will be replaced with actual API calls
const mockUser = {
  id: "current-user",
  name: "John Doe",
  email: "john.doe@example.com",
  avatar: undefined
}

export default function SettingsPage() {
  const [user, setUser] = useState(mockUser)

  const handleLogout = () => {
    // TODO: Implement actual logout with API
    console.log("Logging out...")
    // Redirect to login page
    window.location.href = "/"
  }

  const handleUpdateProfile = async (data: { name: string; email: string }) => {
    // TODO: Implement actual profile update with API
    console.log("Updating profile:", data)
    setUser(prev => ({ ...prev, ...data }))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background"
    >
      <UserSettings
        user={user}
        onLogout={handleLogout}
        onUpdateProfile={handleUpdateProfile}
      />
    </motion.div>
  )
}
