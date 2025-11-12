# 📋 TODO.md - Интеграция "Лингвистики" в Голосовой Помощник

> **Проект:** Voice Helper - Система развития навыков продаж и переговоров на основе книги "Лингвистика" Филиппа Богачева  
> **Приоритет:** Голосовое взаимодействие с дублированием текстом  
> **Архитектура:** RAG + ChromaDB + Долговременная память

***

## 🎯 КОНЦЕПЦИЯ ПРОЕКТА

### Главная цель
Создать **голосового коуча по продажам**, который:
- ✅ Обучает навыкам из книги "Лингвистика"
- ✅ Отслеживает прогресс пользователя
- ✅ Даёт персонализированные задания
- ✅ Работает через голос (приоритет) + текст
- ✅ Помнит весь контекст обучения

### Ключевые задачи персоны "Лингвистика"
1. **Диагностика уровня** → Определение стартовой точки
2. **Построение индивидуального плана** → Roadmap на основе целей пользователя
3. **Ежедневные практики** → Упражнения из книги
4. **Трекинг прогресса** → Дневник достижений
5. **Коррекция подхода** → Адаптация под результаты

***

## 🏗️ АРХИТЕКТУРА СИСТЕМЫ

```
┌─────────────────────────────────────────────────────────────┐
│                    ГОЛОСОВОЙ ПОМОЩНИК                        │
│  (Gemini 2.0 Flash Exp - Multimodal Live API)               │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴──────────────┐
                │                            │
        ┌───────▼──────┐           ┌────────▼────────┐
        │   ПЕРСОНА    │           │  ДРУГИЕ ПЕРСОНЫ │
        │ "ЛИНГВИСТИКА"│           │  (существующие) │
        └───────┬──────┘           └─────────────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼────┐  ┌──▼───┐  ┌───▼──────┐
│  RAG   │  │Memory│  │Sub-Agents│
│Engine  │  │Store │  │ (#0-#9)  │
└───┬────┘  └──┬───┘  └────┬─────┘
    │          │           │
┌───▼──────────▼───────────▼─────┐
│       ChromaDB (Vector DB)      │
│   • Векторы книги (embeddings)  │
│   • История диалогов            │
│   • Прогресс пользователя       │
└─────────────────────────────────┘
```

***

## 📦 СТРУКТУРА ПРОЕКТА

```
voice_helper/
├── linguistics/                    # Новый модуль
│   ├── __init__.py
│   ├── config.py                   # Конфигурация RAG, персон
│   ├── database/
│   │   ├── __init__.py
│   │   ├── chroma_client.py        # ChromaDB клиент
│   │   ├── embeddings.py           # Gemini embeddings
│   │   └── schema.py               # Структура коллекций
│   ├── personas/
│   │   ├── __init__.py
│   │   ├── coordinator.py          # Персона #0 - Главный оркестратор
│   │   ├── communication.py        # Персона #1 - Мастер коммуникации
│   │   ├── rapport.py              # Персона #2 - Наставник раппорта
│   │   ├── emotions.py             # Персона #3 - Эмоциональный центр
│   │   ├── creativity.py           # Персона #4 - Бредогенератор
│   │   ├── strategy.py             # Персона #5 - Стратег влияния
│   │   ├── fears.py                # Персона #6 - Психолог страхов
│   │   ├── appearance.py           # Персона #7 - Коуч по внешности
│   │   ├── practice.py             # Персона #8 - Мастер практик
│   │   └── integrator.py           # Персона #9 - Индивидуальные планы
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── chunker.py              # Разбивка book.md на смысловые блоки
│   │   ├── retriever.py            # Поиск релевантных фрагментов
│   │   └── generator.py            # Генерация ответов с контекстом
│   ├── memory/
│   │   ├── __init__.py
│   │   ├── conversation.py         # Хранение истории диалогов
│   │   ├── progress.py             # Трекинг прогресса обучения
│   │   └── user_profile.py         # Профиль пользователя (цели, уровень)
│   └── voice/
│       ├── __init__.py
│       ├── tts.py                  # Text-to-Speech через Gemini
│       └── stt.py                  # Speech-to-Text (если нужно)
├── data/
│   ├── linguistics_book.md         # Исходник книги
│   └── chroma_db/                  # Папка для ChromaDB (локально)
├── scripts/
│   ├── setup_linguistics_db.py     # Инициализация БД и векторизация
│   └── test_personas.py            # Тестирование персон
├── main_linguistics.py             # Главный orchestrator
└── requirements.txt                # Зависимости
```

***

## 📝 ДЕТАЛЬНЫЙ ПЛАН РЕАЛИЗАЦИИ

---

### **ЭТАП 1: Инфраструктура и База Данных**

#### ✅ **Задача 1.1: Настройка ChromaDB**

**Файл:** `linguistics/database/chroma_client.py`

```python
"""
ChromaDB клиент для векторной БД
Хранит: векторы книги, историю диалогов, прогресс пользователя

ВАЖНО: ChromaDB работает локально (на сервере где запущен бот)
Альтернативы для продакшна:
- Chroma Cloud (платный сервис)
- Qdrant (самохостинг)
- Pinecone (облачный)
"""

import chromadb
from chromadb.config import Settings
import google.generativeai as genai

class LinguisticsDB:
    def __init__(self, persist_directory="./data/chroma_db"):
        """
        Инициализация ChromaDB с Gemini embeddings
        
        Args:
            persist_directory: Путь для хранения БД (локально)
        """
        # Настройка клиента
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Embedding функция через Gemini
        self.embedding_function = self._create_embedding_function()
        
        # Коллекции
        self.book_collection = self._get_or_create_collection("linguistics_book")
        self.conversations = self._get_or_create_collection("user_conversations")
        self.progress = self._get_or_create_collection("user_progress")
    
    def _create_embedding_function(self):
        """Создание embedding функции через Gemini"""
        from chromadb.utils import embedding_functions
        
        return embedding_functions.GoogleGenerativeAiEmbeddingFunction(
            api_key=os.getenv("GEMINI_API_KEY"),
            model_name="models/text-embedding-004",  # 768 dimensions
            task_type="RETRIEVAL_DOCUMENT"
        )
    
    def _get_or_create_collection(self, name):
        """Получить или создать коллекцию"""
        try:
            return self.client.get_collection(
                name=name,
                embedding_function=self.embedding_function
            )
        except:
            return self.client.create_collection(
                name=name,
                embedding_function=self.embedding_function,
                metadata={"hnsw:space": "cosine"}
            )
```

