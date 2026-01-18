import {
    Button,
    Card,
    Group,
    Stack,
    Text,
    Textarea,
    TextInput,
    Title,
    Breadcrumbs,
    Anchor,
    ActionIcon,
    Modal,
} from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { IconArrowLeft, IconEdit, IconTrash, IconPlus } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { setClients } from '@/app/store/slices/clientsSlice'
import { fetchTrainerNotes, createNoteApi, updateNoteApi, deleteNoteApi } from '@/app/store/slices/dashboardSlice'
import { apiClient } from '@/shared/api/client'
import { notifications } from '@mantine/notifications'
import { useDisclosure } from '@mantine/hooks'

export const ClientNotesPage = () => {
    const { t } = useTranslation()
    const { clientId } = useParams<{ clientId: string }>()
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const { clients } = useAppSelector((state) => state.clients)
    const { trainerNotes } = useAppSelector((state) => state.dashboard)
    const [isLoadingClients, setIsLoadingClients] = useState(false)
    const [isLoadingNotes, setIsLoadingNotes] = useState(false)
    
    const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false)
    const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false)
    const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false)
    
    const [noteForm, setNoteForm] = useState({ title: '', content: '' })
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
    const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)

    // Загружаем клиентов при монтировании, если клиент не найден
    useEffect(() => {
        const client = clients.find((c) => c.id === clientId)
        if (!client && !isLoadingClients && clientId) {
            setIsLoadingClients(true)
            const loadClients = async () => {
                try {
                    const clientsData = await apiClient.getClients()
                    const mappedClients = clientsData.map((client: any) => ({
                        id: client.id,
                        fullName: client.full_name,
                        email: client.email,
                        phone: client.phone,
                        avatar: client.avatar,
                        format: (client.client_format || 'both') as 'online' | 'offline' | 'both',
                        workoutsPackage: client.workouts_package,
                        packageExpiryDate: client.package_expiry_date,
                        isActive: client.is_active ?? true,
                        attendanceRate: 0,
                        totalWorkouts: 0,
                        completedWorkouts: 0,
                        joinedDate: client.created_at || new Date().toISOString(),
                    }))
                    dispatch(setClients(mappedClients))
                } catch (error) {
                    console.error('Error loading clients:', error)
                } finally {
                    setIsLoadingClients(false)
                }
            }
            loadClients()
        }
    }, [dispatch, clientId, clients, isLoadingClients])

    // Загружаем заметки для клиента
    useEffect(() => {
        if (!clientId) return
        
        const loadNotes = async () => {
            setIsLoadingNotes(true)
            try {
                // Загружаем заметки конкретного клиента через API
                const notesData = await apiClient.getTrainerClientNotes(clientId)
                // Маппим данные в формат TrainerNote с clientId
                const mappedNotes = notesData.map((note: any) => ({
                    id: note.id,
                    title: note.title,
                    content: note.content || '',
                    updatedAt: note.created_at,
                    clientId: note.client_id,
                }))
                // Обновляем state через dispatch fulfilled action
                dispatch({
                    type: 'dashboard/fetchNotes/fulfilled',
                    payload: mappedNotes
                } as any)
            } catch (error) {
                console.error('Error loading notes:', error)
            } finally {
                setIsLoadingNotes(false)
            }
        }
        
        loadNotes()
    }, [dispatch, clientId])

    const client = clients.find((c) => c.id === clientId)
    // Фильтруем заметки по clientId (на случай если в state есть заметки других клиентов)
    const clientNotes = trainerNotes.filter((note: any) => note.clientId === clientId)

    // Показываем "клиент не найден" только после попытки загрузки
    if (!client && !isLoadingClients) {
        return (
            <Stack gap="md">
                <Button leftSection={<IconArrowLeft size={16} />} variant="subtle" onClick={() => navigate('/trainer/clients')}>
                    {t('common.back')}
                </Button>
                <Text>{t('trainer.clients.clientNotFound')}</Text>
            </Stack>
        )
    }

    // Пока загружаем, показываем заглушку или ничего
    if (!client && isLoadingClients) {
        return null
    }

    const handleCreateNote = async () => {
        if (!clientId || !noteForm.title.trim()) return
        
        try {
            await dispatch(
                createNoteApi({
                    client_id: clientId,
                    title: noteForm.title.trim(),
                    content: noteForm.content.trim() || undefined,
                })
            ).unwrap()
            
            notifications.show({
                title: t('common.success'),
                message: t('trainer.clients.noteCreated'),
                color: 'green',
            })
            
            setNoteForm({ title: '', content: '' })
            closeCreateModal()
            
            // Перезагружаем заметки
            const notesData = await apiClient.getTrainerClientNotes(clientId)
            const mappedNotes = notesData.map((note: any) => ({
                id: note.id,
                title: note.title,
                content: note.content || '',
                updatedAt: note.created_at,
                clientId: note.client_id,
            }))
            dispatch({
                type: 'dashboard/fetchNotes/fulfilled',
                payload: mappedNotes
            } as any)
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error?.message || t('trainer.clients.error.createNote'),
                color: 'red',
            })
        }
    }

    const handleEditNote = (note: any) => {
        setEditingNoteId(note.id)
        setNoteForm({ title: note.title, content: note.content || '' })
        openEditModal()
    }

    const handleUpdateNote = async () => {
        if (!editingNoteId || !noteForm.title.trim()) return
        
        try {
            await dispatch(
                updateNoteApi({
                    note_id: editingNoteId,
                    title: noteForm.title.trim(),
                    content: noteForm.content.trim() || undefined,
                })
            ).unwrap()
            
            notifications.show({
                title: t('common.success'),
                message: t('trainer.clients.noteUpdated'),
                color: 'green',
            })
            
            setNoteForm({ title: '', content: '' })
            setEditingNoteId(null)
            closeEditModal()
            
            // Перезагружаем заметки
            const notesData = await apiClient.getTrainerClientNotes(clientId!)
            const mappedNotes = notesData.map((note: any) => ({
                id: note.id,
                title: note.title,
                content: note.content || '',
                updatedAt: note.created_at,
                clientId: note.client_id,
            }))
            dispatch({
                type: 'dashboard/fetchNotes/fulfilled',
                payload: mappedNotes
            } as any)
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error?.message || t('trainer.clients.error.updateNote'),
                color: 'red',
            })
        }
    }

    const handleDeleteNote = (noteId: string) => {
        setDeletingNoteId(noteId)
        openDeleteModal()
    }

    const confirmDeleteNote = async () => {
        if (!deletingNoteId) return
        
        try {
            await dispatch(deleteNoteApi(deletingNoteId)).unwrap()
            
            notifications.show({
                title: t('common.success'),
                message: t('trainer.clients.noteDeleted'),
                color: 'green',
            })
            
            setDeletingNoteId(null)
            closeDeleteModal()
            
            // Перезагружаем заметки
            const notesData = await apiClient.getTrainerClientNotes(clientId!)
            const mappedNotes = notesData.map((note: any) => ({
                id: note.id,
                title: note.title,
                content: note.content || '',
                updatedAt: note.created_at,
                clientId: note.client_id,
            }))
            dispatch({
                type: 'dashboard/fetchNotes/fulfilled',
                payload: mappedNotes
            } as any)
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error?.message || t('trainer.clients.error.deleteNote'),
                color: 'red',
            })
        }
    }

    return (
        <Stack gap="lg">
            <Breadcrumbs>
                <Anchor component={Link} to="/trainer/clients">
                    {t('trainer.clients.title')}
                </Anchor>
                <Anchor component={Link} to={`/trainer/clients/${clientId}`}>
                    {client?.fullName}
                </Anchor>
                <Text>{t('dashboard.notesTitle')}</Text>
            </Breadcrumbs>

            <Group justify="space-between">
                <Title order={2}>
                    {t('dashboard.notesTitle')} - {client?.fullName}
                </Title>
                <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
                    {t('common.add')}
                </Button>
            </Group>

            {clientNotes.length === 0 ? (
                <Card withBorder padding="md">
                    <Text size="sm" c="dimmed">
                        {t('dashboard.emptyNotes')}
                    </Text>
                </Card>
            ) : (
                <Stack gap="md">
                    {clientNotes.map((note: any) => (
                        <Card key={note.id} withBorder padding="md">
                            <Group justify="space-between" align="flex-start">
                                <Stack gap="xs" style={{ flex: 1 }}>
                                    <Text fw={600} size="lg">
                                        {note.title}
                                    </Text>
                                    {note.content && (
                                        <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                                            {note.content}
                                        </Text>
                                    )}
                                    <Text size="xs" c="dimmed">
                                        {dayjs(note.updatedAt).format('D MMM YYYY, HH:mm')}
                                    </Text>
                                </Stack>
                                <Group gap="xs">
                                    <ActionIcon variant="subtle" onClick={() => handleEditNote(note)}>
                                        <IconEdit size={16} />
                                    </ActionIcon>
                                    <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteNote(note.id)}>
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                </Group>
                            </Group>
                        </Card>
                    ))}
                </Stack>
            )}

            {/* Create Modal */}
            <Modal opened={createModalOpened} onClose={closeCreateModal} title={t('common.add')}>
                <Stack gap="md">
                    <TextInput
                        label={t('trainer.clients.noteTitle')}
                        placeholder={t('trainer.clients.noteTitlePlaceholder')}
                        value={noteForm.title}
                        onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                        required
                    />
                    <Textarea
                        label={t('trainer.clients.noteContent')}
                        placeholder={t('trainer.clients.noteContentPlaceholder')}
                        value={noteForm.content}
                        onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                        rows={6}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeCreateModal}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleCreateNote} disabled={!noteForm.title.trim()}>
                            {t('common.save')}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Edit Modal */}
            <Modal opened={editModalOpened} onClose={closeEditModal} title={t('common.edit')}>
                <Stack gap="md">
                    <TextInput
                        label={t('trainer.clients.noteTitle')}
                        placeholder={t('trainer.clients.noteTitlePlaceholder')}
                        value={noteForm.title}
                        onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                        required
                    />
                    <Textarea
                        label={t('trainer.clients.noteContent')}
                        placeholder={t('trainer.clients.noteContentPlaceholder')}
                        value={noteForm.content}
                        onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                        rows={6}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => {
                            setNoteForm({ title: '', content: '' })
                            setEditingNoteId(null)
                            closeEditModal()
                        }}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleUpdateNote} disabled={!noteForm.title.trim()}>
                            {t('common.save')}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Delete Modal */}
            <Modal opened={deleteModalOpened} onClose={closeDeleteModal} title={t('common.delete')}>
                <Stack gap="md">
                    <Text>{t('trainer.clients.confirmDeleteNote')}</Text>
                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeDeleteModal}>
                            {t('common.cancel')}
                        </Button>
                        <Button color="red" onClick={confirmDeleteNote}>
                            {t('common.delete')}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    )
}
