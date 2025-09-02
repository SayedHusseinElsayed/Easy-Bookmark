import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Board, Folder, Link, supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Share,
  FolderPlus,
  ExternalLink,
  GripVertical
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ShareDialog from '@/components/ShareDialog'
import { Favicon } from '@/components/Favicon'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { fetchTitle } from '@/lib/link-utils'

interface MainContentProps {
  selectedBoard: Board | null
  searchQuery: string
}

interface FolderCardProps {
  folder: Folder
  onEdit: (folder: Folder) => void
  onDelete: (folderId: string) => void
  onShare: (folder: Folder) => void
  attributes?: any
  listeners?: any
  searchQuery: string
}

interface SortableFolderCardProps extends FolderCardProps {
  folder: Folder
}

interface LinkItemProps {
  link: Link
  onEdit: (link: Link) => void
  onDelete: (linkId: string) => void
  onShare: (link: Link) => void
}
interface LinkItemPropsWithSearch extends LinkItemProps {
  searchQuery: string
}

function LinkItem({ link, onEdit, onDelete, onShare, searchQuery }: LinkItemPropsWithSearch) {
  const isMatch = useMemo(() => {
    if (!searchQuery) return false
    const lowerCaseQuery = searchQuery.toLowerCase()
    return (
      link.title.toLowerCase().includes(lowerCaseQuery) ||
      link.url.toLowerCase().includes(lowerCaseQuery) ||
      (link.description || '').toLowerCase().includes(lowerCaseQuery)
    )
  }, [searchQuery, link])

  return (
    <div className={cn("group flex items-center p-3 border border-gray-200 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 cursor-pointer", isMatch && "ring-2 ring-blue-500")}>
      <div className="flex items-center flex-1 min-w-0">
        <div className="flex-shrink-0 mr-3">
          <Favicon url={link.url} />
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
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ExternalLink className="w-3 h-3 text-gray-400 hover:text-gray-600" />
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(link)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onShare(link)}>
            <Share className="mr-2 h-4 w-4" />
            Share
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onDelete(link.id)}
            className="text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function FolderCard({ folder, onEdit, onDelete, onShare, attributes, listeners, searchQuery }: FolderCardProps) {
  const [links, setLinks] = useState<Link[]>([])
  const [showAddLinkDialog, setShowAddLinkDialog] = useState(false)
  const [editingLink, setEditingLink] = useState<Link | null>(null)
  const [linkShareDialog, setLinkShareDialog] = useState<{ open: boolean; link: Link | null }>({ open: false, link: null })
  const [linkTitle, setLinkTitle] = useState('');

  const isMatch = useMemo(() => {
    if (!searchQuery) return false
    const lowerCaseQuery = searchQuery.toLowerCase()
    return folder.name.toLowerCase().includes(lowerCaseQuery)
  }, [searchQuery, folder])


  useEffect(() => {
    fetchLinks()
  }, [folder])

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('folder_id', folder.id)
        .order('position', { ascending: true })

      if (error) throw error
      setLinks(data || [])
    } catch (error) {
      console.error('Error fetching links:', error)
    }
  }

  const handleUrlPaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedUrl = e.clipboardData.getData('text');
    if (pastedUrl) {
      const title = await fetchTitle(pastedUrl);
      setLinkTitle(title);
    }
  };

  const createLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const url = formData.get('url') as string
    const description = formData.get('description') as string
    let title = linkTitle;

    if (!title) {
      title = await fetchTitle(url)
    }

    try {
      const { data, error } = await supabase
        .from('links')
        .insert([
          {
            title,
            url,
            description: description || null,
            folder_id: folder.id,
            position: links.length,
          },
        ])
        .select()
        .single()

      if (error) throw error
      
      setLinks([...links, data])
      setShowAddLinkDialog(false)
      setLinkTitle('')
    } catch (error) {
      console.error('Error creating link:', error)
    }
  }

  const updateLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingLink) return

    const formData = new FormData(e.currentTarget)
    const title = formData.get('title') as string
    const url = formData.get('url') as string
    const description = formData.get('description') as string

    try {
      const { data, error } = await supabase
        .from('links')
        .update({
          title, 
          url, 
          description: description || null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', editingLink.id)
        .select()
        .single()

      if (error) throw error
      
      setLinks(links.map(l => l.id === editingLink.id ? data : l))
      setEditingLink(null)
    } catch (error) {
      console.error('Error updating link:', error)
    }
  }

  const deleteLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', linkId)

      if (error) throw error
      
      setLinks(links.filter(l => l.id !== linkId))
    } catch (error) {
      console.error('Error deleting link:', error)
    }
  }

  const handleShareLink = (link: Link) => {
    setLinkShareDialog({ open: true, link })
  }

  const addCurrentTabs = async () => {
    // Since we can't access browser tabs directly in a web app,
    // we'll show a simple dialog for users to paste URLs
    const urls = prompt('Paste URLs (one per line):')
    if (!urls) return

    const urlList = urls.split('\n').filter(url => url.trim())
    
    for (const url of urlList) {
      if (url.trim()) {
        try {
          // Try to get title from URL
          const title = new URL(url.trim()).hostname
          
          await supabase
            .from('links')
            .insert([
              {
                title,
                url: url.trim(),
                folder_id: folder.id,
                position: links.length,
              },
            ])
        } catch (error) {
          console.error('Error adding link:', error)
        }
      }
    }
    
    fetchLinks()
  }

  return (
    <Card className={cn("h-fit shadow-soft hover:shadow-medium transition-all duration-200 animate-fade-in group", isMatch && "ring-2 ring-blue-500 ring-offset-2")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: folder.color }}
            />
            <CardTitle className="text-base">{folder.name}</CardTitle>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={addCurrentTabs}
              className="h-6 px-2 text-xs"
            >
              Add URLs
            </Button>
            
            <Dialog open={showAddLinkDialog} onOpenChange={(isOpen) => {
              setShowAddLinkDialog(isOpen);
              if (!isOpen) {
                setLinkTitle('');
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <Plus className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Link</DialogTitle>
                  <DialogDescription>
                    Add a new link to this folder. You can paste the URL to automatically fetch the title.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createLink} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" name="title" placeholder="Enter link title" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="url">URL</Label>
                    <Input id="url" name="url" type="url" placeholder="https://example.com" required onPaste={handleUrlPaste} />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input id="description" name="description" placeholder="Enter description" />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowAddLinkDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Link</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onShare(folder)}>
                <Share className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onEdit(folder)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onDelete(folder.id)}>
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          {links.map(link => (
            <LinkItem
              key={link.id}
              link={link}
              onEdit={setEditingLink}
              onDelete={deleteLink}
              onShare={handleShareLink}
              searchQuery={searchQuery}
            />
          ))}
          
          {links.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <p className="text-sm">No links yet</p>
              <p className="text-xs">Add your first link to get started</p>
            </div>
          )}
        </div>

        {/* Share Link Dialog */}
        <ShareDialog
          open={linkShareDialog.open}
          onOpenChange={(open) => setLinkShareDialog({ open, link: null })}
          resource={linkShareDialog.link}
          resourceType="link"
        />

        {/* Edit Link Dialog */}
        <Dialog open={!!editingLink} onOpenChange={() => setEditingLink(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Link</DialogTitle>
              <DialogDescription>
                Edit the details of your saved link.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={updateLink} className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input 
                  id="edit-title" 
                  name="title" 
                  defaultValue={editingLink?.title}
                  placeholder="Enter link title" 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="edit-url">URL</Label>
                <Input 
                  id="edit-url" 
                  name="url" 
                  type="url"
                  defaultValue={editingLink?.url}
                  placeholder="https://example.com" 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description (optional)</Label>
                <Input 
                  id="edit-description" 
                  name="description" 
                  defaultValue={editingLink?.description || ''}
                  placeholder="Enter description" 
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingLink(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

function SortableFolderCard({ folder, onEdit, onDelete, onShare, searchQuery }: SortableFolderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-50')}>
      <FolderCard
        folder={folder}
        onEdit={onEdit}
        onDelete={onDelete}
        onShare={onShare}
        attributes={attributes}
        listeners={listeners}
        searchQuery={searchQuery}
      />
    </div>
  )
}

export default function MainContent({ selectedBoard, searchQuery }: MainContentProps) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false)
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [folderShareDialog, setFolderShareDialog] = useState<{ open: boolean; folder: Folder | null }>({ open: false, folder: null })
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    if (selectedBoard) {
      fetchFolders()
    } else {
      setFolders([])
    }
  }, [selectedBoard])

  const fetchFolders = async () => {
    if (!selectedBoard) return

    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('board_id', selectedBoard.id)
        .order('position', { ascending: true })

      if (error) throw error
      setFolders(data || [])
    } catch (error: any) {
      console.error('Error fetching folders:', error)
      setError(`API Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const createFolder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedBoard) return

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const color = formData.get('color') as string

    try {
      const { data, error } = await supabase
        .from('folders')
        .insert([
          {
            name,
            color,
            board_id: selectedBoard.id,
            position: folders.length,
          },
        ])
        .select()
        .single()

      if (error) throw error
      
      setFolders([...folders, data])
      setShowCreateFolderDialog(false)
    } catch (error) {
      console.error('Error creating folder:', error)
    }
  }

  const updateFolder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingFolder) return

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const color = formData.get('color') as string

    try {
      const { data, error } = await supabase
        .from('folders')
        .update({ name, color, updated_at: new Date().toISOString() })
        .eq('id', editingFolder.id)
        .select()
        .single()

      if (error) throw error
      
      setFolders(folders.map(f => f.id === editingFolder.id ? data : f))
      setEditingFolder(null)
    } catch (error) {
      console.error('Error updating folder:', error)
    }
  }

  const deleteFolder = async (folderId: string) => {
    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)

      if (error) throw error
      
      setFolders(folders.filter(f => f.id !== folderId))
    } catch (error) {
      console.error('Error deleting folder:', error)
    }
  }

  const handleShare = (folder: Folder) => {
    setFolderShareDialog({ open: true, folder })
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = folders.findIndex(f => f.id === active.id)
      const newIndex = folders.findIndex(f => f.id === over?.id)

      const newFolders = arrayMove(folders, oldIndex, newIndex)
      setFolders(newFolders)

      // Update positions in database
      try {
        const updates = newFolders.map((folder, index) => ({
          id: folder.id,
          position: index,
        }))

        for (const update of updates) {
          await supabase
            .from('folders')
            .update({ position: update.position })
            .eq('id', update.id)
        }
      } catch (error) {
        console.error('Error updating folder positions:', error)
        // Revert on error
        fetchFolders()
      }
    }

    setActiveId(null)
  }

  if (!selectedBoard) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FolderPlus className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No board selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a board from the sidebar to view its folders and links.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: selectedBoard.color }}
            />
            <h1 className="text-2xl font-bold text-gray-900">{selectedBoard.name}</h1>
          </div>
          
          <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>
                  Create a new folder to organize your bookmarks.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createFolder} className="space-y-4">
                <div>
                  <Label htmlFor="folder-name">Folder Name</Label>
                  <Input id="folder-name" name="name" placeholder="Enter folder name" required />
                </div>
                <div>
                  <Label htmlFor="folder-color">Color</Label>
                  <div className="flex space-x-2 mt-2">
                    {['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#F97316'].map(color => (
                      <label key={color}>
                        <input
                          type="radio"
                          name="color"
                          value={color}
                          defaultChecked={color === '#8B5CF6'}
                          className="sr-only"
                        />
                        <div
                          className="w-6 h-6 rounded-full cursor-pointer border-2 border-transparent hover:border-gray-300"
                          style={{ backgroundColor: color }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateFolderDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Folder</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 bg-gray-50 overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-64">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-200 rounded-full animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse flex-1" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="h-12 bg-gray-100 rounded animate-pulse" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-red-500">
              <h3 className="mt-2 text-sm font-medium">{error}</h3>
              <p className="mt-1 text-sm">Please try again later.</p>
              <Button className="mt-4" onClick={fetchFolders}>Retry</Button>
            </div>
          </div>
        ) : folders.length > 0 ? (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={folders} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                {folders.map(folder => (
                  <SortableFolderCard
                    key={folder.id}
                    folder={folder}
                    onEdit={setEditingFolder}
                    onDelete={deleteFolder}
                    onShare={handleShare}
                    searchQuery={searchQuery}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeId ? (
                <div className="p-2 bg-white border rounded-lg shadow-lg">
                  {folders.find(f => f.id === activeId)?.name}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FolderPlus className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No folders yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create your first folder to organize your bookmarks.
              </p>
              <Button 
                className="mt-4"
                onClick={() => setShowCreateFolderDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Folder
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Folder Dialog */}
      <Dialog open={!!editingFolder} onOpenChange={() => setEditingFolder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
            <DialogDescription>
              Edit the details of your saved folder.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={updateFolder} className="space-y-4">
            <div>
              <Label htmlFor="edit-folder-name">Folder Name</Label>
              <Input 
                id="edit-folder-name" 
                name="name" 
                defaultValue={editingFolder?.name}
                placeholder="Enter folder name" 
                required 
              />
            </div>
            <div>
              <Label htmlFor="edit-folder-color">Color</Label>
              <div className="flex space-x-2 mt-2">
                {['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#F97316'].map(color => (
                  <label key={color}>
                    <input
                      type="radio"
                      name="color"
                      value={color}
                      defaultChecked={color === editingFolder?.color}
                      className="sr-only"
                    />
                    <div
                      className="w-6 h-6 rounded-full cursor-pointer border-2 border-transparent hover:border-gray-300"
                      style={{ backgroundColor: color }}
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setEditingFolder(null)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Share Folder Dialog */}
      <ShareDialog
        open={folderShareDialog.open}
        onOpenChange={(open) => setFolderShareDialog({ open, folder: null })}
        resource={folderShareDialog.folder}
        resourceType="folder"
      />
    </div>
  )
}