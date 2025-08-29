import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Board, supabase } from '@/lib/supabase'
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
import { Plus, MoreHorizontal, Edit, Trash2, Share, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  selectedBoardId?: string
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

export default function BoardsSidebar({ selectedBoard, onBoardSelect, selectedBoardId }: BoardsSidebarProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingBoard, setEditingBoard] = useState<Board | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [shareDialog, setShareDialog] = useState<{ open: boolean; board: Board | null }>({ open: false, board: null })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    fetchBoards()
  }, [user])

  const fetchBoards = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true })

      if (error) throw error
      setBoards(data || [])
      
      // Auto-select first board if none selected
      if (data && data.length > 0 && !selectedBoard && !selectedBoardId) {
        onBoardSelect(data[0])
        navigate(`/board/${data[0].id}`)
      } else if (selectedBoardId && data) {
        const board = data.find(b => b.id === selectedBoardId)
        if (board) {
          onBoardSelect(board)
        }
      }
    } catch (error) {
      console.error('Error fetching boards:', error)
    } finally {
      setLoading(false)
    }
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
      
      setBoards([...boards, data])
      setShowCreateDialog(false)
      onBoardSelect(data)
      navigate(`/board/${data.id}`)
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
      
      setBoards(boards.map(b => b.id === editingBoard.id ? data : b))
      setEditingBoard(null)
      
      if (selectedBoard?.id === editingBoard.id) {
        onBoardSelect(data)
      }
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
      
      const updatedBoards = boards.filter(b => b.id !== boardId)
      setBoards(updatedBoards)
      
      if (selectedBoard?.id === boardId) {
        if (updatedBoards.length > 0) {
          onBoardSelect(updatedBoards[0])
          navigate(`/board/${updatedBoards[0].id}`)
        } else {
          navigate('/')
        }
      }
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
      const oldIndex = boards.findIndex(b => b.id === active.id)
      const newIndex = boards.findIndex(b => b.id === over?.id)

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
        fetchBoards()
      }
    }

    setActiveId(null)
  }

  const handleShare = (board: Board) => {
    setShareDialog({ open: true, board })
  }

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
          <SortableContext items={boards} strategy={verticalListSortingStrategy}>
            {boards.map(board => (
              <SortableBoardItem
                key={board.id}
                board={board}
                isSelected={selectedBoard?.id === board.id}
                onSelect={() => {
                  onBoardSelect(board)
                  navigate(`/board/${board.id}`)
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
                {boards.find(b => b.id === activeId)?.name}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {boards.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No boards yet</p>
            <p className="text-xs">Create your first board to get started</p>
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