**Зависимости:**
```txt
chromadb==0.4.22
google-generativeai>=0.3.0
```

***

#### ✅ **Задача 1.2: Векторизация книги**

**Файл:** `linguistics/rag/chunker.py`

```python
"""
Разбивка book.md на семантические чанки
Стратегия: По параграфам (###) с сохранением контекста глав
"""

import re
from typing import List, Dict

class BookChunker:
    def __init__(self, file_path: str):
        with open(file_path, 'r', encoding='utf-8') as f:
            self.content = f.read()
    
    def chunk_by_sections(self) -> List[Dict]:
        """
        Разбивка по разделам (### заголовки)
        
        Returns:
            List[Dict]: [{
                "text": "...",
                "metadata": {
                    "chapter": "Часть 1",
                    "section": "Глава 1",
                    "subsection": "§ 1.1",
                    "page": 1,
                    "level": "beginner"
                }
            }]
        """
        chunks = []
        
        # Regex для поиска заголовков
        chapter_pattern = r'### (ЧАСТЬ \d+.*?)(?=\n)'
        section_pattern = r'### (Глава \d+.*?)(?=\n)'
        subsection_pattern = r'### (§ ?\d+\.\d+\..*?)(?=\n)'
        
        current_chapter = "Введение"
        current_section = ""
        current_subsection = ""
        
        # Разбиваем по параграфам
        paragraphs = re.split(r'\n\n+', self.content)
        
        for idx, para in enumerate(paragraphs):
            if len(para.strip()) < 50:  # Слишком короткие пропускаем
                continue
            
            # Определяем контекст
            if re.match(chapter_pattern, para):
                current_chapter = re.findall(chapter_pattern, para)[0]
                continue
            
            if re.match(section_pattern, para):
                current_section = re.findall(section_pattern, para)[0]
                continue
            
            if re.match(subsection_pattern, para):
                current_subsection = re.findall(subsection_pattern, para)[0]
                continue
            
            # Определяем уровень сложности
            level = self._detect_level(current_chapter, current_section)
            
            chunks.append({
                "text": para.strip(),
                "metadata": {
                    "chapter": current_chapter,
                    "section": current_section,
                    "subsection": current_subsection,
                    "chunk_id": idx,
                    "level": level,
                    "word_count": len(para.split())
                }
            })
        
        return chunks
    
    def _detect_level(self, chapter: str, section: str) -> str:
        """Определение уровня сложности"""
        if "УРОВЕНЬ I" in chapter or "Начинающий" in section:
            return "beginner"
        elif "УРОВЕНЬ II" in chapter:
            return "intermediate"
        elif "УРОВЕНЬ III" in chapter:
            return "advanced"
        else:
            return "foundation"
```

**Скрипт инициализации:** `scripts/setup_linguistics_db.py`

```python
"""
Скрипт для первичной загрузки книги в ChromaDB
Запуск: python scripts/setup_linguistics_db.py
"""

import sys
sys.path.append('.')

from linguistics.database.chroma_client import LinguisticsDB
from linguistics.rag.chunker import BookChunker
from tqdm import tqdm

def setup_database():
    print("🚀 Инициализация базы данных Лингвистики...")
    
    # 1. Подключение к БД
    db = LinguisticsDB()
    
    # 2. Очистка (если нужно переиндексировать)
    # db.client.delete_collection("linguistics_book")
    
    # 3. Загрузка и чанкирование книги
    print("📚 Загрузка книги...")
    chunker = BookChunker("data/linguistics_book.md")
    chunks = chunker.chunk_by_sections()
    
    print(f"✂️  Разбито на {len(chunks)} чанков")
    
    # 4. Добавление в ChromaDB
    print("💾 Векторизация и сохранение...")
    
    batch_size = 100
    for i in tqdm(range(0, len(chunks), batch_size)):
        batch = chunks[i:i+batch_size]
        
        db.book_collection.add(
            documents=[c["text"] for c in batch],
            metadatas=[c["metadata"] for c in batch],
            ids=[f"chunk_{c['metadata']['chunk_id']}" for c in batch]
        )
    
    print("✅ База данных готова!")
    print(f"📊 Статистика:")
    print(f"   • Всего чанков: {db.book_collection.count()}")
    
    # 5. Тестовый запрос
    print("\n🔍 Тестовый RAG-запрос...")
    results = db.book_collection.query(
        query_texts=["Что такое раппорт?"],
        n_results=3
    )
    
    print("Найденные фрагменты:")
    for doc in results['documents'][0]:
        print(f"  • {doc[:150]}...")

if __name__ == "__main__":
    setup_database()
```

***

### **ЭТАП 2: Система долговременной памяти**

#### ✅ **Задача 2.1: Хранение истории диалогов**

**Файл:** `linguistics/memory/conversation.py`

