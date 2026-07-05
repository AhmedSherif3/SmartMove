from __future__ import annotations

import logging
from typing import Any

from asgiref.sync import sync_to_async
from langgraph.prebuilt import create_react_agent  # pyright: ignore[reportMissingImports]

from django.conf import settings

from apps.chatbot.prompts import build_chat_prompt
from apps.chatbot.tools.sql_tool import sql_query_tool
from apps.chatbot.services.llm_factory import get_llm

# Cross-app import: AI access gatekeeping via active subscription verification
from apps.subscriptions.models import Subscription

logger = logging.getLogger(__name__)

# Register the tools the AI is allowed to use
TOOLS = [sql_query_tool]

# Plan types that grant access to the premium (advanced) model
_PREMIUM_PLAN_TYPES: list[str] = ['data_analyst_tier', 'premium_bundle']


async def _has_premium_subscription(user_id: int) -> bool:
    """
    Verify the user holds an active premium subscription in Stripe.

    This is a belt-and-suspenders check: the user's `role` field may say
    DATA_ANALYST, but we also verify a live, non-canceled subscription
    exists in the database. This prevents stale roles from granting
    premium AI access after a subscription lapses.
    """
    return await sync_to_async(
        Subscription.objects.filter(
            user_id=user_id,
            plan_type__in=_PREMIUM_PLAN_TYPES,
            status__in=['active', 'trialing'],
        ).exists
    )()


async def run_agent(
    user_message: str,
    user_role: str,
    currency: str,
    session_id: str,
    user_id: int | None = None,
) -> dict[str, Any]:
    """
    Orchestrates the LangGraph agent with subscription-based model routing.

    Model Routing Logic:
        • DATA_ANALYST / ADMIN with active premium subscription → Advanced model (GPT-4o)
        • Everyone else → Basic model (Gemini Flash Lite)
    """
    advanced_model: str = str(getattr(settings, 'ADVANCED_LLM_MODEL', 'gemini-2.5-pro'))
    basic_model: str = str(getattr(settings, 'BASIC_LLM_MODEL', 'gemini-2.5-flash'))

    # ── AI Access Gate ────────────────────────────────────────────────────
    # Check role AND active subscription before granting premium model access
    use_advanced: bool = False
    if user_role in ['DATA_ANALYST', 'ADMIN'] and user_id is not None:
        use_advanced = await _has_premium_subscription(user_id)

    if use_advanced:
        model_used: str = advanced_model
        llm = get_llm(model_name=advanced_model)
    else:
        model_used = basic_model
        llm = get_llm(model_name=basic_model)

    # 1. Safely run the synchronous DB call in a thread to prevent Django async crashes
    prompt_template = await sync_to_async(build_chat_prompt)(
        user_role=user_role, user_currency=currency
    )

    # 2. Safely format the template to satisfy Pyright, then extract the string content
    # We pass empty dummy variables in case the legacy template expects them
    formatted_messages = prompt_template.format_messages(input="", agent_scratchpad=[])
    system_msg_str: str = str(formatted_messages[0].content)

    # 3. Create the modern LangGraph-backed agent
    agent = create_react_agent(  # pyright: ignore[reportDeprecated]
        llm,
        TOOLS,
        prompt=system_msg_str,
    )

    try:
        # 4. Execute the agent graph
        response = await agent.ainvoke({
            "messages": [
                ("user", user_message)
            ]
        })

        # 5. Extract final text from the last message safely
        raw_content = response["messages"][-1].content
        if isinstance(raw_content, list):
            # Extract text from the list of blocks
            final_message: str = " ".join([
                block.get("text", "")
                for block in raw_content
                if isinstance(block, dict) and "text" in block
            ])
        else:
            final_message = str(raw_content)

        # Extract and strip JSON charts/chips from the output
        import re
        import json
        charts = []
        follow_up_chips = []
        
        json_matches = list(re.finditer(r'```(?:json)?\s*(\{.*?\})\s*```', final_message, re.DOTALL))
        for match in json_matches:
            try:
                parsed = json.loads(match.group(1))
                if "charts" in parsed or "follow_up_chips" in parsed:
                    if "charts" in parsed:
                        charts.extend(parsed["charts"])
                    if "follow_up_chips" in parsed:
                        follow_up_chips.extend(parsed["follow_up_chips"])
                    # Remove the parsed JSON block from the user-facing text
                    final_message = final_message.replace(match.group(0), "").strip()
            except json.JSONDecodeError:
                pass

        # 6. Extract tools used for the audit log
        tools_used: list[str] = []
        for msg in response.get("messages", []):
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tc in msg.tool_calls:
                    tools_used.append(str(tc["name"]))

        # 7. Extract the ACTUAL model used from response metadata (in case fallback triggered)
        actual_model = model_used
        last_msg = response["messages"][-1]
        if hasattr(last_msg, "response_metadata"):
            meta = last_msg.response_metadata
            if isinstance(meta, dict) and "model_name" in meta:
                actual_model = meta["model_name"]
            elif isinstance(meta, dict) and "model" in meta:
                actual_model = meta["model"]

        return {
            "text": final_message,
            "charts": charts,
            "follow_up_chips": follow_up_chips,
            "model_used": actual_model,
            "tokens": {},
            "tools_invoked": list(set(tools_used)),  # Deduplicate tools
        }

    except Exception:
        logger.exception("Agent execution loop failed")
        raise