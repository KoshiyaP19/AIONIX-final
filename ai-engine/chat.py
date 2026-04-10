from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from google.genai import types
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Google Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = None
if GEMINI_API_KEY and GEMINI_API_KEY != "put_your_gemini_api_key_here":
    client = genai.Client(api_key=GEMINI_API_KEY)
else:
    print("Warning: GEMINI_API_KEY not properly set. AI Chat won't work.")

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str                    
                            
class DigestRequest(BaseModel):
    context: Dict[str, Any] = {}
                            
class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    context: Dict[str, Any] = {}

def build_system_prompt(context: Dict[str, Any]) -> str:
    """Builds a system prompt including the dynamic platform runtime context."""
    system_instruction = (
        "You are AIONIX, an expert AI infrastructure assistant inside a real-time autonomous log intelligence platform. "
        "Your role is to help users analyze logs, debug anomalies, monitor services, and verify auto-healing actions. "
        "Here is the real-time context of the platform at this exact moment:\n\n"
    )
    
    # Format current stats
    stats = context.get('stats', {})
    system_instruction += f"--- PLATFORM STATS ---\n"
    system_instruction += f"Total Logs: {stats.get('totalLogs', 'N/A')} | Anomalies Detected: {stats.get('anomalies', 'N/A')} | Monitored Services: {stats.get('services', 'N/A')}\n"
    system_instruction += f"Overall System Health: {stats.get('systemHealth', 'N/A')}% | AI Confidence: {stats.get('aiConfidence', 'N/A')}%\n\n"
    
    # Format service states
    service_health = context.get('serviceHealth', {})
    if service_health:
        system_instruction += f"--- SERVICE STATES & HEALTH ---\n"
        for svc, data in service_health.items():
            system_instruction += f"- {svc}: {data.get('state', 'UNKNOWN')} | Health: {data.get('healthPercent', 'N/A')}% (Total Logs: {data.get('total', 0)}, Errors: {data.get('errors', 0)})\n"
        system_instruction += "\n"
        
    # Format recent logs
    recent_logs = context.get('recentLogs', [])
    if recent_logs:
        system_instruction += f"--- RECENT LOGS ---\n"
        for log in recent_logs:
            ts = log.get('timestamp', 'No timestamp')
            system_instruction += f"[{ts}] [{log.get('severity', 'INFO')}] {log.get('service', 'System')}: {log.get('message', '')}\n"
        system_instruction += "\n"

    # Format recent anomalies
    anomalies = context.get('recentAnomalies', [])
    if anomalies:
        system_instruction += f"--- RECENT ANOMALIES ---\n"
        for log in anomalies:
            ts = log.get('timestamp', 'No timestamp')
            system_instruction += f"[{ts}] [{log.get('severity', 'UNKNOWN')}] {log.get('service', 'UnknownService')}: {log.get('message', 'No message')}\n"
        system_instruction += "\n"
        
    # Format recent healing actions
    healing = context.get('recentHealing', [])
    if healing:
        system_instruction += f"--- RECENT AUTO-HEALING ACTIONS ---\n"
        for event in healing:
            ts = event.get('timestamp', 'No timestamp')
            system_instruction += f"[{ts}] {event.get('service', 'UnknownService')} -> Action: {event.get('action', 'N/A')} (Status: {event.get('status', 'N/A')})\n"
        system_instruction += "\n"
        
    system_instruction += (
        "Keep your answers and responses very short and succinct. Provide only the essential information without long paragraphs.\n"
        "Use this provided data to answer the user's questions specifically and accurately. "
        "If they ask about something not in the context, help them based on general AI dev-ops intuition, but mention you don't see it in the immediate real-time data."
    )
    
    return system_instruction

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    if not GEMINI_API_KEY or GEMINI_API_KEY == "put_your_gemini_api_key_here":
         return {"reply": "Error: GEMINI_API_KEY is not configured in the ai-engine/.env file. Please add your Google AI Studio API key and restart the engine."}
         
    try:
        if not client:
            return {"reply": "Error: Gemini Client is not initialized."}
            
        system_prompt = build_system_prompt(request.context)
        config = types.GenerateContentConfig(system_instruction=system_prompt)
        
        formatted_history = []
        for msg in request.history:
            role = "model" if msg.role == "assistant" else "user"
            formatted_history.append(
                types.Content(role=role, parts=[types.Part.from_text(text=msg.content)])
            )
            
        # Provide previous history plus the new message
        contents = formatted_history + [
            types.Content(role="user", parts=[types.Part.from_text(text=request.message)])
        ]
        
        models_to_try = [
            "gemini-3.1-pro-preview",
            "gemini-3.1-flash-lite-preview",
            "gemini-3-flash-preview",
            "gemini-2.5-pro",
            "gemini-2.5-flash"
        ]
        
        last_error = None
        for model_name in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config
                )
                if response.text:
                    return {"reply": response.text}
            except Exception as e:
                last_error = str(e)
                continue
        
        return {"reply": f"Sorry, all AI models are currently unavailable or failing. Last error: {last_error}"}
        
    except Exception as e:
        print(f"Chat API Error: {e}")
        return {"reply": f"Sorry, an internal AI Engine error occurred: {str(e)}"}

@router.post("/generate-digest")
async def generate_digest(request: DigestRequest):
    if not GEMINI_API_KEY or GEMINI_API_KEY == "put_your_gemini_api_key_here":
         return {"html_digest": "<p>Error: GEMINI_API_KEY is not configured.</p>"}
         
    try:
        system_prompt = build_system_prompt(request.context)
        
        prompt = (
            "Based on the system context provided in your instructions, generate a comprehensive 6-hour digest report. "
            "Address the email to the system administrator. "
            "Summarize the overall health, list each service's health and error count, and provide at least one concrete architectural "
            "or operational suggestion based on the anomalies and error rates seen. "
            "Format your ENTIRE response as raw HTML without markdown code blocks. Use inline styles, simple tables, and clean div wrappers "
            "suitable for dropping directly into an email body."
        )
        
        contents = [types.Content(role="user", parts=[types.Part.from_text(text=prompt)])]
        config = types.GenerateContentConfig(system_instruction=system_prompt)
        
        # We know these models work from previous testing
        models_to_try = [
            "gemini-3.1-pro-preview",
            "gemini-3-flash-preview",
            "gemini-2.5-pro",
            "gemini-2.5-flash"
        ]
        
        for model_name in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config
                )
                if response.text:
                    html_clean = response.text.replace("```html", "").replace("```", "").strip()
                    return {"html_digest": html_clean}
            except Exception:
                continue
                
        return {"html_digest": "<h2>Digest Generation Failed</h2><p>All AI models unavailable.</p>"}
    except Exception as e:
        return {"html_digest": f"<h2>Internal Error</h2><p>{str(e)}</p>"}