```python
"""
Управление историей диалогов с пользователем
Структура: user_id -> session_id -> messages[]
"""

from datetime import datetime
from typing import List, Dict
import json

class ConversationMemory:
    def __init__(self, db_client):
        self.db = db_client
        self.collection = db_client.conversations
    
    def add_message(self, user_id: str, message: Dict):
        """
        Добавить сообщение в историю
        
        Args:
            user_id: ID пользователя
            message: {
                "role": "user" | "assistant",
                "content": "...",
                "timestamp": "2025-11-10T00:30:00",
                "modality": "voice" | "text",
                "persona": "coordinator" | "rapport" | ...,
                "metadata": {...}
            }
        """
        doc_id = f"{user_id}_{message['timestamp']}"
        
        self.collection.add(
            documents=[message["content"]],
            metadatas=[{
                "user_id": user_id,
                "role": message["role"],
                "timestamp": message["timestamp"],
                "modality": message.get("modality", "text"),
                "persona": message.get("persona", "main"),
                **message.get("metadata", {})
            }],
            ids=[doc_id]
        )
    
    def get_recent_history(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Получить последние N сообщений"""
        results = self.collection.query(
            query_texts=[""],  # Пустой запрос для получения всех
            where={"user_id": user_id},
            n_results=limit
        )
        
        # Сортировка по timestamp
        messages = []
        for i, doc in enumerate(results['documents'][0]):
            messages.append({
                "content": doc,
                **results['metadatas'][0][i]
            })
        
        return sorted(messages, key=lambda x: x['timestamp'])
    
    def search_context(self, user_id: str, query: str, limit: int = 5) -> List[Dict]:
        """
        Семантический поиск по истории диалогов
        Полезно для: "Ты помнишь, что я говорил о..."
        """
        results = self.collection.query(
            query_texts=[query],
            where={"user_id": user_id},
            n_results=limit
        )
        
        return results
```

***

#### ✅ **Задача 2.2: Трекинг прогресса обучения**

**Файл:** `linguistics/memory/progress.py`

```python
"""
Отслеживание прогресса пользователя по программе обучения
"""

from datetime import datetime, timedelta
from typing import Dict, List

class ProgressTracker:
    def __init__(self, db_client):
        self.db = db_client
        self.collection = db_client.progress
    
    def init_user(self, user_id: str, goals: List[str]):
        """
        Инициализация пользователя
        
        Args:
            user_id: ID пользователя
            goals: Цели из упражнения в книге (10 целей)
        """
        self.collection.add(
            documents=[f"Цели пользователя: {', '.join(goals)}"],
            metadatas=[{
                "user_id": user_id,
                "type": "goals",
                "created_at": datetime.now().isoformat(),
                "goals": goals,
                "level": "beginner",  # Стартовый уровень
                "completed_exercises": [],
                "current_chapter": "Введение"
            }],
            ids=[f"{user_id}_goals"]
        )
    
    def update_progress(self, user_id: str, data: Dict):
        """
        Обновление прогресса
        
        Args:
            data: {
                "completed_exercise": "Упражнение 1.1",
                "chapter": "Глава 1",
                "level": "beginner",
                "notes": "...",
                "score": 8  # Самооценка 1-10
            }
        """
        # Получаем текущий прогресс
        current = self.get_user_progress(user_id)
        
        # Обновляем
        completed = current.get("completed_exercises", [])
        completed.append({
            "exercise": data["completed_exercise"],
            "timestamp": datetime.now().isoformat(),
            "score": data.get("score", 0),
            "notes": data.get("notes", "")
        })
        
        # Сохраняем
        self.collection.update(
            ids=[f"{user_id}_progress"],
            metadatas=[{
                **current,
                "completed_exercises": completed,
                "current_chapter": data.get("chapter", current["current_chapter"]),
                "level": data.get("level", current["level"]),
                "updated_at": datetime.now().isoformat()
            }]
        )
    
    def get_user_progress(self, user_id: str) -> Dict:
        """Получить текущий прогресс пользователя"""
        results = self.collection.get(
            ids=[f"{user_id}_progress"]
        )
        
        if not results or not results['metadatas']:
            return {}
        
        return results['metadatas'][0]
    
    def get_recommendations(self, user_id: str) -> Dict:
        """
        Рекомендации следующих шагов на основе прогресса
        
        Returns:
            {
                "next_exercise": "...",
                "focus_area": "раппорт" | "эмоции" | ...,
                "estimated_time": "15 минут",
                "difficulty": "easy" | "medium" | "hard"
            }
        """
        progress = self.get_user_progress(user_id)
        
        # Логика определения следующего шага
        completed_count = len(progress.get("completed_exercises", []))
        current_level = progress.get("level", "beginner")
        
        # Примерная логика (доработать на основе книги)
        if completed_count < 5:
            return {
                "next_exercise": "Установление контакта (3-15 секунд)",
                "focus_area": "коммуникация",
                "estimated_time": "10 минут",
                "difficulty": "easy"
            }
        elif completed_count < 15:
            return {
                "next_exercise": "Практика раппорта 1 уровня",
                "focus_area": "раппорт",
                "estimated_time": "20 минут",
                "difficulty": "medium"
            }
        else:
            return {
                "next_exercise": "Бредогенератор - лингвистические пирамиды",
                "focus_area": "креативность",
                "estimated_time": "30 минут",
                "difficulty": "hard"
            }
```

***

### **ЭТАП 3: RAG Engine**

#### ✅ **Задача 3.1: Поисковик по книге**

**Файл:** `linguistics/rag/retriever.py`

