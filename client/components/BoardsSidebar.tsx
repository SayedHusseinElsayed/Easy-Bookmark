import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Board, Folder, Link, supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Edit, Trash2, Share, GripVertical, Search } from 'lucide-react'
import { cn, slugify } from '@/lib/utils'
import ShareDialog from '@/components/ShareDialog'

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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface BoardsSidebarProps {
  selectedBoard: Board | null
  onBoardSelect: (board: Board) => void
  selectedBoardSlug?: string
  searchQuery: string
  setSearchQuery: (query: string) => void
}

interface SortableBoardItemProps {
  board: Board
  isSelected: boolean
  onSelect: () => void
  onEdit: (board: Board) => void
  onDelete: (boardId: string) => void
  onShare: (board: Board) => void
}

function SortableBoardItem({ board, isSelected, onSelect, onEdit, onDelete, onShare }: SortableBoardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: board.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center w-full p-2 rounded-lg transition-colors',
        isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50',
        isDragging && 'opacity-50'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="mr-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      
      <div
        className="flex-1 flex items-center cursor-pointer"
        onClick={onSelect}
      >
        <div
          className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
          style={{ backgroundColor: board.color }}
        />
        <span className="text-sm font-medium text-gray-900 truncate">
          {board.name}
        </span>
      </div>

      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onShare(board)}>
          <Share className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onEdit(board)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onDelete(board.id)}>
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    </div>
  )
}

