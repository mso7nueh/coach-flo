"""
Скрипт для заполнения библиотеки тренера тестовыми данными
Создает упражнения и шаблоны тренировок для первого найденного тренера
"""
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models
import uuid
import json

def seed_library():
    """Заполняет библиотеку тестовыми данными"""
    db: Session = SessionLocal()
    
    try:
        # Находим первого тренера
        trainer = db.query(models.User).filter(
            models.User.role == models.UserRole.TRAINER
        ).first()
        
        if not trainer:
            print("❌ Тренер не найден в базе данных!")
            return False
        
        print(f"✅ Найден тренер: {trainer.full_name} (ID: {trainer.id})")
        
        # Проверяем, есть ли уже упражнения у этого тренера
        existing_exercises_count = db.query(models.Exercise).filter(
            models.Exercise.trainer_id == trainer.id
        ).count()
        
        if existing_exercises_count > 0:
            print(f"⚠️  У тренера уже есть {existing_exercises_count} упражнений. Пропускаем создание упражнений.")
        else:
            # Создаем упражнения
            exercises_data = [
                {
                    "name": "Приседания со штангой",
                    "description": "Базовое упражнение для развития мышц ног",
                    "muscle_groups": "Ноги, Ягодицы",
                    "equipment": "Штанга",
                    "starting_position": "Встаньте прямо, ноги на ширине плеч, штанга на плечах",
                    "execution_instructions": "Опуститесь в присед до параллели с полом, затем вернитесь в исходное положение. Спину держите прямой.",
                    "notes": "Важно следить за техникой, колени не должны выходить за носки"
                },
                {
                    "name": "Жим лежа",
                    "description": "Упражнение для развития мышц груди, плеч и трицепсов",
                    "muscle_groups": "Грудь, Плечи, Руки",
                    "equipment": "Штанга, Скамья",
                    "starting_position": "Лягте на скамью, возьмите штангу хватом шире плеч",
                    "execution_instructions": "Опустите штангу к груди, затем выжмите вверх до полного разгибания рук",
                    "notes": "Обязательно используйте страховку при работе с большими весами"
                },
                {
                    "name": "Становая тяга",
                    "description": "Комплексное упражнение для всего тела",
                    "muscle_groups": "Спина, Ноги, Ягодицы",
                    "equipment": "Штанга",
                    "starting_position": "Встаньте перед штангой, ноги на ширине плеч, наклонитесь и возьмите штангу",
                    "execution_instructions": "Поднимите штангу, разгибая ноги и спину одновременно. Вернитесь в исходное положение.",
                    "notes": "Одно из самых эффективных упражнений, но требует правильной техники"
                },
                {
                    "name": "Подтягивания",
                    "description": "Упражнение для развития мышц спины и рук",
                    "muscle_groups": "Спина, Руки",
                    "equipment": "Собственный вес",
                    "starting_position": "Повисните на турнике, руки на ширине плеч",
                    "execution_instructions": "Подтянитесь, подняв подбородок над перекладиной, затем медленно опуститесь",
                    "notes": "Отличное упражнение с собственным весом"
                },
                {
                    "name": "Отжимания от пола",
                    "description": "Базовое упражнение для груди и трицепсов",
                    "muscle_groups": "Грудь, Руки",
                    "equipment": "Собственный вес",
                    "starting_position": "Упор лежа, руки на ширине плеч",
                    "execution_instructions": "Опуститесь вниз, коснувшись грудью пола, затем выжмите тело вверх",
                    "notes": "Подходит для всех уровней подготовки"
                },
                {
                    "name": "Планка",
                    "description": "Упражнение для укрепления корпуса",
                    "muscle_groups": "Пресс, Кор",
                    "equipment": "Собственный вес",
                    "starting_position": "Упор лежа на предплечьях, тело образует прямую линию",
                    "execution_instructions": "Удерживайте положение, не прогибаясь в пояснице",
                    "notes": "Начните с 30 секунд, постепенно увеличивайте время"
                },
                {
                    "name": "Выпады с гантелями",
                    "description": "Упражнение для мышц ног и ягодиц",
                    "muscle_groups": "Ноги, Ягодицы",
                    "equipment": "Гантели",
                    "starting_position": "Встаньте прямо, держите гантели в руках",
                    "execution_instructions": "Сделайте шаг вперед, опустите заднее колено к полу, вернитесь в исходное положение",
                    "notes": "Можно выполнять на месте или в движении"
                },
                {
                    "name": "Жим гантелей сидя",
                    "description": "Упражнение для развития плеч",
                    "muscle_groups": "Плечи",
                    "equipment": "Гантели, Скамья",
                    "starting_position": "Сядьте на скамью, возьмите гантели на уровень плеч",
                    "execution_instructions": "Выжмите гантели вверх, затем медленно опустите",
                    "notes": "Контролируйте движения, избегайте рывков"
                },
                {
                    "name": "Бег на беговой дорожке",
                    "description": "Кардио упражнение для выносливости",
                    "muscle_groups": "Кардио, Ноги",
                    "equipment": "Тренажер",
                    "starting_position": "Встаньте на беговую дорожку",
                    "execution_instructions": "Начните бег с умеренной скоростью, поддерживайте ритм",
                    "notes": "Отличное упражнение для разминки или кардио-нагрузки"
                },
                {
                    "name": "Растяжка ног",
                    "description": "Упражнение для гибкости и восстановления",
                    "muscle_groups": "Растяжка",
                    "equipment": "Собственный вес",
                    "starting_position": "Сядьте на пол, ноги вытянуты",
                    "execution_instructions": "Наклонитесь вперед, потянитесь к носкам, удерживайте 30 секунд",
                    "notes": "Выполняйте плавно, без резких движений"
                }
            ]
            
            created_exercises = []
            for ex_data in exercises_data:
                exercise_id = str(uuid.uuid4())
                exercise = models.Exercise(
                    id=exercise_id,
                    trainer_id=trainer.id,
                    name=ex_data["name"],
                    description=ex_data["description"],
                    muscle_groups=ex_data["muscle_groups"],
                    equipment=ex_data["equipment"],
                    starting_position=ex_data["starting_position"],
                    execution_instructions=ex_data["execution_instructions"],
                    notes=ex_data["notes"],
                    visibility="all"
                )
                db.add(exercise)
                created_exercises.append(exercise)
            
            db.commit()
            print(f"✅ Создано {len(created_exercises)} упражнений")
            
            # Обновляем список упражнений после commit
            for ex in created_exercises:
                db.refresh(ex)
        
        # Получаем все упражнения тренера для создания шаблонов
        trainer_exercises = db.query(models.Exercise).filter(
            models.Exercise.trainer_id == trainer.id
        ).all()
        
        if len(trainer_exercises) < 5:
            print("⚠️  Недостаточно упражнений для создания шаблонов тренировок (нужно минимум 5)")
            return True
        
        # Проверяем, есть ли уже шаблоны тренировок
        existing_templates_count = db.query(models.WorkoutTemplate).filter(
            models.WorkoutTemplate.trainer_id == trainer.id
        ).count()
        
        if existing_templates_count > 0:
            print(f"⚠️  У тренера уже есть {existing_templates_count} шаблонов тренировок. Пропускаем создание шаблонов.")
            return True
        
        # Создаем шаблоны тренировок
        workout_templates_data = [
            {
                "title": "Силовая тренировка для начинающих",
                "description": "Базовая тренировка для развития силы и мышечной массы",
                "duration": 60,
                "level": "beginner",
                "goal": "muscle_gain",
                "muscle_groups": ["legs", "chest", "back"],
                "equipment": ["barbell", "dumbbells"],
                "exercises": [
                    {"exercise_name": "Приседания со штангой", "block_type": "warmup", "sets": 2, "reps": 12},
                    {"exercise_name": "Жим лежа", "block_type": "main", "sets": 3, "reps": 10},
                    {"exercise_name": "Подтягивания", "block_type": "main", "sets": 3, "reps": 8},
                    {"exercise_name": "Планка", "block_type": "main", "sets": 3, "duration": 30},
                    {"exercise_name": "Растяжка ног", "block_type": "cooldown", "sets": 1, "duration": 60}
                ]
            },
            {
                "title": "Кардио и выносливость",
                "description": "Тренировка для улучшения выносливости и сжигания калорий",
                "duration": 45,
                "level": "intermediate",
                "goal": "weight_loss",
                "muscle_groups": ["cardio", "legs", "core"],
                "equipment": ["bodyweight", "machine"],
                "exercises": [
                    {"exercise_name": "Бег на беговой дорожке", "block_type": "warmup", "sets": 1, "duration": 10},
                    {"exercise_name": "Выпады с гантелями", "block_type": "main", "sets": 3, "reps": 12},
                    {"exercise_name": "Отжимания от пола", "block_type": "main", "sets": 3, "reps": 15},
                    {"exercise_name": "Планка", "block_type": "main", "sets": 3, "duration": 45},
                    {"exercise_name": "Растяжка ног", "block_type": "cooldown", "sets": 1, "duration": 120}
                ]
            },
            {
                "title": "Тренировка верха тела",
                "description": "Комплексная проработка мышц верха тела",
                "duration": 50,
                "level": "intermediate",
                "goal": "muscle_gain",
                "muscle_groups": ["chest", "back", "shoulders", "arms"],
                "equipment": ["barbell", "dumbbells"],
                "exercises": [
                    {"exercise_name": "Отжимания от пола", "block_type": "warmup", "sets": 2, "reps": 10},
                    {"exercise_name": "Жим лежа", "block_type": "main", "sets": 4, "reps": 8},
                    {"exercise_name": "Подтягивания", "block_type": "main", "sets": 4, "reps": 10},
                    {"exercise_name": "Жим гантелей сидя", "block_type": "main", "sets": 3, "reps": 12},
                    {"exercise_name": "Растяжка ног", "block_type": "cooldown", "sets": 1, "duration": 60}
                ]
            },
            {
                "title": "Тренировка ног и ягодиц",
                "description": "Интенсивная проработка нижней части тела",
                "duration": 55,
                "level": "advanced",
                "goal": "muscle_gain",
                "muscle_groups": ["legs", "core"],
                "equipment": ["barbell", "dumbbells"],
                "exercises": [
                    {"exercise_name": "Бег на беговой дорожке", "block_type": "warmup", "sets": 1, "duration": 5},
                    {"exercise_name": "Приседания со штангой", "block_type": "main", "sets": 4, "reps": 12},
                    {"exercise_name": "Становая тяга", "block_type": "main", "sets": 3, "reps": 8},
                    {"exercise_name": "Выпады с гантелями", "block_type": "main", "sets": 3, "reps": 12},
                    {"exercise_name": "Растяжка ног", "block_type": "cooldown", "sets": 1, "duration": 120}
                ]
            }
        ]
        
        created_templates = []
        for template_data in workout_templates_data:
            template_id = str(uuid.uuid4())
            
            # Создаем шаблон
            template = models.WorkoutTemplate(
                id=template_id,
                trainer_id=trainer.id,
                title=template_data["title"],
                description=template_data["description"],
                duration=template_data["duration"],
                level=template_data["level"],
                goal=template_data["goal"],
                muscle_groups=json.dumps(template_data["muscle_groups"]),
                equipment=json.dumps(template_data["equipment"])
            )
            db.add(template)
            db.flush()  # Получаем template_id
            
            # Создаем упражнения для шаблона
            for idx, ex_data in enumerate(template_data["exercises"]):
                # Находим упражнение по названию
                exercise = next((e for e in trainer_exercises if e.name == ex_data["exercise_name"]), None)
                
                if not exercise:
                    print(f"⚠️  Упражнение '{ex_data['exercise_name']}' не найдено, пропускаем")
                    continue
                
                exercise_entry_id = str(uuid.uuid4())
                exercise_entry = models.WorkoutTemplateExercise(
                    id=exercise_entry_id,
                    template_id=template_id,
                    exercise_id=exercise.id,
                    block_type=ex_data["block_type"],
                    sets=ex_data["sets"],
                    reps=ex_data.get("reps"),
                    duration=ex_data.get("duration"),
                    order_index=idx
                )
                db.add(exercise_entry)
            
            created_templates.append(template)
        
        db.commit()
        print(f"✅ Создано {len(created_templates)} шаблонов тренировок")
        
        print("\n" + "=" * 60)
        print("✅ Библиотека успешно заполнена тестовыми данными!")
        print(f"   - Упражнений: {len(trainer_exercises)}")
        print(f"   - Шаблонов тренировок: {len(created_templates)}")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при заполнении библиотеки: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("ЗАПОЛНЕНИЕ БИБЛИОТЕКИ ТЕСТОВЫМИ ДАННЫМИ")
    print("=" * 60)
    print()
    
    if seed_library():
        print("\n✅ Готово!")
    else:
        print("\n❌ Заполнение не завершено!")
        exit(1)
