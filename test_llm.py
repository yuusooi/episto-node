import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

# Fix: conda env sets SSL_CERT_FILE to a non-existent path
os.environ.pop("SSL_CERT_FILE", None)

load_dotenv()

llm = ChatOpenAI(
    model="deepseek-chat",
    openai_api_key=os.getenv("DEEPSEEK_API_KEY"),
    openai_api_base=os.getenv("DEEPSEEK_BASE_URL"),
)

print("testing deepseek-chat...")

try:
    response = llm.invoke("1+1=?")
    print(f"success: {response.content}")
except Exception as e:
    print(f"error: {e}")