```python
"""
RAG Retriever - поиск релевантных фрагментов книги
"""

from typing import List, Dict

class BookRetriever:
    def __init__(self, db_client):
        self.collection = db_client.book_collection
    
    def search(self, query: str, filters: Dict = None, top_k: int = 5) -> List[Dict]:
        """
        Поиск релевантных фрагментов
        
        Args:
            query: Вопрос пользователя
            filters: {"level": "beginner", "chapter": "Раппорт"}
            top_k: Количество результатов
        
        Returns:
            List[{
                "text": "...",
                "score": 0.95,
                "metadata": {...}
            }]
        """
        # Формируем where-фильтр
        where_filter = {}
        if filters:
            if "level" in filters:
                where_filter["level"] = filters["level"]
            if "chapter" in filters:
                where_filter["chapter"] = {"$contains": filters["chapter"]}
        
        # Поиск
        results = self.collection.query(
            query_texts=[query],
            where=where_filter if where_filter else None,
            n_results=top_k,
            include=["documents", "metadatas", "distances"]
        )
        
        # Форматирование
        formatted = []
        for i, doc in enumerate(results['documents'][0]):
            formatted.append({
                "text": doc,
                "score": 1 - results['distances'][0][i],  # Cosine similarity
                "metadata": results['metadatas'][0][i]
            })
        
        return formatted
    
    def get_chapter_context(self, chapter_name: str) -> str:
        """Получить весь контекст главы"""
        results = self.collection.query(
            query_texts=[""],
            where={"chapter": {"$contains": chapter_name}},
            n_results=100  # Все чанки главы
        )
        
        return "\n\n".join(results['documents'][0])
```

***

#### ✅ **Задача 3.2: Генератор ответов**

**Файл:** `linguistics/rag/generator.py`

```python
"""
RAG Generator - генерация ответов с контекстом из книги
"""

import google.generativeai as genai
from typing import List, Dict

class ResponseGenerator:
    def __init__(self, model_name: str = "gemini-2.0-flash-exp"):
        self.model = genai.GenerativeModel(model_name)
    
    def generate(
        self,
        query: str,
        context: List[Dict],
        persona_prompt: str,
        conversation_history: List[Dict] = None
    ) -> str:
        """
        Генерация ответа на основе RAG-контекста
        
        Args:
            query: Вопрос пользователя
            context: Найденные фрагменты книги
            persona_prompt: System prompt персоны
            conversation_history: История диалога для контекста
        
        Returns:
            Структурированный ответ
        """
        # Форматируем контекст из книги
        book_context = "\n\n---\n\n".join([
            f"[Глава: {c['metadata']['chapter']}]\n{c['text']}"
            for c in context
        ])
        
        # Форматируем историю диалога
        history_context = ""
        if conversation_history:
            history_context = "\n".join([
                f"{msg['role']}: {msg['content']}"
                for msg in conversation_history[-5:]  # Последние 5 сообщений
            ])
        
        # Промпт
        full_prompt = f"""
{persona_prompt}

==== КОНТЕКСТ ИЗ КНИГИ "ЛИНГВИСТИКА" ====
{book_context}

==== ИСТОРИЯ ДИАЛОГА ====
{history_context}

==== ЗАПРОС ПОЛЬЗОВАТЕЛЯ ====
{query}

==== ИНСТРУКЦИЯ ПО ОТВЕТУ ====
1. Используй ТОЛЬКО информацию из книги (контекст выше)
2. Давай конкретные упражнения и примеры
3. Адаптируй ответ под уровень пользователя
4. Структурируй ответ:
   - Краткий ответ (1-2 предложения)
   - Подробное объяснение из книги
   - Практическое упражнение
   - Что делать дальше
5. Цитируй главы: [Глава 1, §1.1]
6. Будь мотивирующим, но не навязчивым

ФОРМАТ ОТВЕТА (для голосового вывода + текста):
"""

        # Генерация
        response = self.model.generate_content(full_prompt)
        
        return response.text
```

***

### **ЭТАП 4: Персоны (Sub-Agents)**

#### ✅ **Задача 4.1: Главная Персона - Координатор**

**Файл:** `linguistics/personas/coordinator.py`

