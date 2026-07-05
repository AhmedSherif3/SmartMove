# Redis vector caching
from openai import AzureOpenAI
from django.conf import settings
from apps.agentic_ai.utils.constants import AI_MODEL_ROUTING
from apps.agentic_ai.exceptions import AgenticBaseException

class EmbedderTool:
    """
    Translates human text into 1536-dimensional vectors for semantic database searches.
    Powered by Azure OpenAI text-embedding-3-small.
    """

    def __init__(self):
        self.client = AzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION
        )
        self.config = AI_MODEL_ROUTING["EMBEDDER"]

    def generate_embedding(self, text: str) -> list[float]:
        """
        Takes a string of text and returns a list of floats (the vector).
        """
        # Clean the text to prevent token limit errors on massive strings
        clean_text = text.replace("\n", " ").strip()

        try:
            response = self.client.embeddings.create(
                input=[clean_text],
                model=self.config["model_name"]
            )
            
            # Extract the raw vector array from the response
            vector = response.data[0].embedding
            return vector

        except Exception as e:
            raise AgenticBaseException(f"Failed to generate vector embedding: {str(e)}")

    def search_vector_database(self, query: str) -> str:
        """
        Placeholder for your actual vector database query logic (Pinecone, pgvector, etc.)
        """
        # 1. Convert the query to a vector
        # query_vector = self.generate_embedding(query)
        
        # 2. Search your database (To be implemented based on your DB choice)
        # results = my_vector_db.similarity_search(query_vector, top_k=3)
        
        # 3. Return the string of text chunks
        return "Simulated retrieved document text about Real Estate laws..."