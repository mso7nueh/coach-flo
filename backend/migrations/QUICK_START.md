# Быстрое применение миграции на VPS

## Самый простой способ (1 команда)

```bash
docker exec -i coachfit_db psql -U coachfit -d coachfit < migrations/add_new_tables_and_fields.sql
```

## Если файл миграции на хосте, а не в контейнере:

```bash
# Из директории backend/
cat migrations/add_new_tables_and_fields.sql | docker exec -i coachfit_db psql -U coachfit -d coachfit
```

## С резервным копированием:

```bash
# 1. Создайте backup
docker exec coachfit_db pg_dump -U coachfit coachfit > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Примените миграцию
docker exec -i coachfit_db psql -U coachfit -d coachfit < migrations/add_new_tables_and_fields.sql
```

## Проверка результата:

```bash
docker exec -it coachfit_db psql -U coachfit -d coachfit -c "\dt"
```

Должны быть видны новые таблицы:
- `user_goals`
- `progress_photos`
- `workout_templates`
- `workout_template_exercises`

## Если что-то пошло не так:

См. подробную инструкцию в `MIGRATION_GUIDE.md`
