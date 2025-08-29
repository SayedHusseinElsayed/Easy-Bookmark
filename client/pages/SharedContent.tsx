import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Board, Folder, Link, supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink, Globe, FolderOpen, Bookmark } from 'lucide-react'
import NotFound from './NotFound'

interface SharedData {
  resource: Board | Folder | Link
  resourceType: 'board' | 'folder' | 'link'
  shareInfo: {
    shared_by: string
    created_at: string
  }
}

export default function SharedContent() {
  const { type, token } = useParams<{ type: string; token: string }>()
  const [sharedData, setSharedData] = useState<SharedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [links, setLinks] = useState<Link[]>([])

  useEffect(() => {
    if (type && token) {
      fetchSharedContent()
    }
  }, [type, token])

  const fetchSharedContent = async () => {
    if (!type || !token) return

    try {
      // First, verify the share token
      const { data: shareData, error: shareError } = await supabase
        .from('share_links')
        .select('*')
        .eq('share_token', token)
        .eq('resource_type', type)
        .single()

      if (shareError || !shareData) {
        setError('Share link not found or expired')
        setLoading(false)
        return
      }

      // Check if expired
      if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
        setError('Share link has expired')
        setLoading(false)
        return
      }

      // Fetch the actual resource
      let resourceData
      if (type === 'board') {
        const { data, error } = await supabase
          .from('boards')
          .select('*')
          .eq('id', shareData.resource_id)
          .single()

        if (error) throw error
        resourceData = data

        // Also fetch folders for the board
        const { data: foldersData, error: foldersError } = await supabase
          .from('folders')
          .select('*')
          .eq('board_id', shareData.resource_id)
          .order('position')

        if (!foldersError && foldersData) {
          setFolders(foldersData)

          // Fetch all links for all folders
          const folderIds = foldersData.map(f => f.id)
          if (folderIds.length > 0) {
            const { data: linksData, error: linksError } = await supabase
              .from('links')
              .select('*')
              .in('folder_id', folderIds)
              .order('position')

            if (!linksError && linksData) {
              setLinks(linksData)
            }
          }
        }
      } else if (type === 'folder') {
        const { data, error } = await supabase
          .from('folders')
          .select('*')
          .eq('id', shareData.resource_id)
          .single()

        if (error) throw error
        resourceData = data

        // Fetch links for the folder
        const { data: linksData, error: linksError } = await supabase
          .from('links')
          .select('*')
          .eq('folder_id', shareData.resource_id)
          .order('position')

        if (!linksError && linksData) {
          setLinks(linksData)
        }
      } else if (type === 'link') {
        const { data, error } = await supabase
          .from('links')
          .select('*')
          .eq('id', shareData.resource_id)
          .single()

        if (error) throw error
        resourceData = data
      }

      if (!resourceData) {
        setError('Content not found')
        setLoading(false)
        return
      }

      setSharedData({
        resource: resourceData,
        resourceType: type as 'board' | 'folder' | 'link',
        shareInfo: {
          shared_by: shareData.shared_by,
          created_at: shareData.created_at,
        },
      })
    } catch (error) {
      console.error('Error fetching shared content:', error)
      setError('Failed to load shared content')
    } finally {
      setLoading(false)
    }
  }

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`
    } catch {
      return null
    }
  }

  const renderLinkItem = (link: Link) => (
    <div key={link.id} className="flex items-center p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-center flex-1 min-w-0">
        <div className="flex-shrink-0 mr-3">
          {getFaviconUrl(link.url) ? (
            <img 
              src={getFaviconUrl(link.url)} 
              alt="" 
              className="w-4 h-4"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                if (nextElement) nextElement.style.display = 'block'
              }}
            />
          ) : null}
          <Globe className="w-4 h-4 text-gray-400" style={{ display: 'none' }} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {link.title}
            </h4>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-600"
            >
              <ExternalLink className="w-3 h-3 text-gray-400" />
            </a>
          </div>
          {link.description && (
            <p className="text-xs text-gray-500 truncate mt-1">
              {link.description}
            </p>
          )}
          <p className="text-xs text-blue-600 truncate mt-1">
            {link.url}
          </p>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading shared content...</p>
        </div>
      </div>
    )
  }

  if (error || !sharedData) {
    return <NotFound />
  }

  const { resource, resourceType } = sharedData

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">BH</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {'name' in resource ? resource.name : resource.title}
              </h1>
              <p className="text-sm text-gray-500">
                Shared {resourceType} from BookmarkHub
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {resourceType === 'board' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-6">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: (resource as Board).color }}
              />
              <h2 className="text-xl font-semibold text-gray-900">Folders</h2>
            </div>

            {folders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {folders.map(folder => {
                  const folderLinks = links.filter(link => link.folder_id === folder.id)
                  return (
                    <Card key={folder.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: folder.color }}
                          />
                          <CardTitle className="text-base">{folder.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {folderLinks.map(renderLinkItem)}
                          {folderLinks.length === 0 && (
                            <div className="text-center py-4 text-gray-500">
                              <p className="text-sm">No links in this folder</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No folders</h3>
                <p className="mt-1 text-sm text-gray-500">This board doesn't have any folders yet.</p>
              </div>
            )}
          </div>
        )}

        {resourceType === 'folder' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-6">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: (resource as Folder).color }}
              />
              <h2 className="text-xl font-semibold text-gray-900">Links</h2>
            </div>

            {links.length > 0 ? (
              <div className="space-y-3">
                {links.map(renderLinkItem)}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bookmark className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No links</h3>
                <p className="mt-1 text-sm text-gray-500">This folder doesn't have any links yet.</p>
              </div>
            )}
          </div>
        )}

        {resourceType === 'link' && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-6">
                {renderLinkItem(resource as Link)}
                <div className="mt-4 text-center">
                  <Button asChild>
                    <a
                      href={(resource as Link).url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Visit Link
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center border-t border-gray-200 pt-8">
          <p className="text-sm text-gray-500">
            Powered by{' '}
            <a
              href="/"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              BookmarkHub
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
