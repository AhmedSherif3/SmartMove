# AI Models Usage and Environment Variables Status

Here is the detailed list of AI models used across the `SmartMove` project, the specific model identifiers, their purpose, the environment variable they require, and the absolute file path for every `.env` file that contains the API keys.

### 1. Anthropic Claude
- **Detailed Model(s)**: `claude-3-5-sonnet-20241022`
- **Usage Area**: Pipeline / Airflow (Monthly Report DAGs and LLM Client for Executive Summaries).
- **Environment Variable**: `ANTHROPIC_API_KEY`
- **.env File Paths**:
  - `d:\SmartMove\pipeline\Airflow\.env` (Present, contains actual key)
  - `d:\SmartMove\pipeline\.env` (Present, contains placeholder `sk-ant-api03-xxxxxx`)

### 2. Google Gemini
- **Detailed Model(s)**: `gemini-2.5-pro`, `gemini-3.5-flash`, `gemini-3.1-flash`, `Gemini 2.0 Flash`
- **Usage Area**: Backend LLM Factory (`ai_manager.py`) and Frontend Chatbot UI options.
- **Environment Variable**: `GOOGLE_API_KEY`
- **.env File Paths**:
  - `d:\SmartMove\backend\.env` (Present, contains actual key)

### 3. Azure OpenAI (Embeddings & Agentic AI)
- **Detailed Model(s)**: `text-embedding-3-small` (and Supervisor/Data Engineer models via Azure)
- **Usage Area**: Backend Agentic AI (Semantic Cache, RAG tools, Chatbot tasks).
- **Environment Variable**: `AZURE_OPENAI_API_KEY`
- **.env File Paths**:
  - `d:\SmartMove\backend\.env` (Present, contains placeholder `"your_azure_api_key"`)

### 4. OpenAI (Standard / Audio)
- **Detailed Model(s)**: `gpt-4o`, `whisper-1`
- **Usage Area**: Backend (Audio transcription services, Monitoring metrics), Frontend (GPT-4o Chatbot UI option).
- **Environment Variable**: `AZURE_OPENAI_API_KEY`
- **.env File Paths**:
  - `d:\SmartMove\backend\.env` (Present, contains placeholder `"your_azure_api_key"`)
