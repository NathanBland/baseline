import { LoaderFunctionArgs, json, redirect } from "@remix-run/node"
import { useLoaderData, useNavigate } from "@remix-run/react"
import { useEffect } from "react"

// This route file handles individual conversation URLs like /chat/123456
export async function loader({ params }: LoaderFunctionArgs) {
  const { conversationId } = params
  
  if (!conversationId) {
    throw redirect("/chat")
  }
  
  // Return the conversation ID to be used by the chat component
  return json({ conversationId })
}

export default function ConversationRoute() {
  const { conversationId } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  
  // This component will be rendered inside the chat layout
  // The actual chat logic remains in the parent chat route
  // This just ensures the URL parameter is available
  
  useEffect(() => {
    // Trigger conversation selection in parent component via URL change
    // The parent chat route will handle this
  }, [conversationId])
  
  // This route doesn't render anything - it's handled by the parent layout
  return null
}
