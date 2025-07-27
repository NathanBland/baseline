import type { MetaFunction } from "@remix-run/node"
import { motion } from "motion/react"
import { GalleryVerticalEnd } from "lucide-react"

import { LoginForm } from "~/components/login-form"

export const meta: MetaFunction = () => {
  return [
    { title: "Sign In - Baseline" },
    { name: "description", content: "Sign in to your Baseline account" },
  ]
}

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex w-full max-w-sm flex-col gap-6"
      >
        <motion.a
          href="/"
          className="flex items-center gap-2 self-center font-medium"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          Baseline
        </motion.a>
        <LoginForm />
      </motion.div>
    </div>
  )
}
