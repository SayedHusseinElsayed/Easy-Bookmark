import React, { useState } from 'react'
import { Board, Folder, Link, supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Copy, Check, Share } from 'lucide-react'

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resource: Board | Folder | Link | null
  resourceType: 'board' | 'folder' | 'link'
}

export default function ShareDialog({ open, onOpenChange, resource, resourceType }: ShareDialogProps) {
  const [loading, setLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateShareLink = async () => {
    if (!resource) return

    setLoading(true)
    setError(null)

    try {
      // Generate a random share token
      const shareToken = crypto.randomUUID()
      
      // Insert share record
      const { data, error } = await supabase
        .from('share_links')
        .insert([
          {
            resource_type: resourceType,
            resource_id: resource.id,
            shared_by: (await supabase.auth.getUser()).data.user?.id,
            share_token: shareToken,
          },
        ])
        .select()
        .single()

      if (error) throw error

      // Generate the shareable URL
      const baseUrl = window.location.origin
      const url = `${baseUrl}/shared/${resourceType}/${shareToken}`
      setShareUrl(url)
    } catch (error) {
      console.error('Error generating share link:', error)
      setError('Failed to generate share link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setShareUrl(null)
      setError(null)
      setCopied(false)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share className="h-5 w-5" />
            <span>Share {resourceType}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {resource && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-sm text-gray-900">
                {'name' in resource ? resource.name : resource.title}
              </p>
              <p className="text-xs text-gray-500">
                {resourceType === 'board' && 'Board'}
                {resourceType === 'folder' && 'Folder'}
                {resourceType === 'link' && `Link: ${(resource as Link).url}`}
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!shareUrl ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Generate a shareable link that allows others to view this {resourceType} without signing in.
              </p>
              <Button onClick={generateShareLink} disabled={loading} className="w-full">
                {loading ? 'Generating...' : 'Generate Share Link'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="share-url">Share URL</Label>
                <div className="flex space-x-2 mt-1">
                  <Input
                    id="share-url"
                    value={shareUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyToClipboard}
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Alert>
                <AlertDescription className="text-sm">
                  Anyone with this link can view the {resourceType}. The link will remain active until you delete the {resourceType}.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