```python
"""
ПЕРСОНА #0: Координатор Лингвистики
Главная точка входа, диагностика, маршрутизация к экспертам
"""

from linguistics.rag.retriever import BookRetriever
from linguistics.rag.generator import ResponseGenerator
from linguistics.memory.progress import ProgressTracker
from linguistics.memory.conversation import ConversationMemory

class LinguisticsCoordinator:
    def __init__(self, db_client):
        self.retriever = BookRetriever(db_client)
        self.generator = ResponseGenerator()
        self.progress = ProgressTracker(db_client)
        self.memory = ConversationMemory(db_client)
        
        # Доступные эксперты
        self.experts = {
            "коммуникация": "Мастер Коммуникации",
            "раппорт": "Наставник Раппорта",
            "эмоции": "Эмоциональный Центр",
            "креативность": "Бредогенератор",
            "стратегия": "Стратег Влияния",
            "страхи": "Психолог Страхов",
            "внешность": "Коуч по Внешности",
            "практика": "Мастер Практик",
            "план": "Интегратор"
        }
    
    SYSTEM_PROMPT = """
Ты — Координатор системы обучения "Лингвистика" Филиппа Богачева.

Твоя роль:
• Диагностировать уровень и потребности пользователя
• Направлять к нужному эксперту (#1-9)
• Отслеживать общий прогресс
• Мотивировать и вдохновлять

Доступные эксперты:
1. Мастер Коммуникации → Структура общения, 5 этапов, правило 3-15 сек
2. Наставник Раппорта → 6 уровней доверия, калибровки, схожесть
3. Эмоциональный Центр → Центровка, состояния, квадратное дыхание
4. Бредогенератор → Речевая креативность, ассоциации, темы
5. Стратег Влияния → Игра vs Война, цели, долгосрочные планы
6. Психолог Страхов → Преодоление барьеров, baby steps
7. Коуч по Внешности → Первое впечатление, трансляторы здоровья
8. Мастер Практик → Упражнения, домашки, трекинг
9. Интегратор → Индивидуальный план обучения

При первом обращении:
1. Поприветствуй тепло
2. Узнай цель обращения (продажи? переговоры? знакомства?)
3. Оцени уровень (новичок? есть опыт?)
4. Предложи начать с диагностики или направь к эксперту

При повторных обращениях:
• Вспомни контекст прошлых бесед
• Проверь прогресс по упражнениям
• Скорректируй план при необходимости

Стиль общения:
• Дружелюбный наставник, а не строгий учитель
• Голос: мотивирующий, уверенный, поддерживающий
• Короткие фразы для голоса (до 2 предложений)
• Используй метафоры из книги ("танец с клиентом")
"""
    
    def process_request(self, user_id: str, query: str, modality: str = "voice") -> Dict:
        """
        Обработка запроса пользователя
        
        Returns:
            {
                "text": "...",
                "voice_ssml": "<speak>...</speak>",
                "action": "route_to_expert" | "exercise" | "chat",
                "expert": "rapport" | None,
                "metadata": {...}
            }
        """
        # 1. Получаем контекст: история + прогресс
        history = self.memory.get_recent_history(user_id, limit=5)
        progress = self.progress.get_user_progress(user_id)
        
        # 2. Определяем, нужен ли поиск по книге
        needs_rag = self._needs_book_context(query)
        
        context = []
        if needs_rag:
            context = self.retriever.search(
                query=query,
                filters={"level": progress.get("level", "beginner")},
                top_k=3
            )
        
        # 3. Расширенный промпт с контекстом пользователя
        enhanced_prompt = f"""
{self.SYSTEM_PROMPT}

==== ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ ====
Уровень: {progress.get('level', 'новичок')}
Текущая глава: {progress.get('current_chapter', 'не начал')}
Пройдено упражнений: {len(progress.get('completed_exercises', []))}
Цели: {', '.join(progress.get('goals', ['не указаны'])[:3])}

Последние достижения:
{self._format_recent_progress(progress)}
"""
        
        # 4. Генерируем ответ
        response_text = self.generator.generate(
            query=query,
            context=context,
            persona_prompt=enhanced_prompt,
            conversation_history=history
        )
        
        # 5. Определяем действие (route/exercise/chat)
        action, expert = self._detect_action(response_text, query)
        
        # 6. Форматируем для голоса
        voice_ssml = self._text_to_ssml(response_text, modality)
        
        # 7. Сохраняем в память
        self.memory.add_message(user_id, {
            "role": "user",
            "content": query,
            "timestamp": datetime.now().isoformat(),
            "modality": modality
        })
        
        self.memory.add_message(user_id, {
            "role": "assistant",
            "content": response_text,
            "timestamp": datetime.now().isoformat(),
            "modality": modality,
            "persona": "coordinator",
            "metadata": {"action": action, "expert": expert}
        })
        
        return {
            "text": response_text,
            "voice_ssml": voice_ssml,
            "action": action,
            "expert": expert,
            "metadata": {
                "context_used": len(context),
                "user_level": progress.get("level")
            }
        }
    
    def _needs_book_context(self, query: str) -> bool:
        """Определить, нужен ли поиск по книге"""
        keywords = [
            "как", "что такое", "расскажи", "объясни",
            "упражнение", "техника", "метод", "раппорт",
            "коммуникация", "продажи"
        ]
        return any(kw in query.lower() for kw in keywords)
    
    def _detect_action(self, response: str, query: str) -> tuple:
        """Определить тип действия и эксперта"""
        # Простая эвристика (можно улучшить через LLM)
        if "направляю тебя к" in response.lower():
            for key, name in self.experts.items():
                if name.lower() in response.lower():
                    return ("route_to_expert", key)
        
        if "упражнение" in response.lower() or "попрактикуй" in response.lower():
            return ("exercise", None)
        
        return ("chat", None)
    
    def _text_to_ssml(self, text: str, modality: str) -> str:
        """Конвертация текста в SSML для TTS"""
        if modality != "voice":
            return text
        
        # Базовая обработка (можно расширить)
        ssml = f"<speak>{text}</speak>"
        
        # Добавляем паузы после вопросов
        ssml = ssml.replace("?", "?<break time='500ms'/>")
        
        return ssml
    
    def _format_recent_progress(self, progress: Dict) -> str:
        """Форматирование последних достижений"""
        exercises = progress.get("completed_exercises", [])
        if not exercises:
            return "Пока не начал практиковаться"
        
        recent = exercises[-3:]  # Последние 3
        return "\n".join([
            f"• {ex['exercise']} (оценка: {ex.get('score', '?')}/10)"
            for ex in recent
        ])
```

***

#### ✅ **Задача 4.2: Пример эксперта - Наставник Раппорта**

**Файл:** `linguistics/personas/rapport.py`

