import { useState } from "react"
import { motion } from "motion/react"
import { 
  Image, 
  Video, 
  Link, 
  File, 
  Download,
  ExternalLink,
  Play,
  Pause
} from "lucide-react"

import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"

export interface ContentBlock {
  id: string
  type: 'text' | 'image' | 'video' | 'link' | 'file'
  content: string
  metadata?: {
    filename?: string
    fileSize?: number
    mimeType?: string
    url?: string
    title?: string
    description?: string
    thumbnail?: string
    duration?: number
  }
}

interface ContentBlockRendererProps {
  block: ContentBlock
  isOwn?: boolean
}

export function ContentBlockRenderer({ block, isOwn = false }: ContentBlockRendererProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const renderTextBlock = () => (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <p className="whitespace-pre-wrap break-words">{block.content}</p>
    </div>
  )

  const renderImageBlock = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative max-w-sm"
    >
      <img
        src={block.content}
        alt={block.metadata?.filename || "Shared image"}
        className={`rounded-lg max-w-full h-auto transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setImageLoaded(true)}
        loading="lazy"
      />
      {!imageLoaded && (
        <div className="absolute inset-0 bg-muted rounded-lg flex items-center justify-center">
          <Image className="h-8 w-8 text-muted-foreground animate-pulse" />
        </div>
      )}
      {block.metadata?.filename && (
        <p className="text-xs text-muted-foreground mt-2">
          {block.metadata.filename}
        </p>
      )}
    </motion.div>
  )

  const renderVideoBlock = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative max-w-md"
    >
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Video className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {block.metadata?.filename || "Video file"}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {block.metadata?.duration && (
                  <span>{Math.floor(block.metadata.duration / 60)}:{(block.metadata.duration % 60).toString().padStart(2, '0')}</span>
                )}
                {block.metadata?.fileSize && (
                  <span>• {(block.metadata.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  const renderLinkBlock = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-md"
    >
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {block.metadata?.thumbnail ? (
              <img
                src={block.metadata.thumbnail}
                alt=""
                className="w-16 h-16 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 bg-muted rounded flex items-center justify-center flex-shrink-0">
                <Link className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium line-clamp-2">
                {block.metadata?.title || block.content}
              </p>
              {block.metadata?.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {block.metadata.description}
                </p>
              )}
              <div className="flex items-center gap-1 mt-2">
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate">
                  {new URL(block.content).hostname}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  const renderFileBlock = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-sm"
    >
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <File className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {block.metadata?.filename || "Unknown file"}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {block.metadata?.mimeType && (
                  <Badge variant="secondary" className="text-xs">
                    {block.metadata.mimeType.split('/')[1]?.toUpperCase()}
                  </Badge>
                )}
                {block.metadata?.fileSize && (
                  <span>{(block.metadata.fileSize / 1024).toFixed(1)} KB</span>
                )}
              </div>
            </div>
            <Button size="sm" variant="ghost">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  const renderBlock = () => {
    switch (block.type) {
      case 'text':
        return renderTextBlock()
      case 'image':
        return renderImageBlock()
      case 'video':
        return renderVideoBlock()
      case 'link':
        return renderLinkBlock()
      case 'file':
        return renderFileBlock()
      default:
        return renderTextBlock()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`${isOwn ? 'ml-auto' : 'mr-auto'}`}
    >
      {renderBlock()}
    </motion.div>
  )
}

// Content block input component for composing messages
interface ContentBlockInputProps {
  onAddBlock: (block: Omit<ContentBlock, 'id'>) => void
}

export function ContentBlockInput({ onAddBlock }: ContentBlockInputProps) {

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // TODO: Implement actual file upload to API
    const block: Omit<ContentBlock, 'id'> = {
      type: file.type.startsWith('image/') ? 'image' : 
            file.type.startsWith('video/') ? 'video' : 'file',
      content: URL.createObjectURL(file), // Temporary URL for preview
      metadata: {
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type
      }
    }

    onAddBlock(block)
  }

  return (
    <div className="flex gap-2">
      <input
        type="file"
        accept="image/*,video/*,*/*"
        onChange={handleFileUpload}
        className="hidden"
        id="file-upload"
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <File className="h-4 w-4" />
      </Button>
    </div>
  )
}
