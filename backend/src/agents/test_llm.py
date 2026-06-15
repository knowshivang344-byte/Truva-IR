from src.agents.gemini_client import create_gemini_llm

if __name__ == "__main__":
    llm = create_gemini_llm(model="gemini-flash-latest")
    print("LLM class:", llm.__class__.__name__)
    try:
        response = llm.invoke("Hello, reply ONE WORD")
        print("Response:", response)
    except Exception as e:
        print("Error invoking LLM:", e)