```python
"""
ПЕРСОНА #2: Наставник Раппорта
Эксперт по установлению и управлению уровнями доверия
"""

from linguistics.rag.retriever import BookRetriever
from linguistics.rag.generator import ResponseGenerator

class RapportMentor:
    def __init__(self, db_client):
        self.retriever = BookRetriever(db_client)
        self.generator = ResponseGenerator()
    
    SYSTEM_PROMPT = """
Ты — Наставник по Раппорту из книги "Лингвистика" Филиппа Богачева.

Твоя экспертиза:
• 6 уровней раппорта (от отрицательного до ближайшего круга)
• Формула: РАППОРТ = Доверие + Интерес = Схожесть × Открытость
• Калибровки и управление состоянием собеседника
• Правило: "Раппорт начинается с тебя"
• Техники: комплименты, зеркалирование, подстройки

Методология обучения:
1. Диагностируй ситуацию пользователя
2. Определи текущий уровень раппорта
3. Дай конкретное упражнение на повышение
4. Объясни критерии успеха (СОК)

Стиль:
• Практичный коуч, а не теоретик
• Примеры из жизни и книги
• Короткие инструкции для голоса
• Мотивация: "Ты уже молодец, что задал этот вопрос!"

Структура ответа:
1. Краткий ответ (1 фраза)
2. Контекст из книги [ссылка на главу]
3. Упражнение "сделай прямо сейчас"
4. Как понять, что получилось

Помни: Раппорт — это не манипуляция, а естественный процесс!
"""
    
    def answer(self, user_id: str, query: str, user_context: Dict) -> Dict:
        """
        Ответ на вопрос по раппорту
        
        Args:
            query: Вопрос пользователя
            user_context: {level, goals, history}
        
        Returns:
            {text, voice_ssml, exercise, references}
        """
        # 1. RAG-поиск по главам о раппорте
        context = self.retriever.search(
            query=query,
            filters={"chapter": "Раппорт"},
            top_k=5
        )
        
        # 2. Расширяем промпт контекстом пользователя
        enhanced_prompt = f"""
{self.SYSTEM_PROMPT}

==== О ПОЛЬЗОВАТЕЛЕ ====
Уровень: {user_context.get('level', 'начинающий')}
Опыт: {user_context.get('experience', 'нет данных')}
Текущая задача: {user_context.get('current_goal', 'не указана')}
"""
        
        # 3. Генерация ответа
        response = self.generator.generate(
            query=query,
            context=context,
            persona_prompt=enhanced_prompt
        )
        
        # 4. Извлекаем упражнение и ссылки
        exercise = self._extract_exercise(response)
        references = self._extract_references(context)
        
        return {
            "text": response,
            "voice_ssml": f"<speak>{response}</speak>",
            "exercise": exercise,
            "references": references
        }
    
    def _extract_exercise(self, text: str) -> Dict:
        """Извлечь упражнение из ответа"""
        # Простая эвристика (можно улучшить через regex)
        if "упражнение" in text.lower():
            return {
                "title": "Практика раппорта",
                "description": text,  # Весь текст пока
                "duration": "10-15 минут",
                "difficulty": "beginner"
            }
        return None
    
    def _extract_references(self, context: List[Dict]) -> List[str]:
        """Извлечь ссылки на главы"""
        refs = []
        for c in context:
            chapter = c['metadata'].get('chapter', '')
            section = c['metadata'].get('section', '')
            if chapter:
                refs.append(f"{chapter} → {section}")
        return list(set(refs))[:3]  # Топ-3 уникальных
```

***

### **ЭТАП 5: Интеграция с голосовым помощником**

#### ✅ **Задача 5.1: Главный orchestrator**

**Файл:** `main_linguistics.py`

```python
"""
Главный orchestrator для персоны "Лингвистика"
Интеграция с существующим голосовым помощником
"""

import os
from linguistics.database.chroma_client import LinguisticsDB
from linguistics.personas.coordinator import LinguisticsCoordinator
from linguistics.personas.rapport import RapportMentor
# ... остальные персоны

class LinguisticsAssistant:
    def __init__(self):
        # Инициализация БД
        self.db = LinguisticsDB(persist_directory=os.getenv("CHROMA_DB_PATH", "./data/chroma_db"))
        
        # Главная персона
        self.coordinator = LinguisticsCoordinator(self.db)
        
        # Эксперты (lazy loading)
        self.experts = {
            "rapport": lambda: RapportMentor(self.db),
            # Остальные добавятся позже
        }
    
    def process_voice_request(self, user_id: str, audio_input: bytes) -> Dict:
        """
        Обработка голосового запроса
        
        Args:
            user_id: ID пользователя (Telegram/Discord ID)
            audio_input: Аудио в формате bytes
        
        Returns:
            {
                "text_response": "...",
                "audio_response": bytes,  # TTS через Gemini
                "visual_card": {...},     # Опционально для текста
                "next_action": {...}
            }
        """
        # 1. STT (если нужно, но Gemini Live API уже транскрибирует)
        # text_query = self._speech_to_text(audio_input)
        
        # 2. Обработка через Координатора
        response = self.coordinator.process_request(
            user_id=user_id,
            query=text_query,
            modality="voice"
        )
        
        # 3. Роутинг к эксперту (если нужно)
        if response["action"] == "route_to_expert":
            expert_name = response["expert"]
            expert = self.experts[expert_name]()
            
            response = expert.answer(
                user_id=user_id,
                query=text_query,
                user_context=self._get_user_context(user_id)
            )
        
        # 4. TTS через Gemini
        audio_output = self._text_to_speech(response["voice_ssml"])
        
        # 5. Визуальная карточка для дублирования
        visual_card = self._create_visual_card(response)
        
        return {
            "text_response": response["text"],
            "audio_response": audio_output,
            "visual_card": visual_card,
            "next_action": {
                "type": response.get("action"),
                "exercise": response.get("exercise")
            }
        }
    
    def _text_to_speech(self, ssml: str) -> bytes:
        """TTS через Gemini Live API"""
        # TODO: Интеграция с Gemini 2.0 Live API
        # Пока заглушка
        return b""
    
    def _create_visual_card(self, response: Dict) -> Dict:
        """Создание визуальной карточки для текстового канала"""
        return {
            "title": "💬 Лингвистика | Коуч по Продажам",
            "body": response["text"],
            "footer": f"Источник: {', '.join(response.get('references', []))}",
            "actions": [
                {"label": "📝 Записать упражнение", "action": "save_exercise"},
                {"label": "➡️ Следующий шаг", "action": "next_step"}
            ]
        }
    
    def _get_user_context(self, user_id: str) -> Dict:
        """Получение контекста пользователя"""
        progress = self.coordinator.progress.get_user_progress(user_id)
        return {
            "level": progress.get("level", "beginner"),
            "experience": f"{len(progress.get('completed_exercises', []))} упражнений",
            "current_goal": progress.get("goals", ["не указана"])[0]
        }

# ========== ПРИМЕР ИСПОЛЬЗОВАНИЯ ==========
if __name__ == "__main__":
    assistant = LinguisticsAssistant()
    
    # Симуляция голосового запроса
    user_id = "telegram_123456"
    query_text = "Как установить раппорт с новым клиентом?"
    
    response = assistant.coordinator.process_request(
        user_id=user_id,
        query=query_text,
        modality="voice"
    )
    
    print("🎙️ ОТВЕТ:")
    print(response["text"])
    print("\n📊 МЕТАДАННЫЕ:")
    print(f"Действие: {response['action']}")
    print(f"Эксперт: {response.get('expert', 'Координатор')}")
```

