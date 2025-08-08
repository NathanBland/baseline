import { useState } from "react"
import { useNavigate } from "@remix-run/react"
import { motion } from "motion/react"
import { Eye, EyeOff, GalleryVerticalEnd } from "lucide-react"
import { OAuthProviders } from "./oauth-providers"

import { apiService } from "~/lib/api"

import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Checkbox } from "~/components/ui/checkbox"

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    
    const formData = new FormData(event.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const name = formData.get("name") as string
    const confirmPassword = formData.get("confirmPassword") as string
    
    console.log('Form submission started', { isSignUp, email, name });
    
    try {
      if (isSignUp) {
        console.log('Processing sign-up flow...');
        // Validate passwords match
        if (password !== confirmPassword) {
          const errorMsg = 'Passwords do not match!';
          console.error('Validation error:', errorMsg);
          setError(errorMsg);
          setIsLoading(false);
          return;
        }
        
        console.log('Calling apiService.register...');
        // Register new user
        const response = await apiService.register(email, password, name);
        console.log('Registration API response:', response);
        
        // Verify user is set in localStorage
        const storedUser = localStorage.getItem('current_user');
        const authToken = localStorage.getItem('auth_token');
        console.log('After registration - localStorage state:', { 
          hasUser: !!storedUser,
          hasAuthToken: !!authToken,
          user: storedUser ? JSON.parse(storedUser) : null
        });
        
        console.log('Registration successful!');
      } else {
        console.log('Processing login flow...');
        // Login existing user
        const response = await apiService.login(email, password);
        console.log('Login API response:', response);
        console.log('Login successful!');
      }
      
      // Verify navigation state before redirecting
      console.log('Preparing to navigate to /chat');
      console.log('Current location before navigate:', window.location.pathname);
      
      // Use replace: true to avoid adding to history stack
      navigate("/chat", { replace: true });
      
      console.log('Navigate method called, waiting for navigation...');
      
      // Add a small delay to ensure navigation starts
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error("Authentication error:", error);
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      console.error('Error details:', { error, message: errorMessage });
      setError(errorMessage);
    } finally {
      console.log('Form submission completed, setting loading to false');
      setIsLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="flex justify-center mb-4"
          >
            <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-lg">
              <GalleryVerticalEnd className="size-6" />
            </div>
          </motion.div>
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? "Create your account" : "Welcome back"}
          </CardTitle>
          <CardDescription>
            {isSignUp ? "Create your account to get started" : "Enter your email below to login to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md"
            >
              {error}
            </motion.div>
          )}
          <form onSubmit={handleSubmit} className="grid gap-4">
            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  required={isSignUp}
                  disabled={isLoading}
                />
              </motion.div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "Hide password" : "Show password"}
                  </span>
                </Button>
              </div>
            </div>
            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    required={isSignUp}
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {showConfirmPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>
              </motion.div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="rememberMe" name="rememberMe" />
                <Label 
                  htmlFor="rememberMe" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Remember me
                </Label>
              </div>
              <Button variant="link" className="px-0 text-sm">
                Forgot password?
              </Button>
            </div>
            <motion.div
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.1 }}
            >
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                  />
                ) : (
                  isSignUp ? "Create Account" : "Sign in"
                )}
              </Button>
            </motion.div>
            
            
            <OAuthProviders />
          </form>
          
          <div className="mt-4 text-center text-sm">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <Button 
                  variant="link" 
                  className="px-0"
                  onClick={() => setIsSignUp(false)}
                  disabled={isLoading}
                >
                  Sign in
                </Button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <Button 
                  variant="link" 
                  className="px-0"
                  onClick={() => setIsSignUp(true)}
                  disabled={isLoading}
                >
                  Sign up
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
