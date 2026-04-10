from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any
import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load env
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("❌ GEMINI_API_KEY not set")

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

router = APIRouter()


# ------------------ MODELS ------------------

class ChatMessage(BaseModel):
    role: str
    content: str


class DigestRequest(BaseModel):
    context: Dict[str, Any] = {}


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    context: Dict[str, Any] = {}


# ------------------ PROMPT BUILDER ------------------

def build_system_prompt(context: Dict[str, Any]) -> str:
    system_instruction = (
        "You are AIONIX, an expert AI infrastructure assistant inside a real-time autonomous log intelligence platform. "
        "Your role is to help users analyze logs, debug anomalies, monitor services, and verify auto-healing actions.\n\n"
    )

    stats = context.get('stats', {})
    system_instruction += (
        f"--- PLATFORM STATS ---\n"
        f"Total Logs: {stats.get('totalLogs', 'N/A')} | "
        f"Anomalies: {stats.get('anomalies', 'N/A')} | "
        f"Services: {stats.get('services', 'N/A')}\n"
        f"Health: {stats.get('systemHealth', 'N/A')}% | "
        f"AI Confidence: {stats.get('aiConfidence', 'N/A')}%\n\n"
    )

    service_health = context.get('serviceHealth', {})
    if service_health:
        system_instruction += "--- SERVICES ---\n"
        for svc, data in service_health.items():
            system_instruction += (
                f"{svc}: {data.get('state')} | "
                f"Health: {data.get('healthPercent')}% | "
                f"Errors: {data.get('errors', 0)}\n"
            )
        system_instruction += "\n"

    system_instruction += "Keep responses short and precise.\n"

    return system_instruction


# ------------------ CHAT ENDPOINT ------------------

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    if not GEMINI_API_KEY:
        return {"reply": "Error: GEMINI_API_KEY not configured"}

    try:
        system_prompt = build_system_prompt(request.context)
        full_prompt = system_prompt + "\nUser: " + request.message

        response = model.generate_content(full_prompt)

        return {"reply": response.text}

    except Exception as e:
        return {"reply": f"Error: {str(e)}"}


# ------------------ DIGEST ENDPOINT ------------------

@router.post("/generate-digest")
async def generate_digest(request: DigestRequest):
    if not GEMINI_API_KEY:
        return {"html_digest": "<p>Error: GEMINI_API_KEY not configured</p>"}

    try:
        system_prompt = build_system_prompt(request.context)

        prompt = (
            system_prompt +
            "\nGenerate a 6-hour system digest report in HTML. "
            "Include system health, services, errors, and suggestions. "
            "Return ONLY HTML (no markdown)."
        )

        response = model.generate_content(prompt)

        html_clean = response.text.replace("```html", "").replace("```", "").strip()

        return {"html_digest": html_clean}

    except Exception as e:
        return {"html_digest": f"<p>Error: {str(e)}</p>"}