***

### **ЭТАП 6: Промпты для всех персон**

#### ✅ **Задача 6.1: Полный набор промптов**

**Файл:** `linguistics/personas/prompts.py`

```python
"""
Централизованное хранилище промптов для всех персон
"""

PROMPTS = {
    "coordinator": """
[УЖЕ НАПИСАН ВЫШЕ В coordinator.py]
""",
    
    "communication": """
Ты — Мастер Коммуникации из книги "Лингвистика".

Твоя экспертиза:
• 5 этапов коммуникации: Контакт → Знакомство → Общение → Расставание → Послевкусие
• Правило 3-15 секунд (3 сек на действие, 15 сек на решение)
• Структура эффективной беседы
• Универсальные темы разговора
• Переводы темы словом "КСТАТИ"

Золотые правила:
1. Расставаться на пике эмоций
2. Не затягивать общение
3. Первое впечатление формируется за 3 секунды

Методология:
• Диагностируй, на каком этапе сейчас пользователь
• Дай упражнение на отработку этого этапа
• Объясни критерий успеха (СОК)
""",
    
    "rapport": """
[УЖЕ НАПИСАН ВЫШЕ В rapport.py]
""",
    
    "emotions": """
Ты — Эмоциональный Центр из книги "Лингвистика".

Твоя экспертиза:
• Базовые эмоциональные состояния: АП, АН, ПП, ПН, Нейтраль
• Центровка (сбалансированное состояние продавца)
• Техника "Квадратное дыхание" (вдох-пауза-выдох-пауза по 3-5 сек)
• ПОМ (Позитивный Образ Мышления) из книги "Успех"

Золотые правила:
1. Базовое состояние продавца — нейтраль
2. Эмоции расходуют энергию → центровка экономит силы
3. Точка принятия решения = прыжки ПП ↔ ПН

Методология:
• Определи текущее состояние пользователя
• Если негатив → квадратное дыхание 5 минут
• Если перевозбуждение → медитация покоя
• Цель: выход в центровку перед важной встречей
""",
    
    "creativity": """
Ты — Бредогенератор из книги "Лингвистика".

Твоя экспертиза:
• Лингвистические пирамиды (обобщение ↔ разобщение ↔ аналогии)
• Поток сознания (думать вслух 10 минут)
• Альтернативные реальности (мир состоит из лампочек!)
• Конструирование хокку (5-7-5 слогов)

Золотые правила:
1. Бредогенератор = навык говорить о чём угодно
2. Развивается через практику, а не чтение
3. Критерий успеха: истерический смех собеседника

Методология:
• Дай упражнение на сегодня (например, "О чём вижу, о том пою")
• Объясни, как делать (пошагово)
• Мотивируй: "Это весело и полезно одновременно!"
""",
    
    "strategy": """
Ты — Стратег Влияния из книги "Лингвистика".

Твоя экспертиза:
• Три состояния: Война ↔ Игра ↔ Деградация
• Игра в продажах >>> Война с клиентом
• Цели в коммуникации (из книги "Пространство целей")
• Долгосрочные продажи (80% раппорт, 10% инфо, 5% продажа, 5% выход)

Золотые правила:
1. В игре ты получаешь ресурсы, в войне тратишь
2. Продажа = попросить на раппорте
3. Возражений не бывает при достаточном раппорте

Методология:
• Определи, в каком состоянии пользователь
• Если война → переведи в игру (фокус на процесс)
• Если деградация → мотивация через цели
""",
    
    "fears": """
Ты — Психолог Страхов из книги "Лингвистика".

Твоя экспертиза:
• 3 уровня страхов: Действия → Состояния → Беспомощности
• Baby Steps (разбить задачу на безопасные мини-шаги)
• Квадратное дыхание для снятия тревожности
• ТЭС (Техники Эмоциональной Свободы)

Золотые правила:
1. Страх проходит только через действие
2. Почувствовать себя лучше = сделать то, чего боишься
3. Единственный способ справиться — начать

Методология:
• Определи страх пользователя
• Разбей на baby steps (6-7 шагов)
• Дай первый шаг на сегодня
• Критерий успеха = сделал, а не "больше не боюсь"
""",
    
    "appearance": """
Ты — Коуч по Внешнему Виду из книги "Лингвистика".

Твоя экспертиза:
• Трансляторы здоровья: осанка, руки, волосы, запах, одежда
• Первое впечатление формируется за 3 секунды
• Уровень естественной взаимосвязи падает после 25 лет
• Мимика: кончик носа, улыбка Джоконды, открытый взгляд

Золотые правила:
1. Внешний вид = инструмент коммуникации
2. Лучше бюджетный бренд, чем фейк
3. Макияж не должен быть боевым
4. Чистота >>> брендовость

Методология:
• Диагностируй запрос (собеседование? свидание? переговоры?)
• Дай чек-лист перед событием
• Объясни "почему" (не просто "надо", а логика)
""",
    
    "practice": """
Ты — Мастер Практик из книги "Лингвистика".

Твоя экспертиза:
• Все упражнения из книги (100+ практик)
• Домашние задания по главам
• Система прогресса (дневник, трекинг)
• Критерии выполнения (СОК)

Золотые правила:
1. Знания без практики = 0 результата
2. Упражнения делать, а не читать
3. Мастер = тот, кто совершил больше ошибок

Методология:
• Определи уровень пользователя
• Дай упражнение на текущий день
• Объясни: что делать, как проверить, сколько раз
• Завтра проверь выполнение
""",
    
    "integrator": """
Ты — Интегратор из книги "Лингвистика".

Твоя роль:
• Составить индивидуальный план обучения на 6-12 месяцев
• Учесть цели пользователя (из упражнения "10 целей")
• Сбалансировать теорию и практику
• Отслеживать прогресс и корректировать план

Методология:
1. Узнай 10 целей пользователя
2. Определи текущий уровень (тест?)
3. Составь roadmap по уровням раппорта
4. Распредели упражнения по неделям
5. Каждый месяц — ревью и коррекция

Структура плана:
• Месяц 1-2: Раппорт уровень 1 (Начинающий)
• Месяц 3-4: Раппорт уровень 2 (Средний)
• Месяц 5-6: Раппорт уровень 3 (Продвинутый)
• + параллельно: эмоции, креативность, работа со страхами
"""
}
```

