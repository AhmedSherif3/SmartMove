import asyncio
from django.core.management.base import BaseCommand # type: ignore[import-untyped]
from apps.chatbot.services.react_agent import run_agent

class Command(BaseCommand):
    help = "Tests the Gemini ReAct agent's Golden Path."

    def handle(self, *args, **options):
        self.stdout.write("Initializing Gemini Agent Test...")
        
        async def run_test():
            result = await run_agent(
                user_message="What is the highest projected ROI area in Dubai?",
                user_role="DATA_ANALYST",
                currency="USD",
                session_id="test_12345"
            )
            return result

        try:
            result = asyncio.run(run_test())
            self.stdout.write(self.style.SUCCESS("\n=== AGENT RESPONSE ==="))
            self.stdout.write(result["text"])
            self.stdout.write(self.style.SUCCESS(f"\nTools Used: {result['tools_invoked']}"))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Test failed: {e}"))
