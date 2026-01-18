import {
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { IconCalendar } from '@tabler/icons-react'
import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { upsertNutritionEntryApi, fetchNutritionEntries } from '@/app/store/slices/metricsSlice'

export const NutritionPage = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { nutritionEntries } = useAppSelector((state) => state.metrics)
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [calories, setCalories] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [proteins, setProteins] = useState<number | ''>('')
  const [fats, setFats] = useState<number | ''>('')
  const [carbs, setCarbs] = useState<number | ''>('')

  useEffect(() => {
    // Загружаем записи питания при монтировании компонента
    const endDate = dayjs().toISOString()
    const startDate = dayjs().subtract(30, 'days').toISOString()
    dispatch(fetchNutritionEntries({ start_date: startDate, end_date: endDate }))
  }, [dispatch])

  const selectedDateNutrition = useMemo(() => {
    if (!selectedDate) return null
    return nutritionEntries.find((entry) => dayjs(entry.date).isSame(dayjs(selectedDate), 'day'))
  }, [nutritionEntries, selectedDate])

  const handleSave = () => {
    if (!calories || calories <= 0 || !selectedDate) {
      return
    }
    dispatch(
      upsertNutritionEntryApi({
        date: selectedDate.toISOString(),
        calories: Number(calories),
        proteins: proteins === '' ? undefined : Number(proteins),
        fats: fats === '' ? undefined : Number(fats),
        carbs: carbs === '' ? undefined : Number(carbs),
        notes: notes || undefined,
      }),
    )
    setCalories('')
    setProteins('')
    setFats('')
    setCarbs('')
    setNotes('')
  }

  return (
    <Stack gap="xl">
      <Title order={2}>{t('nutritionPage.title')}</Title>

      <Card withBorder padding="md">
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Text size="xs" c="dimmed" fw={600} tt="uppercase">
              {t('nutritionPage.addEntry')}
            </Text>
          </Group>

          <DateInput
            label={t('nutritionPage.date')}
            placeholder={t('nutritionPage.datePlaceholder')}
            value={selectedDate}
            onChange={(date) => {
              setSelectedDate(date)
              if (date) {
                const entry = nutritionEntries.find((entry) =>
                  dayjs(entry.date).isSame(dayjs(date), 'day'),
                )
                if (entry) {
                  setCalories(entry.calories)
                  setProteins(entry.proteins ?? '')
                  setFats(entry.fats ?? '')
                  setCarbs(entry.carbs ?? '')
                  setNotes(entry.notes || '')
                } else {
                  setCalories('')
                  setProteins('')
                  setFats('')
                  setCarbs('')
                  setNotes('')
                }
              }
            }}
            leftSection={<IconCalendar size={16} />}
            valueFormat="DD.MM.YYYY"
          />

          {selectedDateNutrition && (
            <Text size="sm" c="dimmed">
              {t('nutritionPage.alreadyRecorded')}: {selectedDateNutrition.calories.toLocaleString()}{' '}
              {t('nutritionPage.kcal')}
            </Text>
          )}

          <Group align="flex-end" gap="md">
            <NumberInput
              label={t('nutritionPage.calories')}
              placeholder={t('nutritionPage.caloriesPlaceholder')}
              value={calories}
              onChange={(value) => setCalories(typeof value === 'number' ? value : '')}
              min={0}
              step={50}
              style={{ maxWidth: 220 }}
            />
            <NumberInput
              label={t('nutritionPage.proteins')}
              placeholder={t('nutritionPage.proteinsPlaceholder')}
              value={proteins}
              onChange={(value) => setProteins(typeof value === 'number' ? value : '')}
              min={0}
              step={5}
              style={{ maxWidth: 180 }}
            />
            <NumberInput
              label={t('nutritionPage.fats')}
              placeholder={t('nutritionPage.fatsPlaceholder')}
              value={fats}
              onChange={(value) => setFats(typeof value === 'number' ? value : '')}
              min={0}
              step={5}
              style={{ maxWidth: 180 }}
            />
            <NumberInput
              label={t('nutritionPage.carbs')}
              placeholder={t('nutritionPage.carbsPlaceholder')}
              value={carbs}
              onChange={(value) => setCarbs(typeof value === 'number' ? value : '')}
              min={0}
              step={5}
              style={{ maxWidth: 180 }}
            />
            <Button onClick={handleSave} disabled={!calories || calories <= 0 || !selectedDate}>
              {t('common.save')}
            </Button>
          </Group>
          <Textarea
            label={t('nutritionPage.notes')}
            placeholder={t('nutritionPage.notesPlaceholder')}
            value={notes}
            onChange={(event) => setNotes(event.currentTarget.value)}
            minRows={3}
          />

          {(selectedDateNutrition?.proteins ||
            selectedDateNutrition?.fats ||
            selectedDateNutrition?.carbs ||
            selectedDateNutrition?.notes) && (
            <Card withBorder padding="sm" bg="gray.0">
              <Stack gap="sm">
                <Group gap="md">
                  {selectedDateNutrition?.proteins !== undefined && (
                    <Text size="sm">
                      {t('nutritionPage.proteinsShort')}: {selectedDateNutrition.proteins} {t('nutritionPage.grams')}
                    </Text>
                  )}
                  {selectedDateNutrition?.fats !== undefined && (
                    <Text size="sm">
                      {t('nutritionPage.fatsShort')}: {selectedDateNutrition.fats} {t('nutritionPage.grams')}
                    </Text>
                  )}
                  {selectedDateNutrition?.carbs !== undefined && (
                    <Text size="sm">
                      {t('nutritionPage.carbsShort')}: {selectedDateNutrition.carbs} {t('nutritionPage.grams')}
                    </Text>
                  )}
                </Group>
                {selectedDateNutrition?.notes && (
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed" fw={600}>
                      {t('nutritionPage.savedNotes')}
                    </Text>
                    <Text size="sm">{selectedDateNutrition.notes}</Text>
                  </Stack>
                )}
              </Stack>
            </Card>
          )}
        </Stack>
      </Card>

      <Card withBorder padding="md">
        <Stack gap="md">
          <Text size="xs" c="dimmed" fw={600} tt="uppercase">
            {t('nutritionPage.recentEntries')}
          </Text>
          {nutritionEntries.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t('nutritionPage.noEntries')}
            </Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {[...nutritionEntries]
                .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
                .slice(0, 12)
                .map((entry) => (
                  <Card key={entry.date} withBorder padding="sm">
                    <Stack gap={4}>
                      <Group justify="space-between" align="flex-start">
                        <Stack gap={2}>
                          <Text size="sm" fw={600}>
                            {dayjs(entry.date).format('DD.MM.YYYY')}
                          </Text>
                          <Text size="lg" fw={700} c="violet">
                            {entry.calories.toLocaleString()} {t('nutritionPage.kcal')}
                          </Text>
                          <Group gap="xs">
                            {entry.proteins !== undefined && (
                              <Badge size="xs" color="green">
                                {t('nutritionPage.proteinsShort')}: {entry.proteins}
                              </Badge>
                            )}
                            {entry.fats !== undefined && (
                              <Badge size="xs" color="yellow">
                                {t('nutritionPage.fatsShort')}: {entry.fats}
                              </Badge>
                            )}
                            {entry.carbs !== undefined && (
                              <Badge size="xs" color="blue">
                                {t('nutritionPage.carbsShort')}: {entry.carbs}
                              </Badge>
                            )}
                          </Group>
                        </Stack>
                        <Button
                          variant="subtle"
                          size="xs"
                          onClick={() => {
                            setSelectedDate(dayjs(entry.date).toDate())
                            setCalories(entry.calories)
                            setProteins(entry.proteins ?? '')
                            setFats(entry.fats ?? '')
                            setCarbs(entry.carbs ?? '')
                            setNotes(entry.notes || '')
                          }}
                        >
                          {t('common.edit')}
                        </Button>
                      </Group>
                      {entry.notes && (
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {entry.notes}
                        </Text>
                      )}
                    </Stack>
                  </Card>
                ))}
            </SimpleGrid>
          )}
        </Stack>
      </Card>
    </Stack>
  )
}

