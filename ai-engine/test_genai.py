
import google.generativeai as genai
from google.genai import types

def test():
    try:
        content = types.Content(role="user", parts=[types.Part.from_text(text="Hi")])
        print("Success!")
    except Exception as e:
        print(f"Error: {e}")

test()
