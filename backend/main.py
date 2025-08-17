import os
import json
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import uvicorn
from langchain_cohere import ChatCohere
from langchain_core.prompts import ChatPromptTemplate, FewShotChatMessagePromptTemplate
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()
os.environ["COHERE_API_KEY"] = os.getenv("GOOGLE_API_KEY")
chat_model = ChatCohere()

app = FastAPI()

origins = [
    "*"  
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



chat_model = ChatCohere()

example_files = ["example1.json", "example2.json", "example3.json", "example4.json"]
examples = []

for file in example_files:
    with open(file, "r", encoding="utf-8") as f:
        problem = json.load(f)
    
    title = problem.get("title", "")
    constraints = problem.get("constraints", [])
    statement = problem.get("statement", "")
    input_desc = problem.get("input_desc", "")
    output_desc = problem.get("output_desc", "")
    samples = problem.get("samples", [])

    problem_text = f"""
                    عنوان: {title}
                    محدودیت‌ها: {', '.join(constraints)}
                    توضیحات مسئله: {statement}
                    ورودی: {input_desc}
                    خروجی: {output_desc}
                    نمونه‌ها:
                    """
    for sample in samples:
        problem_text += f"- ورودی: {sample['input']} | خروجی: {sample['output']}\n"

    answer_code = ""
    answer_file = problem.get("answer_file", "")
    if answer_file:
        with open(answer_file, "r", encoding="utf-8") as f_code:
            answer_code = f_code.read().strip()
    
    examples.append({
        "question": problem_text,
        "answer": answer_code
    })

example_prompt = ChatPromptTemplate.from_messages(
    [("human", "{question}"), ("ai", "{answer}")]
)

few_shot_prompt = FewShotChatMessagePromptTemplate(
    example_prompt=example_prompt,
    examples=examples,
)

system_prompt = '''
تو در یک مسابقه برنامه نویسی پایتون شرکت کردی و باید به سوالات پاسخ دهی.

- به محدودیت زمان و حافظه دقت کن.
- کد بهینه بنویس و از کتابخانه‌های غیر استاندارد استفاده نکن.
- خروجی و ورودی باید دقیقاً مطابق با خواسته سوال باشد و هیچ چیز اضافه‌ای چاپ نشود.
- به زبان پایتون کد بزن.

**مهم:** پاسخ تو باید **فقط و فقط** شامل کد پایتون باشد. **هیچ کامنتی نزن.**
'''

final_prompt_with_few_shot = ChatPromptTemplate.from_messages(
    [("system", system_prompt), few_shot_prompt, ("human", "{question}")]
)

chain_with_few_shot = final_prompt_with_few_shot | chat_model

class Sample(BaseModel):
    input: str
    output: str

class ProblemData(BaseModel):
    url: str
    title: str
    constraints: List[str]
    statement: str
    input_desc: str
    output_desc: str
    samples: List[Sample]

@app.post("/solve")
async def solve_problem(problem: ProblemData):
    print("Received a request for solving a problem...") 
    problem_text = f"""
    عنوان: {problem.title}
    محدودیت‌ها: {', '.join(problem.constraints)}
    توضیحات مسئله: {problem.statement}
    ورودی: {problem.input_desc}
    خروجی: {problem.output_desc}
    نمونه‌ها:
    """
    for sample in problem.samples:
        problem_text += f"- ورودی: {sample.input} | خروجی: {sample.output}\n"

    chat_ai = chain_with_few_shot.invoke({"question": problem_text})
    solution_code = chat_ai.content
    
    print("Solution generated successfully. Sending back to the extension.") 
    return {"solution_code": solution_code}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)