export default function BoardsSidebar({
  selectedBoard,
  onBoardSelect,
  selectedBoardSlug,
  searchQuery,
  setSearchQuery,
}: BoardsSidebarProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingBoard, setEditingBoard] = useState<Board | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [shareDialog, setShareDialog] = useState<{ open: boolean; board: Board | null }>({ open: false, board: null })
  const [allFolders, setAllFolders] = useState<Folder[]>([])
  const [allLinks, setAllLinks] = useState<Link[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    fetchBoardsAndSearchData()
  }, [user])

  const fetchBoardsAndSearchData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: boardsData, error: boardsError } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true })

      if (boardsError) throw boardsError
      setBoards(boardsData || [])

      // Fetch all folders and links for search
      if (boardsData && boardsData.length > 0) {
        const boardIds = boardsData.map((b) => b.id)
        const { data: foldersData, error: foldersError } = await supabase
          .from('folders')
          .select('*')
          .in('board_id', boardIds)
        if (foldersError) throw foldersError
        setAllFolders(foldersData || [])

        if (foldersData && foldersData.length > 0) {
          const folderIds = foldersData.map((f) => f.id)
          const { data: linksData, error: linksError } = await supabase
            .from('links')
            .select('*')
            .in('folder_id', folderIds)
          if (linksError) throw linksError
          setAllLinks(linksData || [])
        }
      }
      
      // Auto-select first board if none selected
      if (boardsData && boardsData.length > 0 && !selectedBoard && !selectedBoardSlug) {
        onBoardSelect(boardsData[0])
        navigate(`/board/${slugify(boardsData[0].name)}`)
      } else if (selectedBoardSlug && boardsData) {
        const board = boardsData.find((b) => slugify(b.name) === selectedBoardSlug)
        if (board) {
          onBoardSelect(board)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const refetchData = () => {
    fetchBoardsAndSearchData()
  }

  const createBoard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) return

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const color = formData.get('color') as string

    try {
      const { data, error } = await supabase
        .from('boards')
        .insert([
          {
            name,
            color,
            user_id: user.id,
            position: boards.length,
          },
        ])
        .select()
        .single()

      if (error) throw error
      
      refetchData()
      setShowCreateDialog(false)
    } catch (error) {
      console.error('Error creating board:', error)
    }
  }

  const updateBoard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingBoard) return

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const color = formData.get('color') as string

    try {
      const { data, error } = await supabase
        .from('boards')
        .update({ name, color, updated_at: new Date().toISOString() })
        .eq('id', editingBoard.id)
        .select()
        .single()

      if (error) throw error
      
      refetchData()
      setEditingBoard(null)
    } catch (error) {
      console.error('Error updating board:', error)
    }
  }

  const deleteBoard = async (boardId: string) => {
    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId)

      if (error) throw error
      
      refetchData()
      if (selectedBoard?.id === boardId) navigate('/')
    } catch (error) {
      console.error('Error deleting board:', error)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = boards.findIndex((b) => b.id === active.id)
      const newIndex = boards.findIndex((b) => b.id === over?.id)

      const newBoards = arrayMove(boards, oldIndex, newIndex)
      setBoards(newBoards)

      // Update positions in database
      try {
        const updates = newBoards.map((board, index) => ({
          id: board.id,
          position: index,
        }))

        for (const update of updates) {
          await supabase
            .from('boards')
            .update({ position: update.position })
            .eq('id', update.id)
        }
      } catch (error) {
        console.error('Error updating board positions:', error)
        // Revert on error
        refetchData()
      }
    }

    setActiveId(null)
  }

  const handleShare = (board: Board) => {
    setShareDialog({ open: true, board })
  }

  const filteredBoards = useMemo(() => {
    if (!searchQuery) {
      return boards
    }

    const lowerCaseQuery = searchQuery.toLowerCase()

    const matchingLinkFolderIds = new Set(
      allLinks
        .filter(
          (l) =>
            l.title.toLowerCase().includes(lowerCaseQuery) ||
            l.url.toLowerCase().includes(lowerCaseQuery) ||
            (l.description && l.description.toLowerCase().includes(lowerCaseQuery))
        )
        .map((l) => l.folder_id)
    )

    const matchingFolderBoardIds = new Set(
      allFolders
        .filter(
          (f) =>
            f.name.toLowerCase().includes(lowerCaseQuery) || matchingLinkFolderIds.has(f.id)
        )
        .map((f) => f.board_id)
    )

    return boards.filter((b) => b.name.toLowerCase().includes(lowerCaseQuery) || matchingFolderBoardIds.has(b.id))
  }, [searchQuery, boards, allFolders, allLinks])

  if (loading) {
    return (
      <div className="flex-1 p-4">
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search boards, folders, links..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Boards</h2>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Board</DialogTitle>
              </DialogHeader>
              <form onSubmit={createBoard} className="space-y-4">
                <div>
                  <Label htmlFor="name">Board Name</Label>
                  <Input id="name" name="name" placeholder="Enter board name" required />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <div className="flex space-x-2 mt-2">
                    {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'].map(color => (
                      <label key={color}>
                        <input
                          type="radio"
                          name="color"
                          value={color}
                          defaultChecked={color === '#3B82F6'}
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
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Board</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-1 overflow-y-auto">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={filteredBoards} strategy={verticalListSortingStrategy}>
            {filteredBoards.map((board) => (
              <SortableBoardItem
                key={board.id}
                board={board}
                isSelected={selectedBoard?.id === board.id}
                onSelect={() => {
                  onBoardSelect(board)
                  navigate(`/board/${slugify(board.name)}`)
                }}
                onEdit={setEditingBoard}
                onDelete={deleteBoard}
                onShare={handleShare}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              <div className="p-2 bg-white border rounded-lg shadow-lg">
                {boards.find((b) => b.id === activeId)?.name}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {boards.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No boards yet</p>
            <p className="text-xs">Create your first board to get started</p>
          </div>
        )}
        {filteredBoards.length === 0 && boards.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No results found</p>
            <p className="text-xs">Try a different search term.</p>
          </div>
        )}
      </div>

      {/* Edit Board Dialog */}
      <Dialog open={!!editingBoard} onOpenChange={() => setEditingBoard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Board</DialogTitle>
          </DialogHeader>
          <form onSubmit={updateBoard} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Board Name</Label>
              <Input 
                id="edit-name" 
                name="name" 
                defaultValue={editingBoard?.name}
                placeholder="Enter board name" 
                required 
              />
            </div>
            <div>
              <Label htmlFor="edit-color">Color</Label>
              <div className="flex space-x-2 mt-2">
                {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'].map(color => (
                  <label key={color}>
                    <input
                      type="radio"
                      name="color"
                      value={color}
                      defaultChecked={color === editingBoard?.color}
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
              <Button type="button" variant="outline" onClick={() => setEditingBoard(null)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialog.open}
        onOpenChange={(open) => setShareDialog({ open, board: null })}
        resource={shareDialog.board}
        resourceType="board"
      />
    </div>
  )
}