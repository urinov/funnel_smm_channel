'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import { styled } from '@mui/material/styles'
import {
  Plus,
  GripVertical,
  Edit2,
  Trash2,
  Eye,
  Clock,
  Video,
  Image,
  FileText,
} from 'lucide-react'

import { Card, Button, Badge, Modal, Input, EmptyState } from '@/components/ui'

interface Lesson {
  id: string
  number: number
  title: string
  content: string
  mediaType?: 'video' | 'image' | 'text'
  mediaUrl?: string
  delayHours: number
  hasWatchedButton: boolean
  isActive: boolean
}

const mockLessons: Lesson[] = [
  {
    id: '1',
    number: 1,
    title: 'Kirish darsi',
    content: 'Kursga xush kelibsiz! Bu darsda biz asosiy tushunchalar bilan tanishamiz...',
    mediaType: 'video',
    delayHours: 0,
    hasWatchedButton: true,
    isActive: true,
  },
  {
    id: '2',
    number: 2,
    title: 'Asosiy texnikalar',
    content: 'Endi biz eng muhim texnikalarni o\'rganamiz...',
    mediaType: 'image',
    delayHours: 24,
    hasWatchedButton: true,
    isActive: true,
  },
  {
    id: '3',
    number: 3,
    title: 'Amaliy mashqlar',
    content: 'Bu darsda amaliy mashqlarni bajaramiz...',
    mediaType: 'text',
    delayHours: 24,
    hasWatchedButton: false,
    isActive: true,
  },
]

const LessonCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  cursor: 'grab',
  transition: 'all 200ms ease',
  '&:hover': {
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  },
  '&:active': {
    cursor: 'grabbing',
  },
}))

const LessonNumber = styled(Box)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: 10,
  backgroundColor: theme.palette.primary.main,
  color: '#FFFFFF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: '1.125rem',
}))

const MediaIcon = ({ type }: { type?: string }) => {
  switch (type) {
    case 'video':
      return <Video size={16} />
    case 'image':
      return <Image size={16} />
    default:
      return <FileText size={16} />
  }
}

export default function LessonsPage() {
  const [lessons] = useState<Lesson[]>(mockLessons)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Lessons
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your course content and lesson sequence
          </Typography>
        </Box>
        <Button
          variant="solid"
          colorScheme="primary"
          leftIcon={<Plus size={18} />}
          onClick={() => {
            setEditingLesson(null)
            setIsModalOpen(true)
          }}
        >
          Add Lesson
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Drag and drop to reorder lessons
      </Typography>

      <Grid container spacing={3}>
        {lessons.map((lesson) => (
          <Grid item xs={12} key={lesson.id}>
            <LessonCard>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, p: 3 }}>
                <Box sx={{ color: 'text.secondary', cursor: 'grab', pt: 1 }}>
                  <GripVertical size={20} />
                </Box>

                <LessonNumber>{lesson.number}</LessonNumber>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6" fontWeight={600}>
                      {lesson.title}
                    </Typography>
                    {lesson.mediaType && (
                      <Badge variant="soft" color="info" size="sm">
                        <MediaIcon type={lesson.mediaType} />
                        <span style={{ marginLeft: 4 }}>{lesson.mediaType}</span>
                      </Badge>
                    )}
                    {lesson.hasWatchedButton && (
                      <Badge variant="soft" color="success" size="sm">
                        <Eye size={12} />
                        <span style={{ marginLeft: 4 }}>Watched btn</span>
                      </Badge>
                    )}
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} noWrap>
                    {lesson.content}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                      <Clock size={14} />
                      <Typography variant="caption">
                        {lesson.delayHours === 0 ? 'Immediate' : `${lesson.delayHours}h delay`}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditingLesson(lesson)
                      setIsModalOpen(true)
                    }}
                  >
                    <Edit2 size={18} />
                  </IconButton>
                  <IconButton size="small" color="error">
                    <Trash2 size={18} />
                  </IconButton>
                </Box>
              </Box>
            </LessonCard>
          </Grid>
        ))}
      </Grid>

      {lessons.length === 0 && (
        <EmptyState
          iconType="file"
          title="No lessons yet"
          description="Create your first lesson to start building your course"
          action={{
            label: 'Add Lesson',
            onClick: () => setIsModalOpen(true),
          }}
        />
      )}

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLesson ? 'Edit Lesson' : 'Add New Lesson'}
        size="lg"
        actions={
          <>
            <Button variant="ghost" colorScheme="neutral" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="solid" colorScheme="primary">
              {editingLesson ? 'Save Changes' : 'Create Lesson'}
            </Button>
          </>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Input
            label="Lesson Title"
            placeholder="Enter lesson title"
            defaultValue={editingLesson?.title}
          />
          <Input
            label="Content"
            placeholder="Enter lesson content"
            multiline
            rows={4}
            defaultValue={editingLesson?.content}
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Input
                label="Delay (hours)"
                type="number"
                placeholder="0"
                defaultValue={editingLesson?.delayHours || 0}
              />
            </Grid>
            <Grid item xs={6}>
              <Input
                label="Media URL"
                placeholder="https://..."
                defaultValue={editingLesson?.mediaUrl}
              />
            </Grid>
          </Grid>
        </Box>
      </Modal>
    </Box>
  )
}