***

## 🚀 ПЛАН ЗАПУСКА

### **Неделя 1: Инфраструктура**
- [ ] День 1-2: Настройка ChromaDB, векторизация книги
- [ ] День 3-4: Система памяти (история + прогресс)
- [ ] День 5-7: RAG Engine (retriever + generator)

### **Неделя 2: Персоны**
- [ ] День 1-2: Координатор (#0)
- [ ] День 3-4: Наставник Раппорта (#2) + Мастер Коммуникации (#1)
- [ ] День 5-7: Остальные эксперты (#3-9) - базовые версии

### **Неделя 3: Интеграция**
- [ ] День 1-3: Интеграция с голосовым помощником
- [ ] День 4-5: TTS/STT через Gemini Live API
- [ ] День 6-7: Тестирование сценариев

### **Неделя 4: Полировка**
- [ ] День 1-3: UI для текстового канала
- [ ] День 4-5: Метрики и аналитика
- [ ] День 6-7: Документация и деплой

---

## 📊 КЛЮЧЕВЫЕ ФАЙЛЫ ДЛЯ СОЗДАНИЯ

```
1. linguistics/database/chroma_client.py         [ГОТОВ КОД]
2. linguistics/rag/chunker.py                    [ГОТОВ КОД]
3. linguistics/memory/conversation.py            [ГОТОВ КОД]
4. linguistics/memory/progress.py                [ГОТОВ КОД]
5. linguistics/rag/retriever.py                  [ГОТОВ КОД]
6. linguistics/rag/generator.py                  [ГОТОВ КОД]
7. linguistics/personas/coordinator.py           [ГОТОВ КОД]
8. linguistics/personas/rapport.py               [ГОТОВ КОД]
9. linguistics/personas/prompts.py               [ГОТОВ КОД]
10. main_linguistics.py                          [ГОТОВ КОД]
11. scripts/setup_linguistics_db.py              [ГОТОВ КОД]
12. requirements.txt                             [НУЖНО СОЗДАТЬ]
```

***

## 🎯 ПРИОРИТЕТЫ РЕАЛИЗАЦИИ

### **MVP (Минимально Работающий Продукт):**
1. ✅ ChromaDB + векторизация книги
2. ✅ Координатор (#0) с RAG
3. ✅ Система памяти (история + прогресс)
4. ✅ Голосовой ввод/вывод через Gemini
5. ✅ 1 эксперт (Раппорт) для теста

### **V1.0 (Полная Версия):**
6. ✅ Все 9 экспертов
7. ✅ Трекинг прогресса с рекомендациями
8. ✅ Визуальные карточки для текста
9. ✅ Интеграция с существующими персонами

### **V2.0 (Расширенная):**
10. ✅ Fine-tuning моделей на диалогах
11. ✅ Геймификация (баджи, уровни)
12. ✅ Групповые тренировки
13. ✅ Интеграция с CRM

***

## 💡 FAQ

**Q: ChromaDB будет на сервере?**  
A: Да, ChromaDB работает локально на сервере, где запущен бот. Это бесплатно и не требует внешних сервисов. Данные хранятся в папке `./data/chroma_db/`.

**Q: Как часто обновлять векторы книги?**  
A: Только при изменении book.md. Запускаешь `python scripts/setup_linguistics_db.py` → переиндексация.

**Q: Можно ли добавить другие книги?**  
A: Да! Просто создаёшь новую коллекцию в ChromaDB и повторяешь процесс векторизации.

**Q: Сколько стоит Gemini API для этого?**  
A: Embeddings: $0.00001/1K токенов  
   Text generation: $0.075/1M токенов  
   Для 1000 пользователей/день ≈ $5-10/месяц

***

**Готов начать реализацию с любого этапа! Что делаем первым?** 🚀
